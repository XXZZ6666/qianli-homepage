// ⭐ 关键：不管从哪个端口打开页面，API 请求始终发到当前主机的 :3000
function apiBase() {
    var host = window.location.hostname || 'localhost';
    return 'http://' + host + ':3000';
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
        window.location.href = 'dl.html';
    });
}

var loginForm = document.getElementById('loginForm');
if (loginForm) {
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
            } else {
                alert(data.msg);
            }
            return;
        }
        var ipText = data.last_ip ? '，登录IP：' + data.last_ip : '';
        var extra = data.kickedOld ? '\n（原登录已自动失效）' : '';
        alert('登录成功，欢迎 ' + data.username + ipText + '！' + extra);
        var target = '../简介/index.html?sid=' + encodeURIComponent(data.sessionId);
        console.log('[LOGIN] redirecting to:', target);
        window.location.href = target;
    }
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var form = e.target;
        var username = form.username.value.trim();
        var password = form.password.value;
        if (!username || !password) { alert('请输入用户名和密码'); return; }
        await doLogin(username, password, false);
    });
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
        window.location.href = 'dl.html';
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