/* ============================================
   冒険喫茶ギルドアトラス - Script
   ============================================ */

// --- Page Load Animation ---
window.addEventListener('load', function () {
    document.body.classList.add('loaded');
});

// --- Current Year ---
document.getElementById('current-year').textContent = new Date().getFullYear();

// --- Event Stats Data ---
var eventStats = [
    { date: '11/21(金)', value: 143, label: '第8回' },
    { date: '11/29(土)', value: 148, label: '第9回' },
    { date: '12/5(金)', value: 126, label: '第10回' },
    { date: '12/13(土)', value: 79, label: '第11回' },
    { date: '12/19(金)', value: 103, label: '第12回' },
    { date: '12/24(水)', value: 70, label: '第13回' },
    { date: '1/16(金)', value: 93, label: '第14回' },
    { date: '1/24(土)', value: 115, label: '第15回' },
    { date: '1/30(金)', value: 131, label: '第16回' },
    { date: '2/6(金)', value: 155, label: '第17回' },
];

// --- Generate Chart ---
var chartEl = document.getElementById('chart');
var maxValue = Math.max.apply(null, eventStats.map(function (s) { return s.value; }));
var total = eventStats.reduce(function (sum, s) { return sum + s.value; }, 0);
var average = Math.round(total / eventStats.length);

eventStats.forEach(function (stat) {
    var bar = document.createElement('div');
    bar.className = 'chart-bar';

    var heightPercent = (stat.value / maxValue) * 100;

    bar.innerHTML =
        '<span class="chart-bar-value">' + stat.value + '</span>' +
        '<div class="chart-bar-fill" style="--bar-height: ' + heightPercent + '%;"></div>' +
        '<span class="chart-bar-label">' + stat.label + '</span>';

    chartEl.appendChild(bar);
});

// Average display
document.getElementById('average-participants').textContent = average;
document.getElementById('average-participants-count').textContent = eventStats[0].label;

// --- Dynamic Alternating Section Backgrounds ---
function updateSectionBackgrounds() {
    var main = document.querySelector('main');
    if (!main) return;
    var sections = main.querySelectorAll('.section');
    var altIndex = 0;
    sections.forEach(function (section) {
        // Skip CTA (has its own background)
        if (section.classList.contains('cta-section')) return;
        // Skip hidden sections
        var style = window.getComputedStyle(section);
        if (style.display === 'none') {
            section.classList.remove('section--alt');
            return;
        }
        if (altIndex % 2 === 0) {
            section.classList.add('section--alt');
        } else {
            section.classList.remove('section--alt');
        }
        altIndex++;
    });
}
updateSectionBackgrounds();

// --- IntersectionObserver Feature Check ---
if ('IntersectionObserver' in window) {
    // --- Scroll Animations ---
    var fadeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-up').forEach(function (el) {
        fadeObserver.observe(el);
    });

    // --- Chart Animation on Scroll ---
    var chartObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var fills = entry.target.querySelectorAll('.chart-bar-fill');
                var values = entry.target.querySelectorAll('.chart-bar-value');

                fills.forEach(function (fill, i) {
                    setTimeout(function () {
                        fill.classList.add('animate');
                    }, i * 80);
                });

                values.forEach(function (val, i) {
                    setTimeout(function () {
                        val.classList.add('animate');
                    }, i * 80 + 400);
                });

                chartObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });

    if (chartEl) {
        chartObserver.observe(chartEl);
    }

    // --- Sticky Navigation ---
    var nav = document.getElementById('nav');
    var hero = document.getElementById('hero');

    var navObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                nav.classList.add('visible');
            } else {
                nav.classList.remove('visible');
            }
        });
    }, {
        threshold: 0.05
    });

    if (hero) {
        navObserver.observe(hero);
    }
} else {
    // Fallback: show all content immediately
    document.querySelectorAll('.fade-up').forEach(function (el) {
        el.classList.add('visible');
    });

    // Show chart bars and values immediately
    document.querySelectorAll('.chart-bar-fill').forEach(function (fill) {
        fill.classList.add('animate');
    });
    document.querySelectorAll('.chart-bar-value').forEach(function (val) {
        val.classList.add('animate');
    });
}
