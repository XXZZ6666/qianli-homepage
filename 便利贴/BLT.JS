/*function apiBase() {
    var host = window.location.hostname || 'localhost';
    return 'http://' + host + ':3000';
}

(function initSid() {
    var urlSid = new URLSearchParams(window.location.search).get('sid');
    if (urlSid) {
        sessionStorage.setItem('__SESSION_ID__', urlSid);
        console.log('[BLT] got sid from URL:', urlSid);
    }
    var stored = sessionStorage.getItem('__SESSION_ID__');
    console.log('[BLT] sessionStorage sid:', stored);
})();

async function checkSession() {
    try {
        var headers = { 'Content-Type': 'application/json' };
        var storedSid = sessionStorage.getItem('__SESSION_ID__');
        if (storedSid) {
            headers['x-session-id'] = storedSid;
            console.log('[BLT] sending x-session-id:', storedSid);
        }
        var fullUrl = apiBase() + '/api/check-session';
        var res = await fetch(fullUrl, {
            credentials: 'include',
            headers: headers
        });
        var data = await res.json();
        if (!data.ok) {
            alert(data.msg || '会话已失效，请重新登录');
            sessionStorage.removeItem('__SESSION_ID__');
            window.location.href = apiBase() + '/登入注册/dl.html';
            return false;
        }
        var el = document.getElementById('userInfo');
        if (el) {
            el.textContent = '当前用户：' + data.username + '（登录IP：' + data.loginIp + '，登录时间：' + data.loginTime + '）';
        }
        return true;
    } catch (e) {
        alert('无法连接服务器，请重新登录');
        sessionStorage.removeItem('__SESSION_ID__');
        window.location.href = apiBase() + '/登入注册/dl.html';
        return false;
    }
}

checkSession();
setInterval(checkSession, 10000);*/

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('li a').forEach(function (a) {
        var h = Math.floor(Math.random() * 360);
        var s = Math.floor(Math.random() * 75);
        var l = Math.floor(55 + Math.random() * 35);
        var alpha = (0.6 + Math.random() * 0.3).toFixed(2);
        a.style.backgroundColor = 'hsla(' + h + ', ' + s + '%, ' + l + '%,' + alpha + ')';
    });
    var volume = document.getElementById('volume');
    var volumeText = document.getElementById('volume-text');
    var ms = document.querySelector('.ms');
    function applyNoteScale(value) {
        var scale = 0.5 + value / 100;
        ms.style.setProperty('--note-scale', scale);
        volumeText.textContent = value;
    }
    applyNoteScale(parseInt(volume.value, 10));
    volume.addEventListener('input', function () { applyNoteScale(parseInt(this.value, 10)); });
    document.addEventListener('click', async function (e) {
        if (e.target.classList && e.target.classList.contains('del')) {
            e.preventDefault(); e.stopPropagation();
            //var ok = await checkSession(); if (!ok) return;
            e.target.closest('li').remove();
        }
    });
    document.addEventListener('click', async function (e) {
        if (e.target.classList && e.target.classList.contains('add')) {
           // var ok = await checkSession(); if (!ok) return;
            var ul = document.querySelector('ul');
            var h = Math.floor(Math.random() * 360);
            var s = Math.floor(55 + Math.random() * 20);
            var l = Math.floor(70 + Math.random() * 15);
            var alpha = (0.6 + Math.random() * 0.3).toFixed(2);
            var color = 'hsla(' + h + ', ' + s + '%, ' + l + '%,' + alpha + ')';
            var li = document.createElement('li');
            li.innerHTML = '<a href="#"><span class="del">×</span><h2 contenteditable="true">新标题</h2><p contenteditable="true">新内容</p></a>';
            li.querySelector('a').style.backgroundColor = color;
            var home = ul.querySelector('.home');    // 找到"返回主页"那个 li
            if (home) {
                ul.insertBefore(li, home);           // 把新便利贴插到 home 的前面
            } else {
                ul.appendChild(li);                  // 万一没找到 home，就放末尾（兜底）
            }
        }
    });
});