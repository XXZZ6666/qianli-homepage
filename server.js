
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const session = require('express-session');

const app = express();

// ⭐ CORS：允许任何来源，允许凭据
app.use(cors({ origin: true, credentials: true }));

// ⭐ Session：自定义名称 + rolling 刷新 + 不依赖 SameSite （本地测试更可靠）
app.use(session({
    name: 'study_sso_sid',
    secret: 'study-ui-secret-key-fixed-v1',
    resave: true,
    rolling: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 30,
        path: '/'
    }
}));

// ⭐ 关键中间件：如果前端在 header 里带了 x-session-id，
//    就从 express-session 的 MemoryStore 里找到对应的 session 复用它
//    （绕开浏览器 cookie 限制的"备用通道"）
app.use((req, res, next) => {
    const headerSid = req.headers['x-session-id'];
    if (headerSid && typeof headerSid === 'string' && !req.session.username) {
        // 从 session store 里按 sid 找 session
        if (req.sessionStore && typeof req.sessionStore.get === 'function') {
            req.sessionStore.get(headerSid, (err, sess) => {
                if (!err && sess && sess.username) {
                    // 找到有效 session → 用它
                    req.session.username = sess.username;
                    req.session.loginIp = sess.loginIp;
                    req.session.loginTime = sess.loginTime;
                    // 强制用这个 sid
                    Object.defineProperty(req, 'sessionID', { value: headerSid, writable: true });
                }
                next();
            });
            return;
        }
    }
    next();
});

// 内存 Map：username -> 当前有效 sessionId（用于单点登录判断）
const activeSessions = new Map();

app.use(express.json());
app.use(express.static(__dirname));

// 让上级目录（便利贴/）里的文件也能被访问
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

const dbConfig = {
    user: 'US_WMS_TSNT',
    password: 'US_WMS_TSNT',
    connectString: 'localhost:1521/WMSDEV_TSNT'
};

async function getConnection() { return await oracledb.getConnection(dbConfig); }

function genSalt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
}

function encodePwd(raw, salt) {
    const input = raw + salt;
    let out = '';
    for (let i = 0; i < input.length; i++) {
        const ch = input.charAt(i);
        const code = input.charCodeAt(i);
        if (ch >= '0' && ch <= '9') out += ch === '9' ? '0' : String(Number(ch) + 1);
        else if (ch >= 'a' && ch <= 'z') out += String.fromCharCode((code - 97 + 2) % 26 + 97);
        else if (ch >= 'A' && ch <= 'Z') out += String.fromCharCode((code - 65 + 2) % 26 + 65);
        else out += ch;
    }
    return out;
}

function getClientIp(req) {
    const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    const remote = req.socket.remoteAddress || '';
    let clientIp = forwarded || remote;
    if (clientIp) {
        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') clientIp = '127.0.0.1';
        else if (clientIp.startsWith('::ffff:')) clientIp = clientIp.slice(7);
        else if (clientIp.includes(':') && !clientIp.includes('.')) clientIp = 'IPv6-' + clientIp.replace(/:/g, '-');
    } else clientIp = 'unknown';
    return clientIp;
}

// 校验会话
function isSessionValid(req) {
    const sid = req.headers['x-session-id'] || req.sessionID;
    if (!req.session || !req.session.username || !sid) return false;
    const currentSid = activeSessions.get(req.session.username);
    return currentSid === sid;
}

// ===== 注册 =====
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ ok: false, msg: '字段不能为空' });
    if (!email.includes('@')) return res.status(400).json({ ok: false, msg: '邮箱格式不对' });
    if (password.length < 8) return res.status(400).json({ ok: false, msg: '密码至少 8 位' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ ok: false, msg: '密码必须包含数字' });
    if (!/[a-zA-Z]/.test(password)) return res.status(400).json({ ok: false, msg: '密码必须包含字母' });
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?]/.test(password)) return res.status(400).json({ ok: false, msg: '密码必须包含特殊字符' });

    let conn;
    try {
        conn = await getConnection();
        const check = await conn.execute(
            `SELECT username FROM SYS_USER WHERE username = :p_un OR email = :p_em`,
            { p_un: username, p_em: email }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (check.rows.length > 0) return res.status(400).json({ ok: false, msg: '用户名或邮箱已存在' });

        const idRes = await conn.execute(`SELECT NVL(MAX(user_id), 0) + 1 AS next_id FROM SYS_USER`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const userId = idRes.rows[0].NEXT_ID;
        const salt = genSalt();
        const encoded = encodePwd(password, salt);

        await conn.execute(
            `INSERT INTO SYS_USER (user_id, username, user_name, raw_pwd, email, status, create_date)
             VALUES (:p_uid, :p_un, :p_name, :p_pwd, :p_em, 1, SYSDATE)`,
            { p_uid: userId, p_un: username, p_name: username, p_pwd: encoded, p_em: email },
            { autoCommit: false }
        );

        const pwdIdRes = await conn.execute(`SELECT NVL(MAX(pwd_id), 0) + 1 AS next_id FROM SYS_USER_PWD`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const pwdId = pwdIdRes.rows[0].NEXT_ID;
        await conn.execute(
            `INSERT INTO SYS_USER_PWD (pwd_id, user_id, salt, update_dt) VALUES (:p_pid, :p_uid, :p_salt, SYSDATE)`,
            { p_pid: pwdId, p_uid: userId, p_salt: salt }, { autoCommit: true }
        );

        res.json({ ok: true, msg: '注册成功' });
    } catch (err) {
        console.error('[REGISTER ERROR]', err.message);
        if (conn) { try { await conn.rollback(); } catch (e) {} }
        res.status(500).json({ ok: false, msg: '服务器错误', err: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

// ========== 登录接口 ==========
app.post('/api/login', async (req, res) => {
    const { username, password, force } = req.body;
    const currentSid = req.sessionID;
    console.log('[LOGIN-REQ]', username, '| force=', force, '| sid=', currentSid);

    if (!username || !password) return res.status(400).json({ ok: false, msg: '请输入用户名和密码' });
    const clientIp = getClientIp(req);

    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT u.user_id, u.username, u.raw_pwd, u.status, p.salt
             FROM SYS_USER u
             LEFT JOIN SYS_USER_PWD p ON p.user_id = u.user_id
             WHERE u.username = :p_un`,
            { p_un: username }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows.length === 0) return res.status(401).json({ ok: false, msg: '账号不存在' });
        const user = result.rows[0];
        const status = Number(user.STATUS);
        if (status !== 1) return res.status(401).json({ ok: false, msg: '账号已被禁用' });

        const dbPwd = String(user.RAW_PWD ?? '').trim();
        const salt = String(user.SALT ?? '').trim();
        if (!dbPwd || !salt) return res.status(401).json({ ok: false, msg: '账号信息不完整，请重新注册' });

        const encoded = encodePwd(password, salt);
        if (encoded !== dbPwd) return res.status(401).json({ ok: false, msg: '密码错误' });

        const existingSid = activeSessions.get(username);
        const isElsewhere = !!existingSid && existingSid !== currentSid;
        console.log('[LOGIN-CHECK] existingSid=', existingSid, '| isElsewhere=', isElsewhere);

        if (!force && isElsewhere) {
            req.session.pendingLogin = username;
            req.session.save(() => {
                res.json({ ok: false, needConfirm: true, msg: '该账号已在别处登录，是否继续？继续后原登录会自动失效。' });
            });
            return;
        }

        await conn.execute(
            `UPDATE SYS_USER SET last_login = SYSDATE, last_ip = :p_ip WHERE user_id = :p_uid`,
            { p_ip: clientIp, p_uid: user.USER_ID }, { autoCommit: true }
        );

        activeSessions.set(username, currentSid);
        req.session.username = username;
        req.session.loginIp = clientIp;
        req.session.loginTime = new Date().toLocaleString();

        console.log('[LOGIN-OK]', username, '| sid=', currentSid, '| kickedOld=', isElsewhere);
        console.log('[MAP]', JSON.stringify(Object.fromEntries(activeSessions.entries())));

        req.session.save(() => {
            res.json({
                ok: true,
                username: user.USERNAME,
                last_ip: clientIp,
                kickedOld: isElsewhere,
                sessionId: currentSid
            });
        });
    } catch (err) {
        console.error('[LOGIN ERROR]', err.message);
        res.status(500).json({ ok: false, msg: '服务器错误', err: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

// 会话校验
app.get('/api/check-session', (req, res) => {
    const sid = req.headers['x-session-id'] || req.sessionID;
    const mapSid = req.session && req.session.username ? activeSessions.get(req.session.username) : undefined;
    console.log('[CHECK] sid=', sid, '| user=', req.session && req.session.username, '| valid=', isSessionValid(req), '| mapSid=', mapSid);

    if (!isSessionValid(req)) {
        const wasLoggedIn = req.session && req.session.username;
        if (req.session) req.session.destroy(() => {});
        return res.status(401).json({
            ok: false,
            msg: wasLoggedIn ? '您已在别处登录，当前会话已失效' : '会话已超时，请重新登录'
        });
    }
    res.json({
        ok: true,
        username: req.session.username,
        loginIp: req.session.loginIp,
        loginTime: req.session.loginTime
    });
});

// 主动登出
app.post('/api/logout', (req, res) => {
    const sid = req.headers['x-session-id'] || req.sessionID;
    const username = req.session && req.session.username;
    if (username && activeSessions.get(username) === sid) {
        activeSessions.delete(username);
    }
    req.session.destroy(() => res.json({ ok: true, msg: '已退出登录' }));
});

// 修改密码
app.post('/api/change-password', async (req, res) => {
    const { username, old_password, new_password } = req.body;
    if (!username || !old_password || !new_password) return res.status(400).json({ ok: false, msg: '字段不能为空' });
    if (new_password.length < 8) return res.status(400).json({ ok: false, msg: '新密码至少 8 位' });
    if (!/[0-9]/.test(new_password)) return res.status(400).json({ ok: false, msg: '新密码必须包含数字' });
    if (!/[a-zA-Z]/.test(new_password)) return res.status(400).json({ ok: false, msg: '新密码必须包含字母' });
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?]/.test(new_password)) return res.status(400).json({ ok: false, msg: '新密码必须包含特殊字符' });

    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT u.user_id, u.username, u.raw_pwd, u.status, p.salt
             FROM SYS_USER u
             LEFT JOIN SYS_USER_PWD p ON p.user_id = u.user_id
             WHERE u.username = :p_un`,
            { p_un: username }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) return res.status(401).json({ ok: false, msg: '账号不存在' });
        const user = result.rows[0];
        if (Number(user.STATUS) !== 1) return res.status(401).json({ ok: false, msg: '账号已被禁用' });

        const dbPwd = String(user.RAW_PWD ?? '').trim();
        const oldSalt = String(user.SALT ?? '').trim();
        if (!dbPwd || !oldSalt) return res.status(401).json({ ok: false, msg: '账号信息不完整' });

        const encodedOld = encodePwd(old_password, oldSalt);
        if (encodedOld !== dbPwd) return res.status(401).json({ ok: false, msg: '原密码错误' });
        if (old_password === new_password) return res.status(400).json({ ok: false, msg: '新密码不能与原密码相同' });

        const newSalt = genSalt();
        const encodedNew = encodePwd(new_password, newSalt);
        const userId = user.USER_ID;

        await conn.execute(`UPDATE SYS_USER SET raw_pwd = :p_pwd WHERE user_id = :p_uid`,
            { p_pwd: encodedNew, p_uid: userId }, { autoCommit: false });

        const pwdCheck = await conn.execute(`SELECT pwd_id FROM SYS_USER_PWD WHERE user_id = :p_uid`,
            { p_uid: userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (pwdCheck.rows.length > 0) {
            await conn.execute(`UPDATE SYS_USER_PWD SET salt = :p_salt, update_dt = SYSDATE WHERE user_id = :p_uid`,
                { p_salt: newSalt, p_uid: userId }, { autoCommit: true });
        } else {
            const pwdIdRes = await conn.execute(`SELECT NVL(MAX(pwd_id), 0) + 1 AS next_id FROM SYS_USER_PWD`,
                [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const pwdId = pwdIdRes.rows[0].NEXT_ID;
            await conn.execute(
                `INSERT INTO SYS_USER_PWD (pwd_id, user_id, salt, update_dt) VALUES (:p_pid, :p_uid, :p_salt, SYSDATE)`,
                { p_pid: pwdId, p_uid: userId, p_salt: newSalt }, { autoCommit: true }
            );
        }

        activeSessions.delete(username);
        if (req.session) req.session.destroy(() => {});
        res.json({ ok: true, msg: '密码修改成功，请使用新密码重新登录' });
    } catch (err) {
        console.error('[CHANGE-PWD ERROR]', err.message);
        if (conn) { try { await conn.rollback(); } catch (e) {} }
        res.status(500).json({ ok: false, msg: '服务器错误', err: err.message });
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
});

// ========== 天气接口（替代 tq.py）==========
const WEATHER_API = 'https://cn.apihz.cn/api/tianqi/tqybip.php';
const WEATHER_PARAMS = 'id=10018490&key=cdc294ee577ac2bd96bfa8651dab80b3';

app.get('/weather', (req, res) => {
    const https = require('https');
    const url = WEATHER_API + '?' + WEATHER_PARAMS;
    https.get(url, (apiRes) => {
        let raw = '';
        apiRes.on('data', (chunk) => raw += chunk);
        apiRes.on('end', () => {
            try {
                const data = JSON.parse(raw);
                if (data.code === 200) {
                    const now = data.nowinfo || {};
                    res.json({
                        code: 200,
                        data: {
                            place: `${data.guo || ''} ${data.sheng || ''} ${data.shi || ''}`.trim(),
                            temperature: now.temperature,
                            weather1: data.weather1,
                            weather2: data.weather2,
                            uptime: now.uptime
                        }
                    });
                } else {
                    res.json({ code: 500, msg: data.msg || '获取天气失败' });
                }
            } catch (e) {
                res.json({ code: 500, msg: '天气数据解析失败: ' + e.message });
            }
        });
    }).on('error', (e) => {
        res.json({ code: 500, msg: '天气接口请求失败: ' + e.message });
    });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', function() {
    console.log('服务已启动 http://0.0.0.0:' + PORT + ' （局域网其他电脑请用本机IP访问）');
    console.log('🌤️ 天气接口: http://0.0.0.0:' + PORT + '/weather');
});