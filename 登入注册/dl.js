// ⭐ 关键：自动匹配当前页面协议（HTTP/HTTPS），避免 Mixed Content 被拦截
// 如果需要在 GitHub Pages 等静态托管上使用，把后端部署到公网后把地址填到下面
var DEPLOYED_API ='';  // 例：'https://xxxx.cpolar.io' 或 'https://你的服务器域名'

function apiBase() {
    // 配置了固定 API 地址就用它
    if (DEPLOYED_API) {
        return DEPLOYED_API.replace(/\/$/, '');
    }
    // 没配置就用当前页面主机（同一局域网 / 本地测试）
    var protocol = window.location.protocol;
    if (protocol === 'file:') return 'http://localhost:3000';
    var httpProto = protocol.replace(':', '');
    var host = window.location.hostname || 'localhost';
    var port = window.location.port || '3000';
    // 如果当前页面是通过其他静态服务器打开的（如 Live Server 5503），API 一律用 3000 端口
    if (port !== '3000') port = '3000';
    return httpProto + '://' + host + ':' + port;
}

async function api(url, options) {
    if (!options) options = {};
    var headers = { 'Content-Type': 'application/json' };
    if (options.headers) {
        for (var k in options.headers) headers[k] = options.headers[k];
    }
    var storedSid = sessionStorage.getItem('__SESSION_ID__');
    if (storedSid) {
        headers['x-session-id'] = storedSid;
    }
    var fullUrl = apiBase() + url;
    console.log('[API] requesting:', fullUrl);
    try {
        var res = await fetch(fullUrl, {
            method: options.method || 'GET',
            body: options.body,
            credentials: 'include',
            headers: headers
        });
        var data = await res.json();
        if (data && data.sessionId) {
            sessionStorage.setItem('__SESSION_ID__', data.sessionId);
            console.log('[API] saved sessionId:', data.sessionId);
        }
        return data;
    } catch (err) {
        console.error('[API ERROR]', err);
        // 请求失败时给用户明确提示，而不是静默崩溃
        var pageProtocol = window.location.protocol;
        var apiProtocol = fullUrl.substring(0, fullUrl.indexOf(':'));
        if (pageProtocol === 'https:' && apiProtocol === 'http') {
            alert('请求被浏览器拦截：HTTPS 页面不能请求 HTTP 地址。\n请把后端部署到 HTTPS 服务器，或改用局域网 IP 访问。');
        } else if (err && err.message && err.message.indexOf('Failed to fetch') >= 0) {
            alert('无法连接服务器。\n请确认后端服务已启动，并且地址可以访问。\nAPI 地址：' + fullUrl);
        } else {
            alert('请求失败：' + (err && err.message ? err.message : err));
        }
        return { ok: false, msg: '网络请求失败' };
    }
}

var registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var form = e.target;
        var username = form.username.value.trim();
        var email = form.email.value.trim();
        var password = form.password.value;
        var passwordConfirm = form.confirm_password.value;
        if (!username) { alert('请输入用户名'); return; }
        if (!email || !email.includes('@')) { alert('请输入有效邮箱'); return; }
        if (password.length < 8) { alert('密码至少 8 位'); return; }
        if (!/[0-9]/.test(password)) { alert('密码必须包含数字'); return; }
        if (!/[a-zA-Z]/.test(password)) { alert('密码必须包含字母'); return; }
        if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?]/.test(password)) { alert('密码必须包含特殊字符'); return; }
        if (password !== passwordConfirm) { alert('两次密码不一致'); return; }
        var data = await api('/api/register', {
            method: 'POST', body: JSON.stringify({ username: username, email: email, password: password })
        });
        if (!data.ok) { alert(data.msg); return; }
        alert('注册成功！现在可以登录了。');
        window.location.href = '../dl.html';
    });
}

// 手机兼容：确保 DOM 完全加载后再绑定事件
function bindLoginForm() {
    var loginForm = document.getElementById('loginForm');
    if (!loginForm || loginForm.__bound) return;
    loginForm.__bound = true;

    async function doLogin(username, password, force) {
        var data = await api('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: username, password: password, force: !!force })
        });
        if (!data.ok) {
            if (data.needConfirm) {
                if (confirm(data.msg || '该账号已在别处登录，是否继续？继续后原登录会自动失效。')) {
                    await doLogin(username, password, true);
                }
            } else if (data.msg) {
                alert(data.msg);
            }
            return;
        }
        var ipText = data.last_ip ? '，登录IP：' + data.last_ip : '';
        var extra = data.kickedOld ? '\n（原登录已自动失效）' : '';
        alert('登录成功，欢迎 ' + data.username + ipText + '！' + extra);
        var target = '简介/index.html?sid=' + encodeURIComponent(data.sessionId);
        console.log('[LOGIN] redirecting to:', target);
        window.location.href = target;
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var form = e.target;
        var username = form.username.value.trim();
        var password = form.password.value;
        if (!username || !password) { alert('请输入用户名和密码'); return; }
        doLogin(username, password, false);
    });
}

// 立即执行 + DOMContentLoaded 兜底，兼容手机浏览器加载顺序
bindLoginForm();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLoginForm);
} else {
    setTimeout(bindLoginForm, 0);
}

var changePwdForm = document.getElementById('changePwdForm');
if (changePwdForm) {
    changePwdForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var form = e.target;
        var username = form.username.value.trim();
        var oldPassword = form.old_password.value;
        var newPassword = form.new_password.value;
        var confirmPassword = form.confirm_password.value;
        if (!username) { alert('请输入用户名'); return; }
        if (!oldPassword) { alert('请输入原密码'); return; }
        if (newPassword.length < 8) { alert('新密码至少 8 位'); return; }
        if (!/[0-9]/.test(newPassword)) { alert('新密码必须包含数字'); return; }
        if (!/[a-zA-Z]/.test(newPassword)) { alert('新密码必须包含字母'); return; }
        if (!/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>\/?]/.test(newPassword)) { alert('新密码必须包含特殊字符'); return; }
        if (newPassword !== confirmPassword) { alert('两次新密码不一致'); return; }
        if (newPassword === oldPassword) { alert('新密码不能与原密码相同'); return; }
        var data = await api('/api/change-password', {
            method: 'POST',
            body: JSON.stringify({ username: username, old_password: oldPassword, new_password: newPassword })
        });
        if (!data.ok) { alert(data.msg); return; }
        alert(data.msg || '密码修改成功，请使用新密码登入。');
        sessionStorage.removeItem('__SESSION_ID__');
        window.location.href = '../dl.html';
    });
}

document.querySelectorAll('.eye-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var targetName = btn.getAttribute('data-target');
        var input = btn.parentElement.querySelector('input[name="' + targetName + '"]');
        if (!input) return;
        if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
        else { input.type = 'password'; btn.textContent = '👁'; }
    });
});