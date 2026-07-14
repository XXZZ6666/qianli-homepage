// ============ 日历 ============
let cpViewYear, cpViewMonth, cpSelectedKey = null;
const weekdays_cn = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function updateFloatingDate() {
    const now = new Date();
    document.getElementById('fdDate').textContent =
        now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    document.getElementById('fdWeekday').textContent = weekdays_cn[now.getDay()];
}

function getPlans() {
    try { return JSON.parse(localStorage.getItem('cpPlans') || '{}'); }
    catch (e) { return {}; }
}

function setPlan(key, text) {
    const plans = getPlans();
    if (text && text.trim()) plans[key] = text.trim();
    else delete plans[key];
    localStorage.setItem('cpPlans', JSON.stringify(plans));
}

function cpSavePlan() {
    if (!cpSelectedKey) { alert('请先选择一个日期'); return; }
    const val = document.getElementById('cpPlanInput').value;
    setPlan(cpSelectedKey, val);
    renderCpCalendar();
    const plans = getPlans();
    document.getElementById('cpDateLabel').textContent =
        plans[cpSelectedKey] ? '✓ 已保存' : '已清空';
}

function toggleCalendar() {
    const panel = document.getElementById('calendarPanel');
    if (!panel) return;
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
        cpSelectedKey = null;
        document.getElementById('cpPlanInput').value = '';
        document.getElementById('cpDateLabel').textContent = '选择一个日期';
        renderCpCalendar();
    }
}

function cpChangeMonth(delta) {
    cpViewMonth += delta;
    if (cpViewMonth > 11) { cpViewMonth = 0; cpViewYear++; }
    if (cpViewMonth < 0) { cpViewMonth = 11; cpViewYear--; }
    renderCpCalendar();
}

function cpGoToday() {
    const now = new Date();
    cpViewYear = now.getFullYear();
    cpViewMonth = now.getMonth();
    renderCpCalendar();
}

function renderCpCalendar() {
    const titleEl = document.getElementById('cpTitle');
    const daysEl = document.getElementById('cpDays');
    if (!titleEl || !daysEl) return;

    titleEl.textContent = cpViewYear + '年' + (cpViewMonth + 1) + '月';
    const firstDay = new Date(cpViewYear, cpViewMonth, 1).getDay();
    const daysInMonth = new Date(cpViewYear, cpViewMonth + 1, 0).getDate();
    const daysInPrev = new Date(cpViewYear, cpViewMonth, 0).getDate();
    const today = new Date();
    const isToday = function (y, m, d) {
        return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    };
    const plans = getPlans();

    daysEl.innerHTML = '';

    // 上一个月占位
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'cp-day other';
        cell.textContent = daysInPrev - i;
        daysEl.appendChild(cell);
    }
    // 当月日期
    for (let d = 1; d <= daysInMonth; d++) {
        const wd = new Date(cpViewYear, cpViewMonth, d).getDay();
        const key = cpViewYear + '-' + (cpViewMonth + 1) + '-' + d;
        const cell = document.createElement('div');
        cell.className = 'cp-day';
        if (wd === 0) cell.classList.add('sun');
        if (wd === 6) cell.classList.add('sat');
        if (isToday(cpViewYear, cpViewMonth, d)) cell.classList.add('today');
        if (plans[key]) cell.classList.add('has-plan');
        cell.textContent = d;
        cell.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.cp-day').forEach(function (el) { el.classList.remove('selected'); });
            cell.classList.add('selected');
            cpSelectedKey = key;
            document.getElementById('cpDateLabel').textContent =
                cpViewYear + '年' + (cpViewMonth + 1) + '月' + d + '日 ' + weekdays_cn[wd];
            document.getElementById('cpPlanInput').value = plans[key] || '';
            document.getElementById('cpPlanInput').focus();
        });
        daysEl.appendChild(cell);
    }
    // 下一个月占位
    const filled = firstDay + daysInMonth;
    const remaining = (7 - (filled % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const cell = document.createElement('div');
        cell.className = 'cp-day other';
        cell.textContent = i;
        daysEl.appendChild(cell);
    }
}

document.addEventListener('DOMContentLoaded', function () {
   const now = new Date();
    cpViewYear = now.getFullYear();
    cpViewMonth = now.getMonth();
    updateFloatingDate();
    const floatingDate = document.getElementById('floatingDate');
    if (floatingDate) {
        floatingDate.addEventListener('click', toggleCalendar);
    }
});