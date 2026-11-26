/* 학습 게임 공통 틀 — 단계 고르기, 진행 점, 보기 버튼(또는 직접 조작), 힌트와 한 번 더 기회, 별 저장, 결과 화면.
 *
 * 쓰는 법 (게임 폴더의 game.js):
 *   Arcade.boot(D => Learn.run({ data: D, key: 'fraction', gen: GEN }));
 *   - D(data.json): questionsPerStage, starThresholds[별1,별2,별3 기준], praise[], endTitles[0~3별],
 *                   stages[{ name, short, sub, grade, challenge, kinds:[{ kind, weight, ...설정 }] }]
 *   - GEN[kind](설정, ctx) → 문제 하나. ctx = { stage, index, U(도구) }
 *
 * 문제(question) 필드
 *   ask      질문(HTML)                 sig     같은 단계 안에서 겹치지 않게 하는 문자열
 *   scene    그림(HTML 문자열) 또는 render(sceneEl, q) 함수
 *   choices  보기 [문자열 | { label: HTML, value, aria }]   answer  정답 value
 *   cols     보기 열 수(기본: 보기 3개면 3, 아니면 2)    small  보기 글자 작게    tall  보기 버튼 높게(그림 보기)
 *   custom   { mount(choicesEl, api) } 직접 조작 문제. api.submit(맞음 여부, 틀렸을 때 덧붙일 말)
 *   rule     풀이 줄 [..]    hint  힌트 한 줄
 *   onHint(sceneEl, q) 힌트 때 그림 바꾸기 · onReveal(sceneEl, q, 맞혔는지) 정답 공개 때
 *   tools    도구 줄에 넣을 HTML (예: 다시 듣기 버튼) · onShow(sceneEl, q) 문제를 그린 뒤 한 번
 *   once     true 면 다시 고르기 없이 한 번에 판정(두 가지 중 고르기 등)
 *
 * 저장(localStorage): {key}Stars {단계번호: 별}, {key}StarTotal (목록 화면 '내 기록'용)
 */
window.Learn = (function () {
  const $ = id => document.getElementById(id);
  const snd = (...a) => window.Arcade && Arcade.play(...a);

  // ---------- 도구
  const U = {
    ri: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: a => a[Math.floor(Math.random() * a.length)],
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample(a, n) { return U.shuffle(a.slice()).slice(0, n); },
    wpick(list) { let r = Math.random() * list.reduce((s, x) => s + (x.weight ?? 1), 0); for (const x of list) { r -= x.weight ?? 1; if (r <= 0) return x; } return list[list.length - 1]; },
    gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
    // 수 보기: 정답 + 헷갈리기 쉬운 후보(앞에 있을수록 우선). fmt 로 글자 모양, ok 로 허용 범위
    nums(ans, cands, { n = 4, ok = v => v > 0, fmt = v => String(v), step = 1, key = v => String(v) } = {}) {
      const out = [], seen = new Set([key(ans)]);
      for (const v of cands) if (out.length < n - 1 && ok(v) && !seen.has(key(v))) { seen.add(key(v)); out.push(v); }
      for (let d = step; out.length < n - 1 && d < 1e6; d += step) for (const v of [ans + d, ans - d]) if (out.length < n - 1 && ok(v) && !seen.has(key(v))) { seen.add(key(v)); out.push(v); }
      return U.shuffle([ans, ...out]).map(fmt);
    },
    store: {
      get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    }
  };

  // ---------- 소리 내어 읽기 (브라우저에 들어 있는 음성. 서버·파일 없이 기기에서 바로 읽어요)
  const synth = window.speechSynthesis;
  let voices = [];
  function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  if (synth) { loadVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', loadVoices); }
  function voiceFor(lang) {
    const l = lang.toLowerCase(), base = l.split('-')[0];
    return voices.find(v => v.lang.toLowerCase() === l && /google|samantha|siri|natural|enhanced/i.test(v.name))
      || voices.find(v => v.lang.toLowerCase() === l) || voices.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  }
  function canSpeak(lang = 'en-US') { if (!synth || !window.SpeechSynthesisUtterance) return false; loadVoices(); return !voices.length || !!voiceFor(lang); }
  function say(text, { lang = 'en-US', rate = 0.85, pitch = 1 } = {}) {
    if (!synth || !window.SpeechSynthesisUtterance) return false;
    try {
      synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate; u.pitch = pitch;
      const v = voiceFor(lang); if (v) u.voice = v; synth.speak(u); return true;
    } catch (e) { return false; }
  }

  // ---------- 게임 진행
  function run(cfg) {
    const D = cfg.data, STAGES = D.stages, QN = D.questionsPerStage || 10, KEY = cfg.key, GEN = cfg.gen;
    const nextText = cfg.nextLabel || '다음 문제';
    let stage = 1, qi = 0, results = [], cur = null, tries = 0, locked = false, used = new Set();
    let stars = U.store.get(KEY + 'Stars', {}); if (!stars || typeof stars !== 'object') stars = {};
    const S = () => STAGES[stage - 1];

    function startStage(n) { stage = n; qi = 0; results = []; used = new Set(); $('stgName').textContent = `${n}단계 · ${S().short || S().name}`; show(null); nextQ(); }
    function make() {
      let q, g = 0;
      do { const k = U.wpick(S().kinds); q = GEN[k.kind](k, { stage, index: qi, U, data: D }); q.kind = q.kind || k.kind; } while (q.sig && used.has(q.sig) && ++g < 40);
      if (q.sig) used.add(q.sig); return q;
    }
    function nextQ() {
      $('fb').hidden = true; locked = false; tries = 0; cur = make();
      const q = cur, sc = $('scene');
      $('ask').innerHTML = q.ask;
      sc.innerHTML = ''; if (typeof q.render === 'function') q.render(sc, q); else sc.innerHTML = q.scene || '';
      $('tools').innerHTML = q.tools || '';
      const C = $('choices'); C.innerHTML = ''; C.className = 'choices';
      if (q.custom) { C.classList.add('custom'); q.custom.mount(C, { submit: (ok, note) => judge(ok, null, note), get locked() { return locked; } }); }
      else {
        const list = q.choices.map(c => typeof c === 'object' ? c : { label: c, value: c });
        C.style.setProperty('--cols', q.cols || (list.length === 3 ? 3 : 2));
        list.forEach((c, i) => {
          const b = document.createElement('button'); b.className = 'ch' + (q.small ? ' sm' : '') + (q.tall ? ' tall' : '');
          b.innerHTML = c.label; b.dataset.v = String(c.value); b.setAttribute('aria-label', `${i + 1}번 ${c.aria || String(c.label).replace(/<[^>]+>/g, '')}`);
          b.onclick = () => { if (locked || b.disabled) return; judge(String(c.value) === String(q.answer), b); };
          C.appendChild(b);
        });
      }
      if (q.onShow) q.onShow(sc, q);
      dots();
    }
    function dots() { const el = $('dots'); el.innerHTML = ''; for (let i = 0; i < QN; i++) { const d = document.createElement('i'); if (results[i]) d.className = results[i]; else if (i === qi) d.className = 'now'; el.appendChild(d); } }
    function panel(cls, title, lines, btn, fn) {
      const fb = $('fb'); fb.className = 'fb' + (cls ? ' ' + cls : ''); fb.hidden = false;
      $('fbTitle').textContent = title; $('fbText').innerHTML = (lines || []).map(l => `<span>${l}</span>`).join('');
      $('nextBtn').textContent = btn; $('nextBtn').onclick = fn; $('nextBtn').focus({ preventScroll: true });
    }
    const nextLabel = () => qi < QN - 1 ? nextText : '결과 보기';
    // 맞힘(o) · 다시 해서 맞힘(f) · 틀림(x)
    function judge(ok, btn, note) {
      if (locked) return; tries++;
      const q = cur, sc = $('scene');
      if (ok) {
        locked = true; results[qi] = tries === 1 ? 'o' : 'f'; if (btn) btn.classList.add('right'); snd(tries === 1 ? 'coin' : 'level');
        if (q.onReveal) q.onReveal(sc, q, true);
        panel(tries === 1 ? '' : 'mid', tries === 1 ? U.pick(D.praise) : '고쳤어요! 잘했어요', q.rule, nextLabel(), advance);
      } else if (tries === 1 && !q.once) {
        results[qi] = 'x'; if (btn) { btn.classList.add('wrong'); btn.disabled = true; } snd('bad');
        if (q.onHint) q.onHint(sc, q);
        panel('bad', '다시 볼까요?', [...(note ? [note] : []), '힌트: ' + q.hint], q.custom ? '다시 해 보기' : '다시 고르기', () => { $('fb').hidden = true; });
      } else {
        locked = true; results[qi] = 'x'; if (btn) btn.classList.add('wrong'); snd('bad');
        $('choices').querySelectorAll('.ch').forEach(x => { if (x.dataset.v === String(q.answer)) x.classList.add('right'); });
        if (q.onReveal) q.onReveal(sc, q, false);
        panel('bad', q.answerText ? '정답은 ' + q.answerText : '정답을 확인해요', [...(note ? [note] : []), ...(q.rule || [])], nextLabel(), advance);
      }
      dots();
    }
    function advance() { $('fb').hidden = true; if (cfg.onLeave) cfg.onLeave(cur); if (qi >= QN - 1) return endStage(); qi++; nextQ(); }
    addEventListener('keydown', e => {
      if (!$('fb').hidden && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('nextBtn').click(); return; }
      const k = +e.key; if ($('fb').hidden && $('titleOv').hidden && $('endOv').hidden && k >= 1 && k <= 6) { const b = $('choices').querySelectorAll('.ch')[k - 1]; if (b) b.click(); }
    });

    function endStage() {
      const ok = results.filter(r => r === 'o').length, fixed = results.filter(r => r === 'f').length;
      const s = (D.starThresholds || [6, 8, 10]).filter(n => ok >= n).length;
      stars[stage] = Math.max(stars[stage] || 0, s); U.store.set(KEY + 'Stars', stars);
      U.store.set(KEY + 'StarTotal', Object.values(stars).reduce((a, b) => a + b, 0));
      $('eStars').innerHTML = '★'.repeat(s) + '<span class="off">' + '★'.repeat(3 - s) + '</span>';
      $('eTitle').textContent = (D.endTitles || [])[s] || '';
      $('eTxt').textContent = `${stage}단계 · ${S().name}\n${QN}문제 중 ${ok}개는 한 번에 맞혔어요` + (fixed ? `\n${fixed}개는 다시 해서 맞혔어요` : '') + (s < 3 ? `\n별 3개는 ${QN}개 모두 한 번에!` : '');
      $('nextStageBtn').hidden = stage >= STAGES.length || s === 0; $('nextStageBtn').textContent = `${stage + 1}단계로`;
      show('endOv'); snd(s >= 2 ? 'win' : s === 1 ? 'level' : 'lose');
      ($('nextStageBtn').hidden ? $('againBtn') : $('nextStageBtn')).focus();
    }
    function show(id) { for (const o of ['titleOv', 'endOv']) $(o).hidden = o !== id; }
    function renderStages() {
      const el = $('stages'); el.innerHTML = ''; const next = STAGES.findIndex((_, i) => !stars[i + 1]);
      STAGES.forEach((st, i) => {
        const n = i + 1, s = stars[n] || 0, b = document.createElement('button'); b.className = 'stage' + (i === next ? ' next' : '');
        b.innerHTML = `<span class="no">${n}</span><span class="nm">${st.name}${st.challenge ? '<span class="tagc">도전</span>' : ''}<small>${st.sub || ''}${st.grade ? ' · ' + st.grade : ''}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`;
        b.onclick = () => { snd('click'); startStage(n); }; el.appendChild(b);
      });
    }
    $('nextStageBtn').onclick = () => startStage(stage + 1);
    $('againBtn').onclick = () => startStage(stage);
    $('pickBtn').onclick = () => { renderStages(); show('titleOv'); };
    $('menuBtn').onclick = () => { $('fb').hidden = true; if (cfg.onLeave) cfg.onLeave(cur); renderStages(); show('titleOv'); };
    renderStages();
    return { get current() { return cur; }, judge: (ok, note) => judge(ok, null, note) };
  }

  return { U, run, say, canSpeak };
})();
