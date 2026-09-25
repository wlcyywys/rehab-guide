/* 肘关节松解术后康复指导 · 渲染脚本
 * 数据唯一来源：content/rehab-data.json（http/https 下用 fetch 读取）。
 * 本地双击 index.html（file://）时 fetch 会失败，自动改为加载 content/rehab-data.js 回退。
 * 不设置 Cookie，不收集任何信息；localStorage 只记住字号偏好。
 */
(function () {
  'use strict';

  var FONT_KEY = 'rehab-font-size';
  var FONT_SIZES = [
    { id: 'm', label: 'A', name: '标准字号' },
    { id: 'l', label: 'A+', name: '大字号' },
    { id: 'xl', label: 'A++', name: '超大字号' }
  ];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 次数、组数、秒数、周数、角度等数字加粗
  var NUM_RE = /\d+(?:[–\-~]\d+)?(?:\s*(?:°|秒|分钟|次|遍|轮|组|周|个月|kg))?(?:×\d+(?:[–\-~]\d+)?(?:\s*(?:次|秒|组))?)?/g;
  function rich(s) {
    return esc(s).replace(NUM_RE, function (m) { return '<b>' + m + '</b>'; });
  }

  function listHtml(items, cls) {
    return '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' +
      items.map(function (t) { return '<li>' + rich(t) + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- 字号切换 ---------- */
  function currentFont() { return document.documentElement.getAttribute('data-font') || 'm'; }

  function setFont(id) {
    if (id === 'm') document.documentElement.removeAttribute('data-font');
    else document.documentElement.setAttribute('data-font', id);
    try { localStorage.setItem(FONT_KEY, id); } catch (e) { /* 隐私模式等情况忽略 */ }
    var btns = document.querySelectorAll('.font-switch button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-size') === id));
    }
  }

  function initFontSwitch() {
    var boxes = document.querySelectorAll('.font-switch');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = FONT_SIZES.map(function (f) {
        return '<button type="button" data-size="' + f.id + '" aria-pressed="' + (currentFont() === f.id) + '">' +
          f.label + '<span class="sr-only">（' + f.name + '）</span></button>';
      }).join('');
      boxes[i].addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-size]');
        if (b) setFont(b.getAttribute('data-size'));
      });
    }
  }

  /* ---------- 数据读取 ---------- */
  function loadScriptFallback() {
    return new Promise(function (resolve, reject) {
      if (window.REHAB_DATA) return resolve(window.REHAB_DATA);
      var s = document.createElement('script');
      s.src = 'content/rehab-data.js';
      s.onload = function () { window.REHAB_DATA ? resolve(window.REHAB_DATA) : reject(new Error('no data')); };
      s.onerror = function () { reject(new Error('数据加载失败')); };
      document.head.appendChild(s);
    });
  }

  function loadData() {
    if (location.protocol === 'file:' || !window.fetch) return loadScriptFallback();
    return fetch('content/rehab-data.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(loadScriptFallback);
  }

  /* ---------- 视频：进入视口才加载、播放；离开视口暂停 ---------- */
  function videoBox(src, label) {
    return '<div class="video-box is-paused">' +
      '<video muted loop playsinline webkit-playsinline x5-playsinline preload="none" ' +
      (reduceMotion ? '' : 'autoplay ') +
      'data-src="' + esc(src) + '" aria-label="' + esc(label) + '"></video>' +
      '<button type="button" class="play-toggle" aria-label="播放：' + esc(label) + '">' +
      '<span class="play-icon" aria-hidden="true">▶</span></button></div>';
  }

  function syncState(box, video, label) {
    var paused = video.paused;
    box.classList.toggle('is-paused', paused);
    box.querySelector('.play-toggle').setAttribute('aria-label', (paused ? '播放：' : '暂停：') + label);
  }

  function ensureSrc(video) {
    if (!video.getAttribute('src') && video.getAttribute('data-src')) {
      video.preload = 'metadata';
      video.src = video.getAttribute('data-src');
    }
  }

  function tryPlay(video) {
    ensureSrc(video);
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* 自动播放被拦截：保留播放按钮 */ });
  }

  function initVideos(root) {
    var boxes = (root || document).querySelectorAll('.video-box');
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) {
            ensureSrc(v);
            if (!reduceMotion && !v._userPaused) tryPlay(v);
          } else if (!v.paused) {
            v.pause();
          }
        });
      }, { rootMargin: '200px 0px', threshold: 0.25 });
    }
    Array.prototype.forEach.call(boxes, function (box) {
      var v = box.querySelector('video');
      var label = v.getAttribute('aria-label');
      v.muted = true;
      v.addEventListener('play', function () { syncState(box, v, label); });
      v.addEventListener('pause', function () { syncState(box, v, label); });
      box.querySelector('.play-toggle').addEventListener('click', function () {
        if (v.paused) { v._userPaused = false; tryPlay(v); }
        else { v._userPaused = true; v.pause(); }
      });
      if (io) io.observe(v);
      else { ensureSrc(v); if (!reduceMotion) tryPlay(v); }
    });
  }

  /* ---------- 首页 ---------- */
  // 周数条刻度：0 / 2 / 6 / 12 周 / 6 个月；非等比刻度，放大早期几周以看清阶段重叠
  var AXIS = [0, 2, 6, 12, 26];
  var AXIS_POS = [0, 18, 38, 60, 100];
  var AXIS_LABELS = ['0', '2周', '6周', '12周', '6个月+'];

  function axisPos(w) {
    if (w <= AXIS[0]) return 0;
    for (var i = 1; i < AXIS.length; i++) {
      if (w <= AXIS[i]) {
        return AXIS_POS[i - 1] + (w - AXIS[i - 1]) / (AXIS[i] - AXIS[i - 1]) * (AXIS_POS[i] - AXIS_POS[i - 1]);
      }
    }
    return 100;
  }

  function spanBar(weeks) {
    if (!weeks) return '';
    var a = axisPos(weeks.from), b = axisPos(weeks.to);
    return '<div class="span-bar" aria-hidden="true"><div class="span-track">' +
      '<div class="span-fill' + (weeks.open ? ' open' : '') + '" style="left:' + a.toFixed(1) + '%;width:' + Math.max(b - a, 3).toFixed(1) + '%"></div></div>' +
      '<div class="span-ticks">' + AXIS.map(function (w, i) {
        return '<span style="left:' + axisPos(w).toFixed(1) + '%">' + AXIS_LABELS[i] + '</span>';
      }).join('') + '</div></div>';
  }

  // “我是术后第几周？”：只在页面上高亮，不存储
  var WEEK_CHOICES = [
    { id: 'w0', label: '第0–2周', stages: [1],
      text: '建议查看<b>第1阶段</b>。洗漱、吃饭等轻巧日常（第4阶段动作19）可按耐受逐步恢复。' },
    { id: 'w2', label: '第2–6周', stages: [2],
      text: '建议查看<b>第2阶段</b>，并继续第1阶段动作。约4–6周经医生评估后，可能开始第3阶段。' },
    { id: 'w4', label: '第4–12周', stages: [3],
      text: '建议查看<b>第3阶段</b>（医生允许后才开始抗阻）；活动度练习仍需每天继续。约6–8周起医生允许后，可逐步恢复提物与家务（第4阶段）。' },
    { id: 'w12', label: '3个月以上', stages: [4],
      text: '建议查看<b>第4阶段</b>。重体力、持拍与投掷通常约3–6个月或更晚，由医生评估放行。' }
  ];

  function renderHome(data) {
    var doc = data.doctor || {};
    var docBox = $('#doctor-info');
    if (docBox) {
      docBox.innerHTML = '<h2>医生 / 医院信息</h2><dl>' +
        [['医生', doc.name], ['医院/科室', doc.clinic], ['复诊/咨询', doc.contact]]
          .filter(function (r) { return r[1]; })
          .map(function (r) { return '<div class="row"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; })
          .join('') + '</dl>';
    }
    var scope = $('#scope');
    if (scope && data.applicable) scope.textContent = data.applicable;

    var tl = $('#timeline');
    if (tl) {
      tl.innerHTML = data.stages.map(function (s) {
        return '<li id="tl-stage' + s.id + '" data-stage="' + s.id + '">' +
          '<span class="dot" aria-hidden="true">' + CIRCLED[s.id - 1] + '</span>' +
          '<a class="stage-card" href="stage' + s.id + '.html">' +
          '<span class="label">第' + s.id + '阶段<span class="rec-badge">推荐</span></span>' +
          '<h3>' + esc(s.name) + '</h3>' +
          '<span class="time-tag">' + esc(s.time) + '</span>' +
          '<p>' + esc(s.timeNote) + '</p>' +
          spanBar(s.weeks) +
          '<span class="go">查看 ' + s.moves.length + ' 个动作 ›</span></a></li>';
      }).join('');
    }

    var picker = $('#week-choices');
    if (picker) {
      picker.innerHTML = WEEK_CHOICES.map(function (c) {
        return '<button type="button" data-choice="' + c.id + '" aria-pressed="false">' + c.label + '</button>';
      }).join('');
      picker.addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-choice]');
        if (!b) return;
        var c = WEEK_CHOICES.filter(function (x) { return x.id === b.getAttribute('data-choice'); })[0];
        Array.prototype.forEach.call(picker.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        Array.prototype.forEach.call(document.querySelectorAll('#timeline > li'), function (li) {
          li.classList.toggle('is-recommended', c.stages.indexOf(Number(li.getAttribute('data-stage'))) !== -1);
        });
        var s = c.stages[0];
        $('#week-result').innerHTML = c.text + ' <a href="stage' + s + '.html">进入第' + s + '阶段 ›</a>' +
          '<br><span class="week-hint">到时间不等于自动放行，以医生评估为准。</span>';
      });
    }

    // 危险信号：取自动作23
    var warn = null;
    data.stages.forEach(function (s) {
      s.moves.forEach(function (m) { if (m.warning) warn = { stage: s.id, move: m }; });
    });
    var danger = $('#danger');
    if (danger && warn) {
      danger.innerHTML = '<h2><span class="icon" aria-hidden="true">!</span>' + esc(warn.move.name) + '</h2>' +
        '<ul>' + warn.move.points.map(function (p) {
          var i = p.lastIndexOf('：');
          return i > 0 ? '<li>' + esc(p.slice(0, i + 1)) + '<span class="level">' + esc(p.slice(i + 1)) + '</span></li>'
            : '<li>' + esc(p) + '</li>';
        }).join('') + '</ul>' +
        '<p><a href="stage' + warn.stage + '.html#move' + warn.move.no + '">查看动作' + warn.move.no + '详情 ›</a></p>';
    }
  }

  /* ---------- 阶段页 ---------- */
  function renderStage(data, id) {
    var s = data.stages.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    $('#stage-title').textContent = s.name;
    $('#stage-time').textContent = s.time + '｜' + s.timeNote;
    document.title = '第' + s.id + '阶段 ' + s.name + ' · 肘关节松解术后康复指导';

    var html = '';
    html += '<section class="intro" aria-label="阶段说明">' + listHtml(s.intro) + '</section>';
    html += '<h2 class="section-title">本阶段动作（' + s.moves.length + '个）</h2>';
    html += '<p class="video-tip">视频静音循环播放；点一下视频可暂停 / 继续。</p>';
    html += '<ol class="moves">' + s.moves.map(function (m) {
      var label = '动作' + m.no + ' ' + m.name;
      return '<li class="move' + (m.warning ? ' is-warning' : '') + '" id="move' + m.no + '">' +
        '<div class="move-head"><h3><span class="move-no">' + esc(m.no) + '</span><span>' + esc(m.name) + '</span></h3>' +
        '<span class="time-tag"><span class="sr-only">开始时间：</span>' + esc(m.when) + '</span></div>' +
        '<div class="video-wrap">' + videoBox(m.video, label + ' 示范视频') + '</div>' +
        listHtml(m.points, 'points') + '</li>';
    }).join('') + '</ol>';

    if (s.cautions && s.cautions.length) {
      html += '<section class="cautions"><h2>⚠ 本阶段注意事项</h2>' + listHtml(s.cautions) + '</section>';
    }
    if (s.doctorForm && s.doctorForm.length) {
      html += '<section class="card doctor-form"><h2>医生填写</h2>' +
        '<p class="note">由医生在复诊时填写或口头告知；本页面不收集任何信息。</p>' +
        '<ul>' + s.doctorForm.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>';
    }

    var box = $('#stage-content');
    box.innerHTML = html;
    initVideos(box);

    // 从首页危险信号链接跳转时，内容渲染后再定位
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  /* ---------- 二维码页 ---------- */
  function renderQr(data) {
    var doc = data.doctor || {};
    var box = $('#qr-doctor');
    if (box) {
      box.innerHTML = '<dl>' + [['医生', doc.name], ['医院/科室', doc.clinic], ['复诊/咨询', doc.contact]]
        .filter(function (r) { return r[1]; })
        .map(function (r) { return '<div class="row"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; })
        .join('') + '</dl>';
    }
    var pb = $('#print-btn');
    if (pb) { pb.hidden = false; pb.addEventListener('click', function () { window.print(); }); }
  }

  /* ---------- 启动 ---------- */
  function showError() {
    var el = $('#load-error');
    if (el) el.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFontSwitch();
    initVideos(document); // 首页、阶段页上静态存在的视频（如有）
    var page = document.body.getAttribute('data-page');
    loadData().then(function (data) {
      if (page === 'home') renderHome(data);
      else if (page === 'stage') renderStage(data, Number(document.body.getAttribute('data-stage')));
      else if (page === 'qr') renderQr(data);
    }).catch(showError);
  });
})();
