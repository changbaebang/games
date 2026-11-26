/* 나눗셈 사탕 — 문제 만들기와 그림
 * 공통 진행은 ../common/learn.js, 단계·사탕 그림·친구·문장제 틀은 data.json
 * 저장 키: divisionStars, divisionStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U;
const $s = () => document.getElementById('scene');

// 사탕 n 개를 한 줄에 per 개씩, groupSize 마다 테두리
function candies(n, emo, { groupSize = 0, per = 0 } = {}) {
  if (groupSize) {
    const groups = Math.ceil(n / groupSize); let h = '';
    for (let g = 0; g < groups; g++) { const k = Math.min(groupSize, n - g * groupSize); h += `<span class="grp${k < groupSize ? ' rest' : ''}">${emo.repeat(k)}</span>`; }
    return `<div class="box candy">${h}</div>`;
  }
  return `<div class="box candy"><span class="pile">${emo.repeat(n)}</span></div>`;
}
const qa = (a, b) => `${a} ÷ ${b}`;

const GEN = {
  share(g) {
    const m = ri(g.groups[0], g.groups[1]), each = ri(g.each[0], g.each[1]), n = m * each, emo = pick(D.candies), fr = shuffle(D.friends.slice()).slice(0, m);
    const plates = Array(m).fill(0); let jar = n, wrap = null;
    // 이 문제의 상자(wrap) 안만 다시 그려요. 누르기도 이 상자에만 달려 있어요
    const draw = () => {
      wrap.innerHTML = `<div class="jar" aria-label="남은 사탕 ${jar}개">${emo.repeat(jar) || '<small>다 나눴어요!</small>'}</div>
        <div class="plates">${plates.map((k, i) => `<button class="plate" data-i="${i}" aria-label="${i + 1}번 접시, 사탕 ${k}개"><span class="who">${fr[i]}</span><span class="on">${emo.repeat(k)}</span></button>`).join('')}</div>`;
    };
    return { ask: `사탕 ${n}개를 ${m}명에게 <b>똑같이</b> 나눠 줘요<small>접시를 누르면 하나 담기, 길게 누르면 하나 빼기</small>`,
      render: sc => { sc.innerHTML = '<div class="box share"></div>'; wrap = sc.firstChild; draw(); },
      custom: { mount(el, api) {
        el.innerHTML = '<div class="row2"><button class="sub" id="undoAll">다시 담기</button><button class="btn" id="shareOk">다 나눴어요!</button></div>';
        const sc = wrap; let press = 0, timer = 0;
        sc.addEventListener('pointerdown', e => { const b = e.target.closest('.plate'); if (!b || api.locked) return; press = +b.dataset.i; timer = setTimeout(() => { timer = -1; if (plates[press] > 0) { plates[press]--; jar++; Arcade.play('select'); draw(); } }, 450); });
        sc.addEventListener('pointerup', e => { const b = e.target.closest('.plate'); if (!b || api.locked) return; if (timer !== -1) { clearTimeout(timer); if (jar > 0) { plates[+b.dataset.i]++; jar--; Arcade.play('pop'); draw(); } else Arcade.play('bad'); } timer = 0; });
        el.querySelector('#undoAll').onclick = () => { if (api.locked) return; plates.fill(0); jar = n; draw(); };
        el.querySelector('#shareOk').onclick = () => {
          const same = plates.every(k => k === plates[0]);
          api.submit(jar === 0 && same, jar > 0 ? `아직 사탕이 ${jar}개 남았어요.` : `접시마다 사탕 수가 달라요: ${plates.join(', ')}개`);
        };
      } },
      rule: [`${n}개를 ${m}명이 똑같이 나누면 한 명에 ${each}개`, `${qa(n, m)} = ${each}`], hint: '모든 접시에 한 개씩 돌아가며 담아 봐요', sig: 's' + n + m };
  },
  groupsOf(g) {
    const size = ri(g.size[0], g.size[1]), cnt = ri(g.count[0], g.count[1]), n = size * cnt, emo = pick(D.candies);
    return { ask: `사탕 ${n}개를 ${size}개씩 묶으면 몇 묶음일까요?`, scene: candies(n, emo),
             choices: nums(cnt, [size, cnt + 1, cnt - 1, n - size], { fmt: v => v + '묶음', ok: v => v > 0 }), answer: cnt + '묶음',
             onHint: sc => { sc.innerHTML = candies(n, emo, { groupSize: size }); }, onReveal: sc => { sc.innerHTML = candies(n, emo, { groupSize: size }); },
             rule: [`${size}개씩 ${cnt}묶음 → ${qa(n, size)} = ${cnt}`], hint: `${size}개씩 묶어 볼게요. 묶음을 세어 봐요`, sig: 'g' + n + size };
  },
  fact() {
    const b = ri(2, 9), q = ri(2, 9), a = b * q;
    return { ask: `${qa(a, b)} = ?`, scene: '', choices: nums(q, [b, q + 1, q - 1, a - b], { ok: v => v > 0 }), answer: String(q),
             rule: [`${b} × ${q} = ${a} 이니까`, `${qa(a, b)} = ${q}`], hint: `${b}단 곱셈구구에서 ${a}가 나오는 곳을 찾아봐요: ${b} × ? = ${a}`, sig: 'f' + a + b };
  },
  missing() {
    const b = ri(2, 9), q = ri(2, 9), a = b * q;
    return { ask: `? × ${b} = ${a}`, scene: '', choices: nums(q, [q + 1, q - 1, a - b, b], { ok: v => v > 0 }), answer: String(q),
             rule: [`${qa(a, b)} = ${q}`, `그래서 ${q} × ${b} = ${a}`], hint: `${a} ÷ ${b} 를 생각해 봐요`, sig: 'm' + a + b };
  },
  family() {
    const b = ri(2, 9); let q; do { q = ri(2, 9); } while (q === b);   // 2×2 처럼 같은 수면 보기가 겹쳐요
    const a = b * q;
    const right = `${a} ÷ ${q} = ${b}`, wrong = [`${b} ÷ ${q} = ${a}`, `${a} ÷ ${b} = ${a - b}`, `${q} ÷ ${a} = ${b}`];
    return { ask: `${b} × ${q} = ${a} 와 한 가족인 나눗셈은?`, scene: '', choices: shuffle([right, ...wrong]), answer: right, small: true, cols: 1,
             rule: [`${b} × ${q} = ${a} 이면`, `${a} ÷ ${b} = ${q}, ${a} ÷ ${q} = ${b}`], hint: '나눗셈에서는 가장 큰 수(곱)가 맨 앞에 와요', sig: 'y' + a + b };
  },
  remainder() {
    const b = ri(2, 9), q = ri(2, 9), r = ri(1, b - 1), a = b * q + r, emo = pick(D.candies);
    const f = (x, y) => `${x} … ${y}`, cands = [f(q, r), f(q + 1, r), f(q, r + b), f(q - 1, r + b), f(q, b - r), f(q + 1, 0)];
    return { ask: `${qa(a, b)} = ?<small>몫 … 나머지</small>`, scene: candies(a, emo),
             choices: shuffle([...new Set(cands)].filter(c => !/-|… 0$/.test(c) || c === f(q, r)).slice(0, 4)), answer: f(q, r),
             onReveal: sc => { sc.innerHTML = candies(a, emo, { groupSize: b }); }, onHint: sc => { sc.innerHTML = candies(a, emo, { groupSize: b }); },
             rule: [`${b}개씩 ${q}묶음, ${r}개가 남아요`, `${qa(a, b)} = ${q} … ${r}`, '나머지는 나누는 수보다 항상 작아요'], hint: `${b}개씩 묶고 남은 사탕을 세어 봐요`, sig: 'r' + a + b };
  },
  check() {
    const b = ri(3, 9), r = ri(1, b - 1); let q; do { q = ri(2, 9); } while (q === r);   // 몫과 나머지가 같으면 보기가 겹쳐요
    const a = b * q + r;
    const right = `${b} × ${q} + ${r} = ${a}`, wrong = [`${b} × ${r} + ${q} = ${a}`, `${b} × ${q} − ${r} = ${a}`, `${q} + ${b} + ${r} = ${a}`];
    return { ask: `${qa(a, b)} = ${q} … ${r}<small>맞게 계산했는지 확인하는 식은?</small>`, scene: '', choices: shuffle([right, ...wrong]), answer: right, small: true, cols: 1,
             rule: ['나누는 수 × 몫 + 나머지 = 나누어지는 수', `${b} × ${q} + ${r} = ${a}`], hint: '나누는 수와 몫을 곱하고 나머지를 더하면 처음 수가 돼요', sig: 'k' + a + b };
  },
  twoDigit() {
    let b, q; do { b = ri(2, 9); q = ri(11, 49); } while (b * q > 99 || b * q < 20);
    const a = b * q;
    return { ask: `${qa(a, b)} = ?`, scene: longDiv(a, b),
             choices: nums(q, [q + 10, q - 10, q + 1, q - 1, Math.floor(a / 10 / b) * 10], { ok: v => v > 0 }), answer: String(q),
             rule: [`십의 자리부터: ${Math.floor(a / 10)} ÷ ${b}, 남은 수를 일의 자리와 함께 나눠요`, `${qa(a, b)} = ${q}  (확인: ${b} × ${q} = ${a})`], hint: `${b} × 10 = ${b * 10}, ${b} × 20 = ${b * 20} … 어디쯤일지 어림해 봐요`, sig: 't' + a + b };
  },
  twoDigitRem() {
    let b, q, r; do { b = ri(3, 9); q = ri(11, 32); r = ri(1, b - 1); } while (b * q + r > 99);
    const a = b * q + r, f = (x, y) => `${x} … ${y}`;
    return { ask: `${qa(a, b)} = ?<small>몫 … 나머지</small>`, scene: longDiv(a, b),
             choices: shuffle([...new Set([f(q, r), f(q + 1, r), f(q, r + 1 < b ? r + 1 : r - 1 || b - 1), f(q - 1, r + b)])].slice(0, 4)), answer: f(q, r),
             rule: [`${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${r}`, `${qa(a, b)} = ${q} … ${r}`], hint: '몫을 어림한 뒤, 나누는 수 × 몫 이 나누어지는 수를 넘지 않는지 봐요', sig: 'u' + a + b };
  },
  story() {
    const s = pick(D.stories), m = ri(3, 8), q = ri(3, 9), r = ri(1, m - 1), n = m * q + r;
    const ans = s.mode === 'ceil' ? q + 1 : s.mode === 'floor' ? q : r;
    const cands = s.mode === 'rem' ? [q, m, r + 1] : [s.mode === 'ceil' ? q : q + 1, r, q - 1];
    return { ask: s.text.replace('{n}', n).replace('{m}', m), scene: '', choices: nums(ans, cands, { fmt: v => v + s.unit, ok: v => v > 0 }), answer: ans + s.unit, small: true,
             rule: [`${qa(n, m)} = ${q} … ${r}`, s.why.replace('{r}', r), `답: ${ans}${s.unit}`], hint: `먼저 ${qa(n, m)} 의 몫과 나머지를 구하고, 나머지를 어떻게 할지 생각해 봐요`, sig: 'w' + s.text.slice(0, 6) + n + m };
  }
};
// 세로 나눗셈 틀(답은 비워 둠)
function longDiv(a, b) {
  return `<div class="box"><div class="ldiv"><span class="dv">${b}</span><span class="bk">)</span><span class="dd">${a}</span></div></div>`;
}

Learn.run({ data: D, key: 'division', gen: GEN });
});
