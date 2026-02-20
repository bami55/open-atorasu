/* ============================================
   冒険喫茶ギルドアトラス - Script
   ============================================ */

// --- Utilities ---
function toSafeInt(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return 0;
    return n;
}

// --- Hero Slideshow ---
var heroImages = [
    '/assets/images/hero/hero001.webp',
    '/assets/images/hero/hero002.webp',
    '/assets/images/hero/hero003.webp',
    '/assets/images/hero/hero004.webp',
    '/assets/images/hero/hero005.webp',
    '/assets/images/hero/hero006.webp',
    '/assets/images/hero/hero007.webp',
    '/assets/images/hero/hero008.webp',
    '/assets/images/hero/hero009.webp',
    '/assets/images/hero/hero010.webp',
    '/assets/images/hero/hero011.webp',
    '/assets/images/hero/hero012.webp',
    '/assets/images/hero/hero013.webp',
    '/assets/images/hero/hero014.webp',
    '/assets/images/hero/hero015.webp',
    '/assets/images/hero/hero016.webp',
];

// Shuffle (Fisher-Yates)
for (var i = heroImages.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = heroImages[i];
    heroImages[i] = heroImages[j];
    heroImages[j] = tmp;
}

var heroSlideA = document.getElementById('hero-slide-a');
var heroSlideB = document.getElementById('hero-slide-b');
var currentHeroIndex = 0;

heroSlideA.style.backgroundImage = 'url(' + heroImages[currentHeroIndex] + ')';
heroSlideA.classList.add('hero-slide--active');
heroSlideA.classList.add('hero-slide--zooming');

var activeHeroSlide = heroSlideA;
var inactiveHeroSlide = heroSlideB;

// --- Page Load Animation ---
window.addEventListener('load', function () {
    document.body.classList.add('loaded');

    // Start slideshow after initial load animation
    setInterval(function () {
        currentHeroIndex = (currentHeroIndex + 1) % heroImages.length;

        // Preload next image, then cross-fade
        var preload = new Image();
        preload.onload = function () {
            inactiveHeroSlide.style.backgroundImage = 'url(' + heroImages[currentHeroIndex] + ')';

            // Restart zoom animation on new slide (reflow trick)
            inactiveHeroSlide.classList.remove('hero-slide--zooming');
            void inactiveHeroSlide.offsetWidth;
            inactiveHeroSlide.classList.add('hero-slide--zooming');

            // Cross-fade (old slide keeps zooming while fading out)
            inactiveHeroSlide.classList.add('hero-slide--active');
            activeHeroSlide.classList.remove('hero-slide--active');

            var temp = activeHeroSlide;
            activeHeroSlide = inactiveHeroSlide;
            inactiveHeroSlide = temp;
        };
        preload.src = heroImages[currentHeroIndex];
    }, 6000);
});

// --- Current Year ---
document.getElementById('current-year').textContent = new Date().getFullYear();

// --- Event Stats Data ---
var eventStats = [
    { date: '12/5(金)', value: 126, label: '第10回' },
    { date: '12/13(土)', value: 79, label: '第11回' },
    { date: '12/19(金)', value: 103, label: '第12回' },
    { date: '12/24(水)', value: 70, label: '第13回' },
    { date: '1/16(金)', value: 93, label: '第14回' },
    { date: '1/24(土)', value: 115, label: '第15回' },
    { date: '1/30(金)', value: 131, label: '第16回' },
    { date: '2/6(金)', value: 155, label: '第17回' },
    { date: '2/14(土)', value: 90, label: '第18回' },
    { date: '2/20(金)', value: 80, label: '第19回' },
];

// --- Generate Chart ---
var chartEl = document.getElementById('chart');
var maxValue = Math.max.apply(null, eventStats.map(function (s) { return s.value; }));
var minValue = Math.min.apply(null, eventStats.map(function (s) { return s.value; }));
var baseline = Math.max(0, Math.floor(minValue / 10) * 10 - 20);
var total = eventStats.reduce(function (sum, s) { return sum + s.value; }, 0);
var average = Math.round(total / eventStats.length);

eventStats.forEach(function (stat) {
    var bar = document.createElement('div');
    bar.className = 'chart-bar';

    var heightPercent = ((stat.value - baseline) / (maxValue - baseline)) * 100;

    bar.innerHTML =
        '<div class="chart-bar-track">' +
            '<span class="chart-bar-value">' + stat.value + '</span>' +
            '<div class="chart-bar-fill" style="--bar-height: ' + heightPercent + '%;"></div>' +
        '</div>' +
        '<span class="chart-bar-label">' + stat.label + '</span>';

    chartEl.appendChild(bar);
});

// Average display
document.getElementById('average-participants').textContent = average;
document.getElementById('average-participants-count').textContent = eventStats[0].label;

// --- Adventurer Data (Lazy Loaded) ---
var adventurerDataUrl = 'https://guild-atorasu.github.io/atorasu-db/adventurers.json';
var adventurerDataPromise = null;
var adventurerDataRequested = false;

var advCloudBreakpoint = 1024;
var advCloudLatestSummary = null;
var advCloudLayoutMode = '';
var advCloudResizeTimer = null;
var advCloudRenderToken = 0;
var advCloudRenderTask = null;

var advCloudNowMs = (window.performance && typeof window.performance.now === 'function')
    ? function () { return performance.now(); }
    : function () { return new Date().getTime(); };

function advCloudCancelScheduledTask() {
    if (!advCloudRenderTask) return;
    if (advCloudRenderTask.type === 'raf') {
        cancelAnimationFrame(advCloudRenderTask.id);
    } else {
        clearTimeout(advCloudRenderTask.id);
    }
    advCloudRenderTask = null;
}

function advCloudScheduleTask(fn) {
    advCloudCancelScheduledTask();
    if (window.requestAnimationFrame) {
        advCloudRenderTask = {
            type: 'raf',
            id: requestAnimationFrame(function () {
                advCloudRenderTask = null;
                fn();
            })
        };
    } else {
        advCloudRenderTask = {
            type: 'timeout',
            id: setTimeout(function () {
                advCloudRenderTask = null;
                fn();
            }, 16)
        };
    }
}

// --- UI Mutation Batching ---
// Observer/タイマー由来のDOM更新を単一rAFフレームに集約し、Style再計算の多重化を防止
var uiMutationQueue = [];
var uiMutationRafId = null;

function flushUiMutations() {
    uiMutationRafId = null;
    var queue = uiMutationQueue;
    uiMutationQueue = [];
    for (var qi = 0; qi < queue.length; qi++) {
        queue[qi]();
    }
}

function enqueueUiMutation(fn) {
    uiMutationQueue.push(fn);
    if (uiMutationRafId) return;
    if (window.requestAnimationFrame) {
        uiMutationRafId = requestAnimationFrame(flushUiMutations);
    } else {
        uiMutationRafId = setTimeout(flushUiMutations, 0);
    }
}

function isFlowJobCloudLayout() {
    if (window.matchMedia) {
        return window.matchMedia('(max-width: ' + advCloudBreakpoint + 'px)').matches;
    }
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (!w && document.body) w = document.body.clientWidth;
    return w <= advCloudBreakpoint;
}

function dispatchJobCloudRendered(cloudEl) {
    if (document.createEvent && cloudEl.dispatchEvent) {
        var evt = document.createEvent('Event');
        evt.initEvent('adv-cloud-rendered', true, true);
        cloudEl.dispatchEvent(evt);
    }
}

function pad2(num) {
    return num < 10 ? '0' + num : String(num);
}

function parseAdventurerDate(value) {
    if (!value || typeof value !== 'string') return null;
    var parts = value.split(' ');
    if (!parts[0]) return null;

    var d = parts[0].split('/');
    if (d.length !== 3) return null;

    var t = parts[1] ? parts[1].split(':') : ['0', '0', '0'];

    var year = parseInt(d[0], 10);
    var month = parseInt(d[1], 10) - 1;
    var day = parseInt(d[2], 10);
    var hour = parseInt(t[0] || '0', 10);
    var minute = parseInt(t[1] || '0', 10);
    var second = parseInt(t[2] || '0', 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month, day, hour, minute, second);
}

function aggregateAdventurerData(rawList) {
    var rankCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    var jobCounts = {};
    var monthCounts = {};
    var createdDates = [];
    var i;

    for (i = 0; i < rawList.length; i++) {
        var row = rawList[i];
        if (!row || typeof row !== 'object') continue;

        if (row.deleteAt && String(row.deleteAt).replace(/\s/g, '') !== '') continue;

        var createdAt = parseAdventurerDate(row.createAt);
        if (!createdAt) continue;

        createdDates.push(createdAt);

        var rank = parseInt(row.rank, 10);
        if (rankCounts.hasOwnProperty(rank)) {
            rankCounts[rank] = rankCounts[rank] + 1;
        }

        var job = typeof row.job === 'string' ? row.job.replace(/^\s+|\s+$/g, '') : '';
        if (job) {
            if (!jobCounts[job]) jobCounts[job] = 0;
            jobCounts[job] = jobCounts[job] + 1;
        }

        var monthKey = createdAt.getFullYear() + '/' + pad2(createdAt.getMonth() + 1);
        if (!monthCounts[monthKey]) monthCounts[monthKey] = 0;
        monthCounts[monthKey] = monthCounts[monthKey] + 1;
    }

    var total = createdDates.length;
    var uniqueJobs = 0;
    var topJobs = [];
    var monthKeys = [];
    var monthly = [];
    var key;

    for (key in jobCounts) {
        if (jobCounts.hasOwnProperty(key)) {
            uniqueJobs++;
            topJobs.push({ job: key, count: jobCounts[key] });
        }
    }

    topJobs.sort(function (a, b) {
        return b.count - a.count;
    });

    // 同率グループ内だけ Fisher-Yates でシャッフル（limit 適用前）
    (function shuffleSameCountGroups(list) {
        var start = 0;
        while (start < list.length) {
            var end = start + 1;
            while (end < list.length && list[end].count === list[start].count) {
                end++;
            }

            var si;
            for (si = end - 1; si > start; si--) {
                var sj = start + Math.floor(Math.random() * (si - start + 1));
                var stmp = list[si];
                list[si] = list[sj];
                list[sj] = stmp;
            }
            start = end;
        }
    })(topJobs);

    for (key in monthCounts) {
        if (monthCounts.hasOwnProperty(key)) {
            monthKeys.push(key);
        }
    }
    monthKeys.sort();

    var cumulative = 0;
    for (i = 0; i < monthKeys.length; i++) {
        var mk = monthKeys[i];
        cumulative = cumulative + monthCounts[mk];
        monthly.push({
            key: mk,
            count: monthCounts[mk],
            cumulative: cumulative
        });
    }

    var now = new Date();
    var thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    var recent30 = 0;
    for (i = 0; i < createdDates.length; i++) {
        if (createdDates[i] >= thirtyDaysAgo) recent30++;
    }

    var beginnerCount = (rankCounts[1] || 0) + (rankCounts[2] || 0);
    var beginnerRatio = total > 0 ? Math.round((beginnerCount / total) * 100) : 0;

    var len = monthly.length;
    var recent3Count = 0;
    var prev3Count = 0;

    for (i = Math.max(0, len - 3); i < len; i++) {
        recent3Count = recent3Count + monthly[i].count;
    }
    for (i = Math.max(0, len - 6); i < Math.max(0, len - 3); i++) {
        prev3Count = prev3Count + monthly[i].count;
    }

    var growthRate = 0;
    if (prev3Count > 0) {
        growthRate = Math.round(((recent3Count - prev3Count) / prev3Count) * 100);
    }

    return {
        total: total,
        recent30: recent30,
        uniqueJobs: uniqueJobs,
        rankCounts: rankCounts,
        beginnerRatio: beginnerRatio,
        topJobs: topJobs,
        monthly: monthly,
        monthCountMap: monthCounts,
        recent3Count: recent3Count,
        prev3Count: prev3Count,
        growthRate: growthRate
    };
}

function escapeHtml(text) {
    var str = String(text);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatJobLabel(job) {
    return String(job)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
}

function getLast6CalendarMonths(monthCountMap) {
    var now = new Date();
    var result = [];
    var i;
    for (i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var key = d.getFullYear() + '/' + pad2(d.getMonth() + 1);
        result.push({
            key: key,
            count: monthCountMap[key] || 0
        });
    }
    return result;
}

function renderGrowthChart(monthCountMap) {
    var growthChartEl = document.getElementById('adv-growth-chart');
    if (!growthChartEl) return;

    growthChartEl.classList.remove('is-ready');
    growthChartEl.innerHTML = '';

    var last6 = getLast6CalendarMonths(monthCountMap || {});
    if (!last6.length) return;

    var maxCount = 1;
    var i;
    for (i = 0; i < last6.length; i++) {
        if (last6[i].count > maxCount) maxCount = last6[i].count;
    }

    for (i = 0; i < last6.length; i++) {
        var m = last6[i];
        var height = maxCount > 0 ? Math.round((m.count / maxCount) * 100) : 0;
        var item = document.createElement('div');
        item.className = 'adv-growth-item';
        item.innerHTML =
            '<div class="adv-growth-track">' +
                '<span class="adv-growth-value">' + m.count + '名</span>' +
                '<div class="adv-growth-fill" style="--growth-height: ' + height + '%;"></div>' +
            '</div>' +
            '<span class="adv-growth-label">' + m.key + '</span>';
        growthChartEl.appendChild(item);
    }

    setTimeout(function () {
        growthChartEl.classList.add('is-ready');
    }, 200);
}

function renderAdventurerProofSection(summary) {
    var totalEl = document.getElementById('adv-total');
    var recentEl = document.getElementById('adv-recent30');
    var jobsEl = document.getElementById('adv-job-variety');
    var ratioEl = document.getElementById('adv-beginner-ratio');
    var growthNoteEl = document.getElementById('adv-growth-note');

    if (totalEl) totalEl.textContent = summary.total;
    if (recentEl) recentEl.textContent = summary.recent30;
    if (jobsEl) jobsEl.textContent = summary.uniqueJobs;
    if (ratioEl) ratioEl.textContent = summary.beginnerRatio;

    renderGrowthChart(summary.monthCountMap);

    if (growthNoteEl) {
        if (summary.monthly.length === 0) {
            growthNoteEl.textContent = '登録データを準備中です。';
        } else if (summary.prev3Count > 0) {
            var sign = summary.growthRate > 0 ? '+' : '';
            growthNoteEl.innerHTML =
                '直近3か月で' + toSafeInt(summary.recent3Count) + '名が新規登録<br class="sp-only">（前3か月比 ' + sign + toSafeInt(summary.growthRate) + '%）';
        } else {
            growthNoteEl.innerHTML = '直近3か月で' + toSafeInt(summary.recent3Count) + '名が新規登録。<br class="sp-only">コミュニティが拡大中です。';
        }
    }
}

function estimateLabelWidth(label, size) {
    var units = 0;
    var ci;
    for (ci = 0; ci < label.length; ci++) {
        var ch = label.charAt(ci);
        var code = label.charCodeAt(ci);

        if (ch === ' ') {
            units += 0.33;
        } else if (
            (code >= 0x3040 && code <= 0x30ff) ||
            (code >= 0x3400 && code <= 0x9fff) ||
            (code >= 0xf900 && code <= 0xfaff) ||
            (code >= 0xff01 && code <= 0xff60) ||
            (code >= 0xffe0 && code <= 0xffee)
        ) {
            units += 0.98;
        } else if (
            (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122)
        ) {
            units += 0.56;
        } else if (ch === '-' || ch === '_' || ch === '/' || ch === '.') {
            units += 0.38;
        } else {
            units += 0.72;
        }
    }

    return Math.max(size * 1.08, (units * size) + (size * 0.24));
}

function renderJobWordCloudFlow(cloudEl, items) {
    cloudEl.classList.add('is-flow');

    var i;
    for (i = 0; i < items.length; i++) {
        var item = items[i];
        var span = document.createElement('span');

        span.className = 'adv-job-word adv-job-word--flow';
        span.style.fontSize = item.size + 'px';
        span.style.transitionDelay = (i * 16) + 'ms';
        span.title = item.count + '名';
        span.appendChild(document.createTextNode(item.label));

        cloudEl.appendChild(span);
    }
}

function renderJobWordCloudSvg(cloudEl, items, renderToken, onDone) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var vbSize = 1200;
    var vbCropY = 48;
    var vbHeight = vbSize - (vbCropY * 2);
    var center = vbSize / 2;
    var outerRadius = 548;
    var safeInset = 20;
    var maxRadius = outerRadius - safeInset;
    var collisionPadding = 7;
    var maxRadius2 = maxRadius * maxRadius;
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));
    var maxAttempts = 320;
    var ringStep = 11;

    var gridCell = 56;
    var chunkBudgetInit = 4;
    var chunkBudgetFull = 12;
    var chunkRampFrames = 3;
    var fallbackScanSteps = 48;
    var fallbackRingCount = 5;
    var timeCheckStride = 4;

    var placed = [];
    var positions = new Array(items.length);
    var grid = Object.create(null);
    var scanStamp = 1;
    var index = 0;
    var activePlacement = null;
    var chunkCount = 0;

    // --- GC対策: オブジェクトプールと事前計算テーブル ---
    var tempCandidate = { cx: 0, cy: 0, left: 0, right: 0, top: 0, bottom: 0, _advScanStamp: 0 };

    // fallback角度のcos/sinを事前計算（Math.cos/sin呼び出しを排除）
    var fallbackCosTable = new Array(fallbackScanSteps);
    var fallbackSinTable = new Array(fallbackScanSteps);
    var fbi;
    for (fbi = 0; fbi < fallbackScanSteps; fbi++) {
        var fbAngle = (Math.PI * 2 * fbi) / fallbackScanSteps;
        fallbackCosTable[fbi] = Math.cos(fbAngle);
        fallbackSinTable[fbi] = Math.sin(fbAngle);
    }

    function fillBox(box, cx, cy, halfW, halfH) {
        box.cx = cx;
        box.cy = cy;
        box.left = cx - halfW - collisionPadding;
        box.right = cx + halfW + collisionPadding;
        box.top = cy - halfH - collisionPadding;
        box.bottom = cy + halfH + collisionPadding;
    }

    function cloneBox(box) {
        return { cx: box.cx, cy: box.cy, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }

    // halo要素の参照（初動中のアニメーション一時停止用）
    var haloEl = cloudEl.parentElement ? cloudEl.parentElement.querySelector('.adv-cloud-halo') : null;
    if (haloEl) haloEl.style.animationPlayState = 'paused';

    function isCanceled() {
        return renderToken !== advCloudRenderToken;
    }

    function boxIntersects(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    function insideCircle(x, y, halfW, halfH) {
        var dx;
        var dy;

        dx = (x - halfW) - center; dy = (y - halfH) - center;
        if ((dx * dx + dy * dy) > maxRadius2) return false;

        dx = (x + halfW) - center; dy = (y - halfH) - center;
        if ((dx * dx + dy * dy) > maxRadius2) return false;

        dx = (x - halfW) - center; dy = (y + halfH) - center;
        if ((dx * dx + dy * dy) > maxRadius2) return false;

        dx = (x + halfW) - center; dy = (y + halfH) - center;
        if ((dx * dx + dy * dy) > maxRadius2) return false;

        return true;
    }

    function gridKey(gx, gy) {
        // 数値キーで文字列連結・GCを回避（座標範囲 -5〜25 に十分）
        return (gy + 64) * 1000 + (gx + 64);
    }

    function addBoxToGrid(box) {
        var minGX = Math.floor(box.left / gridCell);
        var maxGX = Math.floor(box.right / gridCell);
        var minGY = Math.floor(box.top / gridCell);
        var maxGY = Math.floor(box.bottom / gridCell);
        var gx;
        var gy;
        var key;

        for (gy = minGY; gy <= maxGY; gy++) {
            for (gx = minGX; gx <= maxGX; gx++) {
                key = gridKey(gx, gy);
                if (!grid[key]) grid[key] = [];
                grid[key].push(box);
            }
        }
    }

    function countHits(candidate, stopAfter, deadlineMs) {
        var minGX = Math.floor(candidate.left / gridCell);
        var maxGX = Math.floor(candidate.right / gridCell);
        var minGY = Math.floor(candidate.top / gridCell);
        var maxGY = Math.floor(candidate.bottom / gridCell);
        var gx;
        var gy;
        var key;
        var list;
        var li;
        var hit = 0;
        var scanOps = 0;

        scanStamp = scanStamp + 1;
        if (scanStamp > 2147483000) {
            for (var si = 0; si < placed.length; si++) {
                placed[si]._advScanStamp = 0;
            }
            scanStamp = 1;
        }

        for (gy = minGY; gy <= maxGY; gy++) {
            for (gx = minGX; gx <= maxGX; gx++) {
                key = gridKey(gx, gy);
                list = grid[key];
                if (!list) continue;

                for (li = 0; li < list.length; li++) {
                    var box = list[li];
                    if (box._advScanStamp === scanStamp) continue;
                    box._advScanStamp = scanStamp;

                    if (boxIntersects(candidate, box)) {
                        hit++;
                        if (stopAfter && hit >= stopAfter) return hit;
                    }

                    scanOps = scanOps + 1;
                    if (deadlineMs && (scanOps % 16) === 0 && advCloudNowMs() >= deadlineMs) {
                        return -1;
                    }
                }
            }
        }
        return hit;
    }

    function createPlacementState(itemIndex) {
        var item = items[itemIndex];
        return {
            itemIndex: itemIndex,
            item: item,
            phase: 0,
            baseAngle: (itemIndex * goldenAngle) % (Math.PI * 2),
            attempt: 0,
            placedBox: null,
            best: null,
            bestHits: 999999,
            scan: 0,
            fbRing: 0,
            fbMaxR: maxRadius - (item.height * 0.5),
            fbMinR: item.height * 0.6
        };
    }

    function placeOne(itemIndex, deadlineMs) {
        var state;
        var item;
        var attempt;
        var ring;
        var ringDir;
        var radius;
        var maxAllowed;
        var angle;
        var x;
        var y;
        var halfW;
        var halfH;
        var candidate;
        var primaryHits;
        var fallbackRadius;
        var scanAngle;
        var fx;
        var fy;
        var fHalfW;
        var fHalfH;
        var fallback;
        var hits;

        if (!activePlacement || activePlacement.itemIndex !== itemIndex) {
            activePlacement = createPlacementState(itemIndex);
        }

        state = activePlacement;
        item = state.item;

        if (state.phase === 0) {
            if (itemIndex === 0) {
                halfW = item.width / 2;
                halfH = item.height / 2;
                if (insideCircle(center, center, halfW, halfH)) {
                    state.placedBox = {
                        cx: center,
                        cy: center,
                        left: center - halfW - collisionPadding,
                        right: center + halfW + collisionPadding,
                        top: center - halfH - collisionPadding,
                        bottom: center + halfH + collisionPadding
                    };
                }
            }
            state.phase = 1;
        }

        while (state.phase === 1 && state.attempt < maxAttempts && !state.placedBox) {
            attempt = state.attempt;
            state.attempt = state.attempt + 1;

            ring = Math.floor(attempt / 18);
            // 内外交互探索: ring 0→+0, 1→-1, 2→+1, 3→-2, 4→+2, ...
            ringDir = (ring % 2 === 0) ? Math.floor(ring / 2) : -Math.ceil(ring / 2);
            radius = item.radius + (ringDir * ringStep);
            if (radius < 0) radius = 0;

            maxAllowed = maxRadius - (item.height * 0.5);
            if (radius > maxAllowed) radius = maxAllowed;

            angle = state.baseAngle + (attempt * goldenAngle * 0.45);
            x = center + Math.cos(angle) * radius;
            y = center + Math.sin(angle) * radius;
            halfW = item.width / 2;
            halfH = item.height / 2;

            if (!insideCircle(x, y, halfW, halfH)) {
                if ((state.attempt % timeCheckStride) === 0 && advCloudNowMs() >= deadlineMs) return false;
                continue;
            }

            fillBox(tempCandidate, x, y, halfW, halfH);

            primaryHits = countHits(tempCandidate, 1, deadlineMs);
            if (primaryHits === -1) return false;
            if (primaryHits === 0) {
                state.placedBox = cloneBox(tempCandidate);
                break;
            }

            if ((state.attempt % timeCheckStride) === 0 && advCloudNowMs() >= deadlineMs) return false;
        }

        if (!state.placedBox && state.phase === 1) {
            state.phase = 2;
        }

        while (state.phase === 2 && state.fbRing < fallbackRingCount && state.bestHits > 0) {
            fallbackRadius = state.fbMaxR - (state.fbRing * ((state.fbMaxR - state.fbMinR) / (fallbackRingCount - 1)));
            if (fallbackRadius < state.fbMinR) fallbackRadius = state.fbMinR;

            while (state.scan < fallbackScanSteps) {
                fx = center + fallbackCosTable[state.scan] * fallbackRadius;
                fy = center + fallbackSinTable[state.scan] * fallbackRadius;
                state.scan = state.scan + 1;
                fHalfW = item.width / 2;
                fHalfH = item.height / 2;

                if (!insideCircle(fx, fy, fHalfW, fHalfH)) {
                    if ((state.scan % 8) === 0 && advCloudNowMs() >= deadlineMs) return false;
                    continue;
                }

                fillBox(tempCandidate, fx, fy, fHalfW, fHalfH);

                hits = countHits(tempCandidate, state.bestHits, deadlineMs);
                if (hits === -1) return false;
                if (hits < state.bestHits) {
                    state.bestHits = hits;
                    state.best = cloneBox(tempCandidate);
                    if (hits === 0) break;
                }

                if ((state.scan % 8) === 0 && advCloudNowMs() >= deadlineMs) return false;
            }

            if (state.bestHits === 0) break;
            state.scan = 0;
            state.fbRing = state.fbRing + 1;

            if (advCloudNowMs() >= deadlineMs) return false;
        }

        if (!state.placedBox) {
            if (state.best) {
                state.placedBox = state.best;
            } else {
                state.placedBox = {
                    cx: center,
                    cy: center,
                    left: center - (item.width / 2) - collisionPadding,
                    right: center + (item.width / 2) + collisionPadding,
                    top: center - (item.height / 2) - collisionPadding,
                    bottom: center + (item.height / 2) + collisionPadding
                };
            }
        }

        placed.push(state.placedBox);
        addBoxToGrid(state.placedBox);
        positions[itemIndex] = state.placedBox;
        activePlacement = null;
        return true;
    }

    function commitDom() {
        if (isCanceled()) return;

        var svg = document.createElementNS(svgNS, 'svg');
        var commitIdx = 0;
        var commitBudget = 6;

        svg.setAttribute('class', 'adv-job-cloud-svg');
        svg.setAttribute('viewBox', '0 ' + vbCropY + ' ' + vbSize + ' ' + vbHeight);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', '職業ワードクラウド');

        function commitBatch() {
            if (isCanceled()) return;
            var batchStart = advCloudNowMs();
            var batchDeadline = batchStart + commitBudget;

            while (commitIdx < items.length) {
                var ci = commitIdx;
                var cItem = items[ci];
                var placedBox = positions[ci];
                var text = document.createElementNS(svgNS, 'text');
                var title = document.createElementNS(svgNS, 'title');

                text.setAttribute('class', 'adv-job-word');
                text.setAttribute('x', Math.round(placedBox.cx * 10) / 10);
                text.setAttribute('y', Math.round(placedBox.cy * 10) / 10);
                text.setAttribute('font-size', cItem.size);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.style.transitionDelay = (ci * 16) + 'ms';

                title.appendChild(document.createTextNode(cItem.count + '名'));
                text.appendChild(title);
                text.appendChild(document.createTextNode(cItem.label));
                svg.appendChild(text);

                commitIdx++;
                if (advCloudNowMs() >= batchDeadline) break;
            }

            if (commitIdx < items.length) {
                advCloudScheduleTask(commitBatch);
                return;
            }

            if (isCanceled()) return;
            cloudEl.appendChild(svg);

            // haloアニメーションを再開
            if (haloEl) haloEl.style.animationPlayState = '';

            if (typeof onDone === 'function') onDone();
        }

        commitBatch();
    }

    function runChunk() {
        var start;
        var budget;
        var deadlineMs;
        var completed;

        if (isCanceled()) return;

        start = advCloudNowMs();
        // 初回フレームはCSSトランジション開始と競合するため軽量に、以降はフル予算
        budget = chunkCount < chunkRampFrames ? chunkBudgetInit : chunkBudgetFull;
        chunkCount = chunkCount + 1;
        deadlineMs = start + budget;

        var wordsThisChunk = 0;
        var maxWordsInit = 2;

        while (index < items.length) {
            completed = placeOne(index, deadlineMs);
            if (!completed) break;
            index = index + 1;
            wordsThisChunk++;

            // 初回ランプアップ中は1チャンクの配置数を制限しovershootを防止
            if (chunkCount <= chunkRampFrames && wordsThisChunk >= maxWordsInit) break;
            if (advCloudNowMs() >= deadlineMs) break;
        }

        if (isCanceled()) return;

        if (index < items.length) {
            advCloudScheduleTask(runChunk);
            return;
        }

        // DOM挿入を次フレームに分離し、最終チャンクとの同一フレーム競合を回避
        advCloudScheduleTask(commitDom);
    }

    advCloudScheduleTask(runChunk);
}

function renderJobWordCloud(summary) {
    var cloudEl = document.getElementById('adv-job-cloud');
    if (!cloudEl) return;

    advCloudRenderToken = advCloudRenderToken + 1;
    advCloudCancelScheduledTask();
    var renderToken = advCloudRenderToken;

    // 前回のSVGレンダーでpausedされたhaloを確実に復帰させる
    var prevHalo = cloudEl.parentElement ? cloudEl.parentElement.querySelector('.adv-cloud-halo') : null;
    if (prevHalo) prevHalo.style.animationPlayState = '';

    var useFlowLayout = isFlowJobCloudLayout();

    cloudEl.innerHTML = '';
    cloudEl.classList.remove('is-reveal');
    cloudEl.classList.remove('is-flow');

    if (!summary.topJobs.length) {
        cloudEl.innerHTML = '<span class="adv-job-empty">職業データを準備中です。</span>';
        advCloudLayoutMode = useFlowLayout ? 'flow' : 'svg';
        if (renderToken === advCloudRenderToken) {
            dispatchJobCloudRendered(cloudEl);
        }
        return;
    }

    var limit = summary.topJobs.length > 100 ? 100 : summary.topJobs.length;
    var maxCount = summary.topJobs[0].count;
    var minCount = summary.topJobs[limit - 1].count;
    var range = maxCount - minCount;
    var crowdScale = 1;

    if (limit > 80) crowdScale = 0.74;
    else if (limit > 60) crowdScale = 0.82;
    else if (limit > 40) crowdScale = 0.90;

    var minSize = Math.round(24 * crowdScale * 10) / 10;
    var maxSize = Math.round(58 * crowdScale * 10) / 10;

    if (useFlowLayout) {
        minSize = Math.round(minSize * 0.82 * 10) / 10;
        maxSize = Math.round(maxSize * 0.82 * 10) / 10;
    }

    var outerRadius = 548;
    var safeInset = 20;
    var maxRadius = outerRadius - safeInset;
    var items = [];
    var i;

    for (i = 0; i < limit; i++) {
        var job = summary.topJobs[i];
        var size = range > 0
            ? minSize + ((job.count - minCount) / range) * (maxSize - minSize)
            : (minSize + maxSize) / 2;

        var label = formatJobLabel(job.job);
        var width = estimateLabelWidth(label, size);
        var height = size * 1.1;
        var maxTextWidth = (maxRadius * 2) - 12;

        if (!useFlowLayout && width > maxTextWidth) {
            var shrink = maxTextWidth / width;
            size = Math.max(minSize * 0.78, size * shrink);
            width = estimateLabelWidth(label, size);
            height = size * 1.1;
        }

        var rankRatio = limit > 1 ? (i / (limit - 1)) : 0;
        var targetRadius = Math.pow(rankRatio, 0.88) * (maxRadius - 34);

        if (limit === 1) targetRadius = 0;
        if (limit === 2 && i === 0) targetRadius = 0;
        if (limit === 2 && i === 1) targetRadius = maxRadius * 0.58;

        items.push({
            label: label,
            count: job.count,
            size: Math.round(size * 10) / 10,
            width: width,
            height: height,
            radius: targetRadius
        });
    }

    if (useFlowLayout) {
        renderJobWordCloudFlow(cloudEl, items);
        advCloudLayoutMode = 'flow';
        if (renderToken === advCloudRenderToken) {
            dispatchJobCloudRendered(cloudEl);
        }
        return;
    }

    advCloudLayoutMode = 'svg';
    renderJobWordCloudSvg(cloudEl, items, renderToken, function () {
        if (renderToken !== advCloudRenderToken) return;
        dispatchJobCloudRendered(cloudEl);
    });
}

var rankNameMap = { 1: 'F', 2: 'E', 3: 'D', 4: 'C', 5: 'B', 6: 'A' };

function renderRankBars(summary) {
    var barsEl = document.getElementById('adv-rank-bars');
    if (!barsEl) return;

    barsEl.classList.remove('is-ready');
    barsEl.innerHTML = '';

    var rankOrder = [6, 5, 4, 3, 2, 1];
    var i;
    for (i = 0; i < rankOrder.length; i++) {
        var rank = rankOrder[i];
        var label = rankNameMap[rank] || rank;
        var count = summary.rankCounts[rank] || 0;
        if (count === 0) continue;
        var width = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
        var row = document.createElement('div');
        row.className = 'adv-rank-item';
        row.innerHTML =
            '<span class="adv-rank-label">' + label + 'ランク</span>' +
            '<div class="adv-rank-track"><div class="adv-rank-fill" style="--rank-width: ' + width + '%;"></div></div>' +
            '<span class="adv-rank-value">' + count + '名</span>';
        barsEl.appendChild(row);
    }

    setTimeout(function () {
        barsEl.classList.add('is-ready');
    }, 200);
}

function renderAdventurerStyleSection(summary) {
    var copyEl = document.getElementById('adv-beginner-copy');
    var jobCountEl = document.getElementById('adv-style-job-count');

    advCloudLatestSummary = summary;
    renderJobWordCloud(summary);
    renderRankBars(summary);

    if (jobCountEl) {
        jobCountEl.textContent = summary.uniqueJobs;
    }

    if (copyEl) {
        copyEl.innerHTML =
            'ランクE～Fの初級冒険者が<br class="sp-only">' + toSafeInt(summary.beginnerRatio) + '%を占めています。<br class="sp-only">初参加の方も<br class="sp-only">馴染みやすい雰囲気です。';
    }
}

function hideAdventurerDataSections() {
    var ids = ['adventurer-proof', 'adventurer-style'];
    var i;
    for (i = 0; i < ids.length; i++) {
        var section = document.getElementById(ids[i]);
        if (section) section.style.display = 'none';
    }
    updateSectionBackgrounds();
}

function loadAdventurerDataSummary() {
    if (adventurerDataPromise) return adventurerDataPromise;

    adventurerDataPromise = fetch(adventurerDataUrl)
        .then(function (response) {
            if (!response.ok) {
                throw new Error('adventurer data fetch failed');
            }
            return response.json();
        })
        .then(function (json) {
            if (Object.prototype.toString.call(json) !== '[object Array]') {
                throw new Error('invalid data format');
            }
            return aggregateAdventurerData(json);
        });

    return adventurerDataPromise;
}

function startAdventurerDataLoad() {
    if (adventurerDataRequested) return;
    adventurerDataRequested = true;

    loadAdventurerDataSummary()
        .then(function (summary) {
            // データ集計→KPI/グラフ→ワードクラウドを3フレームに分散
            var step1 = function () {
                renderAdventurerProofSection(summary);
                if (window.requestAnimationFrame) {
                    requestAnimationFrame(function () {
                        renderAdventurerStyleSection(summary);
                    });
                } else {
                    renderAdventurerStyleSection(summary);
                }
            };
            if (window.requestAnimationFrame) {
                requestAnimationFrame(step1);
            } else {
                step1();
            }
        })
        .catch(function () {
            hideAdventurerDataSections();
        });
}

function initAdventurerDataLazyLoad() {
    var trigger = document.getElementById('adventurer-proof');
    if (!trigger) return;

    // fetch/Promise が利用不可の環境ではセクションを非表示にする
    if (typeof window.fetch !== 'function' || typeof window.Promise !== 'function') {
        hideAdventurerDataSections();
        return;
    }

    if ('IntersectionObserver' in window) {
        var dataObserver = new IntersectionObserver(function (entries) {
            var i;
            for (i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    startAdventurerDataLoad();
                    dataObserver.unobserve(entries[i].target);
                }
            }
        }, {
            threshold: 0.01,
            rootMargin: '280px 0px'
        });
        dataObserver.observe(trigger);
    } else {
        startAdventurerDataLoad();
    }
}

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
initAdventurerDataLazyLoad();

// --- Word Cloud Resize Mode Switch ---
(function initJobCloudResizeSwitch() {
    function rerenderWhenModeChanges() {
        if (!advCloudLatestSummary) return;
        var nextMode = isFlowJobCloudLayout() ? 'flow' : 'svg';
        if (nextMode !== advCloudLayoutMode) {
            renderJobWordCloud(advCloudLatestSummary);
        }
    }

    function onResize() {
        if (advCloudResizeTimer) clearTimeout(advCloudResizeTimer);
        advCloudResizeTimer = setTimeout(function () {
            advCloudResizeTimer = null;
            rerenderWhenModeChanges();
        }, 140);
    }

    if (window.addEventListener) {
        window.addEventListener('resize', onResize);
    } else if (window.attachEvent) {
        window.attachEvent('onresize', onResize);
    }
})();

// --- IntersectionObserver Feature Check ---
if ('IntersectionObserver' in window) {
    // --- Scroll Animations ---
    var fadeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var target = entry.target;
                enqueueUiMutation(function () {
                    target.classList.add('visible');
                });
                fadeObserver.unobserve(target);
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

    // --- Sticky Navigation & Back to Top ---
    var nav = document.getElementById('nav');
    var hero = document.getElementById('hero');
    var backToTop = document.getElementById('back-to-top');

    var navObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var isOut = !entry.isIntersecting;
            enqueueUiMutation(function () {
                if (isOut) {
                    nav.classList.add('visible');
                    backToTop.classList.add('visible');
                } else {
                    nav.classList.remove('visible');
                    backToTop.classList.remove('visible');
                }
            });
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

// --- Adventurer Style Motion Triggers ---
(function () {
    var section = document.getElementById('adventurer-style');
    var cloud = document.getElementById('adv-job-cloud');
    var bars = document.getElementById('adv-rank-bars');
    if (!section) return;

    function applyOrders() {
        var ranks = section.querySelectorAll('.adv-rank-item');
        var i;
        for (i = 0; i < ranks.length; i++) {
            ranks[i].style.setProperty('--rank-order', i);
        }
    }

    function clearStaggerDelays(el) {
        var words = el.querySelectorAll('.adv-job-word');
        var wi;
        for (wi = 0; wi < words.length; wi++) {
            words[wi].style.transitionDelay = '';
        }
    }

    function replayReveal(el) {
        if (!el) return;

        // 前回のクリアタイマーをキャンセル（リサイズ等での再呼び出し時の競合防止）
        if (el._advClearDelayTimer) {
            clearTimeout(el._advClearDelayTimer);
            el._advClearDelayTimer = null;
        }

        el.classList.remove('is-reveal');
        // レイヤ昇格を事前に行い、transition開始時のPaint準備コストを分散
        el.classList.add('is-prep');

        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    el.classList.remove('is-prep');
                    el.classList.add('is-reveal');
                });
            });
        } else {
            setTimeout(function () {
                el.classList.remove('is-prep');
                el.classList.add('is-reveal');
            }, 34);
        }

        // リビール完了後に transitionDelay をクリア（ホバー応答が遅延しないように）
        var words = el.querySelectorAll('.adv-job-word');
        var maxDelay = 0;
        var di;
        for (di = 0; di < words.length; di++) {
            var d = parseFloat(words[di].style.transitionDelay) || 0;
            if (d > maxDelay) maxDelay = d;
        }
        el._advClearDelayTimer = setTimeout(function () {
            el._advClearDelayTimer = null;
            clearStaggerDelays(el);
        }, maxDelay + 500);
    }

    if ('IntersectionObserver' in window) {
        var sectionObserver = new IntersectionObserver(function (entries) {
            var i;
            for (i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    sectionObserver.unobserve(section);
                    enqueueUiMutation(function () {
                        section.classList.add('is-active');
                        // データが先にロード済みなら reveal をトリガー
                        if (cloud && cloud.querySelectorAll('.adv-job-word').length > 0) {
                            replayReveal(cloud);
                        }
                        if (bars && bars.querySelectorAll('.adv-rank-item').length > 0) {
                            applyOrders();
                            replayReveal(bars);
                        }
                    });
                    break;
                }
            }
        }, { threshold: 0.2 });
        sectionObserver.observe(section);
    } else {
        section.classList.add('is-active');
    }

    // Cloud: カスタムイベントで reveal（MutationObserver 不要）
    if (cloud) {
        cloud.addEventListener('adv-cloud-rendered', function () {
            if (section.classList.contains('is-active')) {
                replayReveal(cloud);
            }
        });
    }

    // Bars: MutationObserver で reveal
    if (bars && 'MutationObserver' in window) {
        var barsObserver = new MutationObserver(function () {
            applyOrders();
            if (section.classList.contains('is-active')) {
                replayReveal(bars);
            }
        });
        barsObserver.observe(bars, { childList: true });
    } else if (bars) {
        var fallbackTimer = setInterval(function () {
            var hasRanks = bars.querySelectorAll('.adv-rank-item').length > 0;
            var renderDone = bars.classList.contains('is-ready');
            if (hasRanks || renderDone) {
                clearInterval(fallbackTimer);
                applyOrders();
                bars.classList.add('is-reveal');
            }
        }, 200);
    }

    applyOrders();
})();
