/* 파닉스 팝 — 문제 만들기
 * 공통 진행은 ../common/learn.js (소리: Learn.say = 브라우저 음성 합성), 단어·단계는 data.json
 * 소리가 안 나는 기기에서는 단어 글자를 대신 보여 줘요. 저장 키: phonicsStars, phonicsStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample } = Learn.U, V = D.voice;
const VOICE = Learn.canSpeak(V.lang);
const say = t => Learn.say(t, V);
const ALPHA = D.letters.toLowerCase().split('');
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const W = ([w, e, k]) => ({ w, e, k });
const CVC = D.cvc.map(W), STARTS = Object.entries(D.starts).flatMap(([l, ws]) => ws.map(x => ({ ...W(x), l })));

// 비슷하게 생긴 글자부터 섞어서 보기 n 개
function letterChoices(l, n = 4, pool = ALPHA) {
  const near = (D.lookAlike[l] || '').split('').filter(x => pool.includes(x) && x !== l);
  const rest = shuffle(pool.filter(x => x !== l && !near.includes(x)));
  return shuffle([l, ...[...shuffle(near), ...rest].slice(0, n - 1)]);
}
// 그림 보기 (같은 그림·같은 단어 없이)
function picChoices(ans, pool, n = 4, prefer = () => false) {
  const seenE = new Set([ans.e]), seenW = new Set([ans.w]), out = [];
  for (const x of [...shuffle(pool.filter(prefer)), ...shuffle(pool)]) { if (out.length >= n - 1) break; if (seenE.has(x.e) || seenW.has(x.w)) continue; seenE.add(x.e); seenW.add(x.w); out.push(x); }
  return shuffle([ans, ...out]).map(x => ({ label: `<span class="pic">${x.e}</span>`, value: x.w, aria: x.w }));
}
// 다시 듣기 버튼 + 처음 한 번 읽어 주기
const voiced = (text, auto = true) => VOICE ? {
  tools: `<button class="pill say" type="button">🔊 다시 듣기</button>`,
  onShow() { const b = document.querySelector('#tools .say'); if (b) b.onclick = () => { say(text); Arcade.play('click'); }; if (auto) setTimeout(() => say(text), 250); }
} : {};
const big = (html, cls = '') => `<div class="box"><div class="card-big ${cls}">${html}</div></div>`;
const picCard = (x, txt = '') => big(`<span class="pic">${x.e}</span>${txt ? `<span class="word">${txt}</span>` : ''}`);
const reveal = x => (sc, q, solved) => { sc.innerHTML = picCard(x, `${esc(x.w)}<small>${esc(x.k)}</small>`); if (VOICE) say(x.w); };
const spaced = w => w.split('').map(c => `<b>${c}</b>`).join('');

const GEN = {
  letterHear() {
    const l = pick(ALPHA), L = l.toUpperCase();
    const v = voiced(L);
    return { ask: VOICE ? '들리는 알파벳은?' : `<b>${L}</b> 와 같은 글자는?`, scene: big(VOICE ? '<span class="ear">👂</span>' : `<span class="letter">${L}</span>`), ...v,
             choices: letterChoices(l).map(x => ({ label: `<span class="lt">${x.toUpperCase()}<i>${x}</i></span>`, value: x, aria: x })), answer: l,
             rule: [`${L} ${l}`, `${L} 로 시작하는 말: ${(D.starts[l] || []).map(x => x[0]).join(', ') || '—'}`], hint: '🔊 버튼을 눌러 한 번 더 들어 봐요', sig: 'h' + l };
  },
  letterCase() {
    const l = pick(ALPHA), up = Math.random() < .6, show = up ? l.toUpperCase() : l;
    return { ask: up ? '대문자에 맞는 소문자는?' : '소문자에 맞는 대문자는?', scene: big(`<span class="letter">${show}</span>`), ...voiced(l.toUpperCase(), false),
             choices: letterChoices(l).map(x => ({ label: `<span class="lt">${up ? x : x.toUpperCase()}</span>`, value: x, aria: x })), answer: l,
             rule: [`${l.toUpperCase()} ↔ ${l}`], hint: up ? 'b 와 d, p 와 q 처럼 헷갈리는 글자를 조심해요' : '대문자와 소문자를 짝지어 떠올려 봐요', sig: 'c' + l + up };
  },
  firstLetter() {
    const x = pick(STARTS);
    return { ask: '어떤 글자로 시작할까?', scene: picCard(x, VOICE ? '' : esc('_' + x.w.slice(1))), ...voiced(x.w),
             choices: letterChoices(x.l).map(c => ({ label: `<span class="lt">${c}</span>`, value: c })), answer: x.l, onReveal: reveal(x),
             rule: [`<b>${x.w[0]}</b>${esc(x.w.slice(1))} [${x.k}] 는 ${x.l} 로 시작해요`], hint: `단어의 맨 처음 소리를 잘 들어 봐요`, sig: 'f' + x.w };
  },
  firstPic() {
    const x = pick(STARTS);
    return { ask: `<b>${x.l.toUpperCase()} ${x.l}</b> 로 시작하는 그림은?`, scene: big(`<span class="letter">${x.l.toUpperCase()}<i>${x.l}</i></span>`),
             choices: picChoices(x, STARTS.filter(y => y.l !== x.l)), answer: x.w, tall: true,
             onReveal: reveal(x), rule: [`${x.e} ${esc(x.w)} [${x.k}]`], hint: '그림 이름을 영어로 말해 보고 첫소리를 생각해요', sig: 'p' + x.w };
  },
  midVowel() {
    const x = pick(CVC), v = x.w[1];
    return { ask: '가운데 들어갈 모음은?', scene: picCard(x, `${x.w[0]}<u>?</u>${x.w[2]}`), ...voiced(x.w),
             choices: VOWELS.map(c => ({ label: `<span class="lt">${c}</span>`, value: c })), answer: v, cols: 5, onReveal: reveal(x),
             rule: [`${x.w[0]}-<b>${v}</b>-${x.w[2]} → ${x.w} [${x.k}]`, D.vowelTips[v]], hint: '가운데 소리가 애·에·이·아·어 중 무엇인지 들어 봐요', sig: 'v' + x.w };
  },
  readPick() {
    const x = pick(CVC);
    return { ask: '이 단어의 그림은?', scene: big(`<span class="word big">${spaced(x.w)}</span>`),
             choices: picChoices(x, CVC, 4, y => y.w[1] === x.w[1] || y.w.slice(1) === x.w.slice(1) || y.w[0] === x.w[0]), answer: x.w, tall: true,
             onReveal: reveal(x), rule: [`${x.w.split('').join('-')} → ${x.w} [${x.k}]`], hint: '글자 소리를 하나씩 내고 빠르게 이어 붙여요', sig: 'r' + x.w };
  },
  listenPick() {
    const x = pick(CVC);
    return { ask: VOICE ? '들리는 단어의 그림은?' : '이 단어의 그림은?', scene: big(VOICE ? '<span class="ear">👂</span>' : `<span class="word big">${spaced(x.w)}</span>`), ...voiced(x.w),
             choices: picChoices(x, CVC, 4, y => y.w.slice(1) === x.w.slice(1) || (y.w[0] === x.w[0] && y.w[2] === x.w[2])), answer: x.w, tall: true,
             onReveal: reveal(x), rule: [`${x.e} ${x.w} [${x.k}]`], hint: '첫소리와 가운데 소리를 따로따로 들어 봐요', sig: 'l' + x.w };
  },
  rhyme() {
    const fams = Object.keys(D.families), f = pick(fams), [base, mate] = sample(D.families[f], 2);
    const others = shuffle(fams.filter(g => g !== f && (g[0] === f[0] || g[1] === f[1]))).concat(shuffle(fams.filter(g => g !== f)));
    const wrong = []; for (const g of others) { const w = pick(D.families[g]); if (wrong.length < 3 && !wrong.includes(w) && w !== base && w !== mate) wrong.push(w); }
    return { ask: `<b>${base}</b> 와 끝소리가 같은 말은?`, scene: big(`<span class="word big">${spaced(base)}</span>`), ...voiced(base),
             choices: shuffle([mate, ...wrong]).map(w => ({ label: `<span class="wd">${w}</span>`, value: w })), answer: mate,
             onReveal: () => VOICE && say(`${base}, ${mate}`),
             rule: [`${base} · ${mate} → 둘 다 -${f}`, `-${f} 가족: ${D.families[f].join(', ')}`], hint: `${base} 의 끝 두 글자 -${f} 를 찾아봐요`, sig: 'y' + base + mate };
  },
  lastLetter() {
    const x = pick(CVC), l = x.w[2];
    return { ask: '마지막 글자는?', scene: picCard(x, `${x.w.slice(0, 2)}<u>?</u>`), ...voiced(x.w),
             choices: letterChoices(l, 4, ALPHA.filter(c => !VOWELS.includes(c))).map(c => ({ label: `<span class="lt">${c}</span>`, value: c })), answer: l, onReveal: reveal(x),
             rule: [`${x.w.slice(0, 2)}<b>${l}</b> → ${x.w} [${x.k}]`], hint: '단어 끝을 길게 늘여 말해 봐요', sig: 't' + x.w };
  },
  spell() {
    const pool = [...CVC, ...D.digraphs.map(W)], x = pick(pool), letters = x.w.split('');
    const extra = sample(ALPHA.filter(c => !letters.includes(c)), x.w.length > 3 ? 1 : 2);
    let tiles = shuffle([...letters, ...extra]), filled = [];
    const v = voiced(x.w);
    return { ask: '글자 카드로 단어를 만들어요', ...v, _word: x.w,
      render(sc) { sc.innerHTML = `<div class="box"><div class="card-big"><span class="pic">${x.e}</span></div><div class="slots">${letters.map(() => '<span class="slot"></span>').join('')}</div></div>`; },
      custom: { mount(el, api) {
        el.innerHTML = `<div class="tiles">${tiles.map((c, i) => `<button class="tile" data-i="${i}" data-l="${c}">${c}</button>`).join('')}</div><button class="sub undo" type="button">⌫ 지우기</button>`;
        const slots = () => [...document.querySelectorAll('#scene .slot')];
        const paint = () => { slots().forEach((s, i) => { s.textContent = filled[i] != null ? tiles[filled[i]] : ''; s.classList.toggle('on', filled[i] != null); }); el.querySelectorAll('.tile').forEach(b => { b.disabled = filled.includes(+b.dataset.i); }); };
        el.querySelectorAll('.tile').forEach(b => b.onclick = () => {
          if (api.locked || b.disabled) return; filled.push(+b.dataset.i); Arcade.play('pop'); paint();
          if (filled.length === letters.length) { const got = filled.map(i => tiles[i]).join(''), ok = got === x.w;
            setTimeout(() => { api.submit(ok, ok ? '' : `지금은 ${got} 예요.`); if (!ok) { filled = []; paint(); } }, 200); }
        });
        el.querySelector('.undo').onclick = () => { if (api.locked) return; filled.pop(); paint(); };
      } },
      onReveal: reveal(x), rule: [`${x.w.split('').join('-')} → ${x.w} [${x.k}]`], hint: `소리를 들으며 첫 글자부터 차례로. 글자 수는 ${letters.length}개`, sig: 's' + x.w };
  },
  digraph() {
    const x = W(pick(D.digraphs)), d = pick(D.digraphs.filter(y => y[0] === x.w))[3], at = x.w.indexOf(d), shown = x.w.slice(0, at) + '<u>__</u>' + x.w.slice(at + 2);
    return { ask: '빈칸에 들어갈 두 글자 소리는?', scene: picCard(x, shown), ...voiced(x.w),
             choices: ['sh', 'ch', 'th', 'wh'].map(c => ({ label: `<span class="lt">${c}</span>`, value: c })), answer: d, cols: 4, onReveal: reveal(x),
             rule: [`${x.w} [${x.k}] 에는 ${d}`, { sh: 'sh 는 조용히 하라고 할 때 "쉬"', ch: 'ch 는 "치" (cheese 치즈)', th: 'th 는 혀를 이 사이에 살짝 물고 "쓰/드"', wh: 'wh 는 입을 동그랗게 "우"' }[d]], hint: '두 글자가 만나 새 소리 하나를 내요', sig: 'g' + x.w };
  }
};

Learn.run({ data: D, key: 'phonics', gen: GEN, onLeave: () => { try { speechSynthesis.cancel(); } catch (e) {} } });
});
