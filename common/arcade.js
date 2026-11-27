/* 미니 게임 오락실 공통 모듈
 * - Arcade.play(name, ...args): WebAudio로 합성한 효과음 (파일 없이 동작)
 * - Arcade.muted / Arcade.toggleMute(): 전 게임 공통 음소거 (localStorage 'arcade.muted')
 * - Arcade.record(key, value, lowerIsBetter): 최고기록 저장, 새 기록이면 true
 * - 페이지의 .card 안에 "소리" 토글 버튼을 자동으로 붙이고, M 키로도 끌 수 있음
 * - manifest·아이콘 링크를 넣고 서비스워커를 등록해 앱처럼 설치/오프라인 실행 */
(function () {
  'use strict';
  var script = document.currentScript;
  var base = new URL('../', script ? script.src : location.href);
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var muted = store.get('arcade.muted') === '1';
  var ac = null, master = null, noiseBuf = null, lastPlay = {};

  function init() {
    if (ac) return ac;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    return ac;
  }
  function unlock() { if (init() && ac.state === 'suspended') ac.resume(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    addEventListener(ev, unlock, { capture: true, passive: true });
  });

  function tone(o) {
    var t = ac.currentTime + (o.delay || 0), d = o.d || 0.12;
    var osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.v || 0.15, t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + d + 0.02);
  }
  function noise(o) {
    var t = ac.currentTime + (o.delay || 0), d = o.d || 0.2;
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + d);
    g.gain.setValueAtTime(o.v || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
  }
  function arp(notes, step, o) { notes.forEach(function (f, i) { tone(Object.assign({ f: f, d: 0.12, v: 0.1, type: 'triangle', delay: i * step }, o || {})); }); }

  var LIB = {
    click: function () { tone({ f: 700, d: 0.05, v: 0.08, type: 'triangle' }); },
    select: function () { tone({ f: 880, d: 0.05, v: 0.08, type: 'sine' }); },
    jump: function () { tone({ f: 280, f2: 720, d: 0.16, v: 0.1, type: 'square' }); },
    jump2: function () { tone({ f: 420, f2: 1100, d: 0.14, v: 0.09, type: 'square' }); },
    coin: function () { tone({ f: 988, d: 0.06, v: 0.09 }); tone({ f: 1319, d: 0.14, v: 0.09, delay: 0.06 }); },
    shoot: function () { tone({ f: 1100, f2: 380, d: 0.05, v: 0.035, type: 'square' }); },
    hit: function () { noise({ d: 0.07, v: 0.22, f: 2600 }); tone({ f: 240, f2: 120, d: 0.07, v: 0.08, type: 'square' }); },
    crit: function () { noise({ d: 0.1, v: 0.3, f: 4000 }); tone({ f: 520, f2: 180, d: 0.12, v: 0.1, type: 'sawtooth' }); },
    slash: function () { noise({ d: 0.12, v: 0.18, f: 2200, f2: 500, type: 'bandpass', q: 1.5 }); },
    hurt: function () { tone({ f: 220, f2: 70, d: 0.28, v: 0.14, type: 'sawtooth' }); },
    boom: function (big) { noise({ d: big ? 0.8 : 0.4, v: big ? 0.5 : 0.35, f: 1200, f2: 80 }); tone({ f: 90, f2: 40, d: big ? 0.6 : 0.3, v: 0.2, type: 'sine' }); },
    power: function () { arp([523, 659, 784, 1047], 0.055, { type: 'square', v: 0.07 }); },
    pop: function () { tone({ f: 420, f2: 1250, d: 0.09, v: 0.16, type: 'sine' }); },
    crack: function () { noise({ d: 0.14, v: 0.3, f: 3500, type: 'highpass' }); tone({ f: 160, f2: 90, d: 0.1, v: 0.08, type: 'triangle' }); },
    splat: function () { noise({ d: 0.25, v: 0.35, f: 700, f2: 150 }); },
    merge: function (n) { var f = 260 * Math.pow(1.122, n || 0); tone({ f: f, f2: f * 1.5, d: 0.14, v: 0.16, type: 'sine' }); tone({ f: f * 2, d: 0.08, v: 0.05, type: 'triangle', delay: 0.04 }); },
    place: function () { tone({ f: 190, d: 0.06, v: 0.2, type: 'triangle' }); noise({ d: 0.04, v: 0.14, f: 5000, type: 'highpass' }); },
    swap: function () { tone({ f: 600, f2: 900, d: 0.07, v: 0.09, type: 'sine' }); },
    bad: function () { tone({ f: 300, f2: 200, d: 0.12, v: 0.08, type: 'square' }); },
    line: function (n) { var s = [523, 659, 784, 1047, 1319]; arp(s.slice(0, Math.min(5, (n || 1) + 1)), 0.05, { type: 'square', v: 0.07 }); },
    combo: function (n) { var f = 500 + Math.min(10, n || 1) * 60; tone({ f: f, d: 0.08, v: 0.09, type: 'triangle' }); tone({ f: f * 1.5, d: 0.1, v: 0.07, type: 'triangle', delay: 0.05 }); },
    bounce: function (k) { tone({ f: 380 * (k || 1), d: 0.035, v: 0.08, type: 'square' }); },
    thud: function () { tone({ f: 120, f2: 60, d: 0.1, v: 0.2, type: 'sine' }); noise({ d: 0.05, v: 0.1, f: 600 }); },
    zap: function () { tone({ f: 1600, f2: 220, d: 0.12, v: 0.06, type: 'sawtooth' }); },
    freeze: function () { tone({ f: 1800, f2: 900, d: 0.18, v: 0.05, type: 'sine' }); tone({ f: 2400, f2: 1200, d: 0.14, v: 0.04, type: 'sine', delay: 0.03 }); },
    build: function () { tone({ f: 220, d: 0.05, v: 0.14, type: 'square' }); tone({ f: 330, d: 0.08, v: 0.12, type: 'square', delay: 0.06 }); },
    alert: function () { tone({ f: 880, d: 0.08, v: 0.08, type: 'square' }); tone({ f: 880, d: 0.08, v: 0.08, type: 'square', delay: 0.14 }); },
    count: function () { tone({ f: 660, d: 0.12, v: 0.1, type: 'square' }); },
    go: function () { tone({ f: 1320, d: 0.3, v: 0.1, type: 'square' }); },
    goal: function () { arp([784, 988, 1175, 1568], 0.07, { type: 'square', v: 0.08, d: 0.16 }); },
    win: function () { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.09, { type: 'square', v: 0.08, d: 0.16 }); },
    lose: function () { arp([392, 330, 262, 196], 0.16, { type: 'triangle', v: 0.12, d: 0.22 }); },
    level: function () { arp([659, 784, 988, 1319], 0.07, { type: 'triangle', v: 0.1, d: 0.15 }); },
    tick: function () { tone({ f: 1500, d: 0.02, v: 0.04, type: 'square' }); },
    whoosh: function () { noise({ d: 0.18, v: 0.12, f: 400, f2: 2400, type: 'bandpass', q: 0.7 }); },
    siren: function () { tone({ f: 640, f2: 980, d: 0.32, v: 0.045, type: 'triangle' }); tone({ f: 980, f2: 640, d: 0.32, v: 0.045, type: 'triangle', delay: 0.34 }); },
    cluck: function () { tone({ f: 700, f2: 500, d: 0.05, v: 0.06, type: 'square' }); tone({ f: 900, f2: 600, d: 0.05, v: 0.05, type: 'square', delay: 0.06 }); }
  };

  function play(name) {
    if (muted || !LIB[name] || !init()) return;
    if (ac.state === 'suspended') ac.resume();
    var now = ac.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < 0.03) return;
    lastPlay[name] = now;
    try { LIB[name].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) {}
  }

  var buttons = [];
  function label() { return muted ? '소리 꺼짐' : '소리 켜짐'; }
  function setMuted(m) {
    muted = !!m; store.set('arcade.muted', muted ? '1' : '0');
    buttons.forEach(function (b) { b.textContent = label(); b.setAttribute('aria-pressed', String(!muted)); });
    if (!muted) play('click');
  }
  function addButtons() {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].querySelector('.arcade-mute')) continue;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'arcade-mute'; b.textContent = label(); b.setAttribute('aria-pressed', String(!muted));
      b.style.cssText = 'display:block;margin:14px auto 0;font:inherit;font-size:15px;border:0;border-radius:10px;padding:8px 14px;min-height:40px;background:rgba(0,0,0,.07);color:inherit;cursor:pointer';
      b.addEventListener('click', function (e) { e.stopPropagation(); setMuted(!muted); });
      cards[i].appendChild(b); buttons.push(b);
    }
  }
  addEventListener('keydown', function (e) {
    if (e.code === 'KeyM' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) setMuted(!muted);
  });

  function record(key, value, lowerIsBetter) {
    var old = parseFloat(store.get(key));
    var better = isNaN(old) || (lowerIsBetter ? value < old : value > old);
    if (better) store.set(key, String(value));
    return better;
  }
  function best(key) { var v = parseFloat(store.get(key)); return isNaN(v) ? null : v; }

  /* 게임 데이터(data.json) 불러오기: Arcade.boot(function (D) { ...게임 코드... })
   * 같은 폴더의 data.json을 읽어 게임에 넘긴다. 못 읽으면 화면에 다시 시도 버튼을 띄운다. */
  function boot(fn, url) {
    url = url || 'data.json';
    var box = null;
    function fail(err, code) {
      if (!box) {
        box = document.createElement('div');
        box.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:rgba(10,14,30,.85);color:#fff;font:17px/1.5 Jua,system-ui,sans-serif;text-align:center;padding:24px';
        box.innerHTML = '<div><p style="font-size:22px;margin:0 0 8px">게임 데이터를 불러오지 못했어요</p><p style="margin:0 0 16px;opacity:.8">인터넷 연결을 확인하고 다시 시도해 주세요.</p><button type="button" style="font:inherit;font-size:19px;border:0;border-radius:12px;padding:10px 24px;background:#ffcf3f;color:#3b2a00;cursor:pointer">다시 시도</button></div>';
        if (code) {
          box.querySelector('p').textContent = '게임을 시작하지 못했어요';
          box.querySelector('p+p').textContent = /webgl/i.test(String(err && err.message)) ? '이 기기나 브라우저에서 3D 그래픽(WebGL)을 쓸 수 없어요. 다른 브라우저로 열어 보세요.' : '새 버전으로 바뀌는 중일 수 있어요. 다시 시도를 눌러 주세요.';
          var small = document.createElement('p'); small.style.cssText = 'margin:12px 0 0;font-size:12px;opacity:.55'; small.textContent = String(err && err.message || err).slice(0, 120);
          box.firstChild.appendChild(small);
        }
        box.querySelector('button').onclick = function () { if (code) { location.reload(); return; } box.remove(); box = null; load(); };
        document.body.appendChild(box);
      }
      if (window.console) console.error('data.json', err);
    }
    function load() {
      fetch(url, { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (D) { try { fn(D); } catch (e) { fail(e, true); } }, function (e) { fail(e); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
  }

  function showUpdate() {
    if (document.getElementById('arcade-update') || !document.body) return;
    var b = document.createElement('button');
    b.id = 'arcade-update'; b.type = 'button'; b.textContent = '새 버전이 있어요 · 업데이트';
    b.style.cssText = 'position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top));transform:translateX(-50%);z-index:100;font:16px Jua,system-ui,sans-serif;border:0;border-radius:24px;padding:10px 20px;min-height:44px;background:#ffcf3f;color:#3b2a00;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;white-space:nowrap';
    b.onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }

  function installLinks() {
    var head = document.head;
    if (!head.querySelector('link[rel="manifest"]')) {
      var l = document.createElement('link'); l.rel = 'manifest'; l.href = new URL('manifest.webmanifest', base).href; head.appendChild(l);
    }
    if (!head.querySelector('link[rel="apple-touch-icon"]')) {
      var a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = new URL('icons/icon-180.png', base).href; head.appendChild(a);
    }
    if (!head.querySelector('meta[name="theme-color"]')) {
      var m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#141a2e'; head.appendChild(m);
    }
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      var hadCtrl = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register(new URL('sw.js', base).href, { scope: base.pathname }).then(function (reg) {
        // 앱을 다시 볼 때마다 새 버전이 있는지 확인
        document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function () {});
      // 새 버전이 설치되면 화면 위쪽에 업데이트 버튼을 띄운다 (처음 설치 때는 띄우지 않음)
      navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtrl) showUpdate(); hadCtrl = true; });
    }
  }

  window.Arcade = {
    play: play, record: record, best: best, boot: boot, base: base.href,
    get muted() { return muted; }, setMuted: setMuted, toggleMute: function () { setMuted(!muted); }
  };
  installLinks();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButtons); else addButtons();
})();
