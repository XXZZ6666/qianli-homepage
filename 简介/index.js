// ============ 轮播图 ============
let slideIndex = 0;
let dots;
let slides;
let autoplay;
let descElement;

function showSlide(n) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[n].classList.add('active');
    dots[n].classList.add('active');
    slideIndex = n;
}
function nextSlide() {
    slideIndex = (slideIndex + 1) % slides.length;
    showSlide(slideIndex);
}
function prevSlide() {
    slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    showSlide(slideIndex);
}
function gotoSlide(n) {
    showSlide(n);
}
function startautoplay() {
    autoplay = setInterval(nextSlide, 3000);
}

// ============ 工具栏内容 ============
const gjlan = [
    { type: 'iframe', src: '../便利贴/BLT.HTML', title: '便利贴' },
    { type: 'iframe', src: '../不规则图形/svg.html', title: 'SVG' },
    { type: 'iframe', src: '../天气/tq.html', title: '实时天气' },
];

function renderGjlan(item, container) {
    if (!item) { container.innerHTML = ''; return; }
    if (item.type === 'iframe') {
        container.innerHTML =
            '<h2 style="margin:0 0 10px 0;text-align:center;">' + item.title + '</h2>' +
            '<div style="border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15);">' +
            '<iframe src="' + item.src + '" style="width:100%;height:800px;border:0;display:block;"></iframe>' +
            '</div>';
    } else if (item.type === 'link') {
        container.innerHTML =
            '<h2>' + item.title + '</h2>' +
            '<p><a href="' + item.src + '" target="_blank">点此跳转</a></p>';
    } else {
        container.innerHTML = '<h1>' + (item.text || '') + '</h1>';
    }
}

function showGjlan(n) {
    const gjlanContent = document.getElementById('gjlan-content');
    const gjlanItems = document.querySelectorAll('.gjlan-item');
    if (gjlanContent && gjlan[n]) {
        renderGjlan(gjlan[n], gjlanContent);
    }
    gjlanItems.forEach((item, idx) => {
        if (idx === n) item.classList.add('active');
        else item.classList.remove('active');
    });
}

// ============ 滚动时导航栏变淡 ============
function setupNavScroll() {
    let scrollTimer = null;
    function onScroll() {
        document.body.classList.add('scrolled');
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            document.body.classList.remove('scrolled');
        }, 200);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// ============ 纵向轮播文字 ============
function setupTypeText() {
    const viewport = document.getElementById('typeText');
    const item = document.getElementById('typeItem');
    if (!viewport || !item) return;
    // 所有句子放这里，循环播放
    const IN_FROM = 'bottom';
    const sentences = [
        '这是我的自我简介',
        '这是首页中心',
        '想要查看更多信息',
        '请点击首部导航栏位置',
        '或者滚动到对应位置进行查看'
    ];
    const itemHeight = 40;                   // 对应 CSS 的 height
    const inOffset = IN_FROM === 'top' ? -itemHeight : itemHeight;
    let idx = 0;
    let isAnimating = false;
    let timerId = null;
    function goTo(newIdx, direction) {
        if (isAnimating) return;
        if (newIdx === idx) return;
        isAnimating = true;
        // 方向决定 "旧句滑出方向" 和 "新句进入起点"
        const outOffset = direction === 'down' ? itemHeight : -itemHeight;
        const enterOffset = direction === 'down' ? -itemHeight : itemHeight;
        // 1) 旧句滑出
        item.style.transform = 'translateY(' + outOffset + 'px)';
        item.style.opacity = '0';

        // 滚到最后一句后，无缝滚回第一句
        setTimeout(function () {
            idx = ((newIdx % sentences.length) + sentences.length) % sentences.length;
            item.textContent = sentences[idx];
            item.style.transition = 'none';
            item.style.transform = 'translateY(' + enterOffset + 'px)';
            item.style.opacity = '0';
            // 下一帧开始滑入动画
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    item.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                    item.style.transform = 'translateY(0)';
                    item.style.opacity = '1';
                    setTimeout(function () { isAnimating = false; }, 500);
                });
            });
        }, 500);
    }

     // 定时自动下一句（"向上推"的方向）
    function startAuto() {
        if (timerId) return;
        timerId = setInterval(function () {
            goTo(idx + 1, 'up');
        }, 2000);
    }
    function stopAuto() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }
    // 鼠标移入暂停，移出继续
    viewport.addEventListener('mouseenter', stopAuto);
    viewport.addEventListener('mouseleave', startAuto);
    // 滚轮：向下滚 → 看下一句；向上滚 → 看上一句
    viewport.addEventListener('wheel', function (e) {
        e.preventDefault();
        // 自然语义：鼠标往下滚（手指向下推） = 看下面一条 = 下一句 = 方向 up
        //          鼠标往上滚（手指向上推） = 看上面一条 = 上一句 = 方向 down
        if (e.deltaY > 0) {
            goTo(idx + 1, 'up');
        } else if (e.deltaY < 0) {
            goTo(idx - 1, 'down');
        }
    }, { passive: false });
    startAuto();
}

// ============ 点击文字区展开/收起 ============
function setupExpandCollapse() {
    const shouyeSection = document.querySelector('.section-shouye');
    const collapseBtn = document.getElementById('collapseBtn');
    const typeArea = document.getElementById('typeText');
    if (!shouyeSection || !typeArea) return;

    function triggerSkillBars() {
        document.querySelectorAll('.skill-fill').forEach(function (fill) {
            const percentEl = fill.parentElement.parentElement.querySelector('.skill-percent');
            if (percentEl) {
                const target = parseInt(percentEl.getAttribute('data-target'), 10) || 0;
                fill.style.width = '0%';
                requestAnimationFrame(function () {
                    fill.style.width = target + '%';
                });
            }
        });
    }

    typeArea.addEventListener('click', function () {
        const isExpanded = shouyeSection.classList.toggle('expanded');
        if (isExpanded) {
            triggerSkillBars();
        }
    });

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            shouyeSection.classList.remove('expanded');
            shouyeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

// ============ 锚点平滑滚动 ============
function setupAnchorLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============ 星星评分 ============
function setupStarRating() {
    const ratingContainers = document.querySelectorAll('.star-rating');
    ratingContainers.forEach(function (container) {
        const stars = container.querySelectorAll('.star');
        const ratingText = container.querySelector('.rating-text');
        const activeCount = container.querySelectorAll('.star.active').length;
        const ratings = ['', '需要改进', '一般', '不错！', '很棒！', '非常棒！'];
        if (ratingText) {
            ratingText.textContent = ratings[activeCount] || '请评价';
        }
        stars.forEach(function (star) {
            star.addEventListener('click', function () {
                stars.forEach(function (s) { s.classList.remove('active'); });
                const rating = parseInt(this.dataset.rating, 10);
                for (let i = 0; i < rating; i++) {
                    stars[i].classList.add('active');
                }
                if (ratingText) {
                    ratingText.textContent = ratings[rating];
                }
            });
        });
    });
}

// ============ 进度条动画 ============
function setupBarAnimation() {
    const bar = document.getElementById('bar');
    const ceners = document.querySelectorAll('.cener');
    const gdt = document.querySelector('.gdt');
    if (!bar) return;

    bar.addEventListener('animationend', function () {
        if (gdt) gdt.style.display = 'none';
        setTimeout(function () {
            ceners.forEach(function (cener) {
                cener.classList.remove('hidden');
                cener.classList.add('show');
                if (slides && slides.length > 0) {
                    startautoplay();
                }
            });
        }, 500);
    });
}

// ============ 回到顶部 ============
function setupBackToTop() {
    const backToTop = document.getElementById('totop');
    if (!backToTop) return;
    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', function () {
        if (window.scrollY > 800) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }, { passive: true });
}

// ============ 翻转卡片（点击多圈旋转：先快后慢） ============ 
let flipRotation = 0;
function flipCard(cardEl) {
    const inner = cardEl.querySelector('.flip-inner');
    if (!inner) return;
    flipRotation += 3600 + 180; // 每次 2 圈 + 翻面
    inner.style.transform = 'rotateY(' + flipRotation + 'deg)';
}

// ============ 技能进度条动画 ============
function setupSkillBars() {
    const skillItems = document.querySelectorAll('.skill-item');
     // 计算熟练度等级
    function getLevel(val) {
        if (val > 75) return '精通';
        if (val > 50) return '熟练';
        if (val > 25) return '入门';
        return '小白';
    }
    // 统一：给某个 skill-item 应用百分比值（更新 data-target、进度条、熟练度）
    function applyValue(item, val) {
        val = Math.max(0, Math.min(100, val || 0));
        const percentEl = item.querySelector('.skill-percent');
        const fillEl = item.querySelector('.skill-fill');
        // 在 skill-label 里插入一个熟练度标签
        const labelEl = item.querySelector('.skill-label');
         if (!percentEl || !fillEl || !labelEl) return;
        percentEl.setAttribute('data-target', val);
        if (percentEl.tagName === 'INPUT') {
            percentEl.value = val;
        }
        fillEl.style.width = val + '%';
        let levelEl = labelEl.querySelector('.skill-level');
        if (!levelEl) {
            levelEl = document.createElement('span');
            levelEl.className = 'skill-level';
            labelEl.appendChild(levelEl);
        }
        levelEl.textContent = '（' + getLevel(val) + '）';
    }
    // 1) 初始化所有 skill-item
    skillItems.forEach(function (item) {
        const percentEl = item.querySelector('.skill-percent');
        if (!percentEl) return;
        const initVal = parseInt(percentEl.getAttribute('data-target'), 10) || 0;
        applyValue(item, initVal);
        // 输入事件：实时改进度条
        percentEl.addEventListener('input', function () {
            const v = parseInt(percentEl.value, 10);
            const fillEl = item.querySelector('.skill-fill');
            const levelEl = item.querySelector('.skill-level');
            if (!isNaN(v)) {
                const clamped = Math.max(0, Math.min(100, v));
                percentEl.setAttribute('data-target', clamped);
                if (fillEl) fillEl.style.width = clamped + '%';
                if (levelEl) levelEl.textContent = '（' + getLevel(clamped) + '）';
            }
        });
   // 失焦 / 回车：修正到 0-100 的合法值
        percentEl.addEventListener('blur', function () {
            applyValue(item, parseInt(percentEl.value, 10));
        });
        percentEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                percentEl.blur();
            }
        });
    });
    // 2) 滚动进入视野时触发一次动画（原 IntersectionObserver 逻辑）
    if (!('IntersectionObserver' in window)) return;
    const skillObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const percentEl = entry.target.querySelector('.skill-percent');
                if (percentEl) {
                    const target = parseInt(percentEl.getAttribute('data-target'), 10) || 0;
                    const fillEl = entry.target.querySelector('.skill-fill');
                    if (fillEl) fillEl.style.width = target + '%';
                }
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    skillItems.forEach(function (item) {
        skillObserver.observe(item);
    });
}

// ============ 页面加载完成 ============
document.addEventListener('DOMContentLoaded', function () {
    dots = document.querySelectorAll('.dot');
    slides = document.querySelectorAll('.slide');
    descElement = document.getElementById('slide-msg');

    const gjlanContent = document.getElementById('gjlan-content');
    const gjlanItems = document.querySelectorAll('.gjlan-item');
    if (gjlanContent && gjlan[0]) {
        renderGjlan(gjlan[0], gjlanContent);
    }
    if (gjlanItems.length > 0) {
        gjlanItems[0].classList.add('active');
    }

    setupBarAnimation();
    setupNavScroll();
    setupTypeText();
    setupExpandCollapse();
    setupAnchorLinks();
    setupStarRating();
    setupBackToTop();
    setupSkillBars();
});