/* 분수 피자 — 문제 만들기와 그림
 * 공통 진행(단계, 힌트, 별)은 ../common/learn.js, 단계 구성·색·문구는 data.json
 * 분수 값은 "분자/분모" 문자열로 비교해요. 저장 키: fractionStars, fractionStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, gcd, nums } = Learn.U, C = D.colors;

// ---------- 그림
const fr = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;
const frv = (n, d) => ({ label: fr(n, d), value: `${n}/${d}`, aria: `${d}분의 ${n}` });
// 피자: n 조각 중 shaded 집합. 맨 위에서 시계 방향
function pizza(n, shaded, { r = 100, id = '', tap = false } = {}) {
  let s = `<circle r="${r + 8}" fill="${C.crust}"/>`;
  for (let i = 0; i < n; i++) {
    const a1 = -Math.PI / 2 + i * 2 * Math.PI / n, a2 = a1 + 2 * Math.PI / n;
    const p = `M0 0 L${(r * Math.cos(a1)).toFixed(1)} ${(r * Math.sin(a1)).toFixed(1)} A${r} ${r} 0 ${n === 1 ? 1 : 0} 1 ${(r * Math.cos(a2)).toFixed(1)} ${(r * Math.sin(a2)).toFixed(1)}Z`;
    const on = shaded.has(i), m = (a1 + a2) / 2;
    s += `<path class="slice${on ? ' on' : ''}${tap ? ' tap' : ''}" data-i="${i}" d="${p}" fill="${on ? C.pizza : C.empty}" stroke="#7a4a1a" stroke-width="3"/>`;
    if (on) s += `<circle class="pep" cx="${(r * .58 * Math.cos(m)).toFixed(1)}" cy="${(r * .58 * Math.sin(m)).toFixed(1)}" r="${Math.max(5, 22 - n * 1.6)}" fill="${C.topping}" pointer-events="none"/>`;
  }
  return `<svg${id ? ` id="${id}"` : ''} viewBox="${-r - 14} ${-r - 14} ${2 * r + 28} ${2 * r + 28}" role="img">${s}</svg>`;
}
// 막대: n 칸 중 앞에서 k 칸
function bar(n, k, { w = 300, h = 54, color = C.bar } = {}) {
  let s = ''; const cw = w / n;
  for (let i = 0; i < n; i++) s += `<rect x="${(i * cw).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${h}" fill="${i < k ? color : '#fff'}" stroke="#22324f" stroke-width="2.5"/>`;
  return `<svg viewBox="-4 -4 ${w + 8} ${h + 8}" role="img">${s}</svg>`;
}
// 수직선 0~1, n 칸, ? 표시 위치 k
function line(n, k, { w = 320, labels = true, mark = '?' } = {}) {
  let s = `<line x1="0" y1="40" x2="${w}" y2="40" stroke="#22324f" stroke-width="3"/>`;
  for (let i = 0; i <= n; i++) { const x = i * w / n, big = i === 0 || i === n; s += `<line x1="${x}" y1="${big ? 26 : 31}" x2="${x}" y2="${big ? 54 : 49}" stroke="#22324f" stroke-width="${big ? 3 : 2}"/>`; }
  if (labels) s += `<text class="nl" x="0" y="78">0</text><text class="nl" x="${w}" y="78">1</text>`;
  const x = k * w / n; s += `<path d="M${x} 22 l-9 -14 h18z" fill="var(--accent)"/><text class="nl q" x="${x}" y="-2">${mark}</text>`;
  return `<svg viewBox="-24 -26 ${w + 48} 114" role="img">${s}</svg>`;
}
const box = inner => `<div class="box pics">${inner}</div>`;

// ---------- 문제
const GEN = {
  read(g) {
    const d = pick(g.denoms), n = ri(1, d - 1), shape = pick(['pizza', 'pizza', 'bar']);
    const shaded = new Set(shuffle([...Array(d).keys()]).slice(0, n));
    const pic = shape === 'pizza' ? pizza(d, shaded) : bar(d, n);
    return { ask: '색칠한 부분은 전체의 얼마일까요?', scene: box(pic), choices: shuffle(uniqFr([[n, d], [d - n, d], [n, d + 1 > 10 ? d - 1 : d + 1], [d, n], [n + 1 < d ? n + 1 : n - 1, d]]).slice(0, 4)).map(([a, b]) => frv(a, b)),
             answer: `${n}/${d}`, tall: true, rule: [`전체를 똑같이 ${d}조각으로 나눈 것 중 ${n}조각 → ${fr(n, d)}`], hint: '전체가 몇 조각인지(분모), 그중 색칠한 조각이 몇 개인지(분자) 세어 봐요', sig: 'r' + n + d + shape };
  },
  paint(g) {
    const d = pick(g.denoms), n = ri(1, d - 1), on = new Set();
    return { ask: `피자를 ${fr(n, d)} 만큼 색칠해요<small>조각을 눌러서 칠하고 지울 수 있어요</small>`, scene: box(pizza(d, on, { id: 'pz', tap: true })),
      custom: { mount(el, api) {
        el.innerHTML = '<button class="btn" id="paintOk">다 칠했어요!</button>';
        // 누르기는 이 문제의 그림 상자에만 달아요(다음 문제로 넘어가면 상자와 함께 사라져요)
        const wrap = $s().querySelector('.pics'), redraw = () => { wrap.innerHTML = pizza(d, on, { id: 'pz', tap: true }); };
        wrap.addEventListener('click', e => { const p = e.target.closest('.slice'); if (!p || api.locked) return; const i = +p.dataset.i; on.has(i) ? on.delete(i) : on.add(i); Arcade.play('select'); redraw(); });
        el.querySelector('#paintOk').onclick = () => api.submit(on.size === n, `지금 ${on.size}조각을 칠했어요.`);
      } },
      rule: [`${fr(n, d)} 은 전체를 ${d}조각으로 나눈 것 중 ${n}조각이에요`], hint: `분모 ${d}는 조각 수, 분자 ${n}은 칠할 조각 수예요`, sig: 'p' + n + d };
  },
  compareSameDen() {
    const d = ri(4, 10); let a = ri(1, d - 1), b; do { b = ri(1, d - 1); } while (b === a && Math.random() < .8);
    const ans = a > b ? '>' : a < b ? '<' : '=';
    return { ask: `${fr(a, d)} ○ ${fr(b, d)}<small>○ 안에 알맞은 것은?</small>`, scene: '', choices: ['>', '=', '<'], answer: ans,
             onHint: sc => { sc.innerHTML = box(bar(d, a) + bar(d, b)); },
             onReveal: sc => { sc.innerHTML = box(bar(d, a) + bar(d, b)); },
             rule: ['분모가 같으면 분자가 클수록 큰 분수예요', `${fr(a, d)} ${ans} ${fr(b, d)}`], hint: '분모가 같아요. 분자를 비교해 봐요', sig: 'c' + a + b + d };
  },
  compareUnit() {
    let a = ri(2, 10), b; do { b = ri(2, 10); } while (b === a);
    const ans = 1 / a > 1 / b ? '>' : '<';
    return { ask: `${fr(1, a)} ○ ${fr(1, b)}<small>○ 안에 알맞은 것은?</small>`, scene: '', choices: ['>', '=', '<'], answer: ans,
             onHint: sc => { sc.innerHTML = box(bar(a, 1) + bar(b, 1)); }, onReveal: sc => { sc.innerHTML = box(bar(a, 1) + bar(b, 1)); },
             rule: ['분자가 1인 분수(단위분수)는 분모가 작을수록 커요', '여럿이 나눌수록 한 조각은 작아지니까요!'], hint: '피자 하나를 2명이 나눌 때와 10명이 나눌 때, 한 조각은 어느 쪽이 클까요?', sig: 'u' + a + b };
  },
  decBar() {
    const k = ri(1, 9);
    return { ask: '색칠한 부분을 소수로 나타내면?', scene: box(bar(10, k, { color: '#3fbf6a' })), choices: shuffle(uniq([`0.${k}`, `${k}`, `0.${10 - k}`, `0.0${k}`, `1.${k}`]).slice(0, 4)), answer: `0.${k}`,
             rule: [`10칸 중 ${k}칸 = ${fr(k, 10)} = 0.${k}`, '0.1이 ' + k + '개면 0.' + k], hint: '한 칸은 전체의 10분의 1, 소수로 0.1이에요', sig: 'b' + k };
  },
  decLine() {
    const k = ri(1, 9);
    return { ask: '수직선의 ? 가 나타내는 소수는?', scene: box(line(10, k)), choices: shuffle(uniq([`0.${k}`, `0.${k + (k < 9 ? 1 : -1)}`, `${k}`, `0.${10 - k === k ? (k + 2) % 10 || 1 : 10 - k}`, `1.${k}`]).slice(0, 4)), answer: `0.${k}`,
             rule: [`0과 1 사이를 10칸으로 나눈 것 중 ${k}번째 → 0.${k}`], hint: '0부터 눈금을 한 칸씩 세어 봐요. 한 칸이 0.1이에요', sig: 'l' + k };
  },
  fracToDec() {
    const k = ri(1, 9), rev = Math.random() < .5;
    if (rev) return { ask: `0.${k} 를 분수로 나타내면?`, scene: box(bar(10, k, { color: '#3fbf6a' })), choices: shuffle(uniqFr([[k, 10], [1, k], [k, 100], [10, k], [k + 1, 10]]).slice(0, 4)).map(([a, b]) => frv(a, b)), answer: `${k}/10`,
                      rule: [`0.${k} 는 0.1이 ${k}개 → ${fr(k, 10)}`], hint: '0.1 은 10분의 1이에요', sig: 'q' + k };
    return { ask: `${fr(k, 10)} 를 소수로 나타내면?`, scene: box(bar(10, k, { color: '#3fbf6a' })), choices: shuffle(uniq([`0.${k}`, `${k}.0`, `0.0${k}`, `1.${k}`])), answer: `0.${k}`,
             rule: [`${fr(k, 10)} 는 0.1이 ${k}개 → 0.${k}`], hint: '10분의 1은 0.1이에요', sig: 'f' + k };
  },
  decCompare() {
    const pool = [...Array(29).keys()].map(i => i + 1).filter(v => v % 10), [a, b] = shuffle(pool).slice(0, 2);   // 1.0, 2.0 처럼 끝이 0인 수는 빼요
    const t = v => (v / 10).toFixed(1), ans = a > b ? t(a) : t(b);
    return { ask: '더 큰 소수는 어느 것일까요?', scene: '', choices: [t(a), t(b)], answer: ans, once: true,
             onReveal: sc => { sc.innerHTML = box(`<div class="cmp">${t(a)} ${a > b ? '>' : '<'} ${t(b)}</div>`); },
             rule: ['자연수 부분부터 비교하고, 같으면 소수 첫째 자리를 비교해요', `${t(a)} 은 0.1이 ${a}개, ${t(b)} 은 0.1이 ${b}개`], hint: '', sig: 'd' + a + b };
  },
  add() {
    const d = ri(4, 12); let a = ri(1, d - 2), b = ri(1, d - 1 - a);
    return { ask: `${fr(a, d)} + ${fr(b, d)} = ?`, scene: box(bar(d, 0)), onShow: sc => { sc.innerHTML = box(stack(d, a, b)); },
             choices: shuffle(uniqFr([[a + b, d], [a + b, d + d], [a + b + 1, d], [Math.abs(a - b) || a + b + 2, d], [a * b <= d ? a * b : a + b - 1 || 1, d]]).slice(0, 4)).map(([x, y]) => frv(x, y)), answer: `${a + b}/${d}`, tall: true,
             rule: ['분모가 같으면 분모는 그대로, 분자끼리 더해요', `${fr(a, d)} + ${fr(b, d)} = ${fr(a + b, d)}`], hint: '분모끼리는 더하지 않아요! 조각 크기는 그대로예요', sig: 'a' + a + b + d };
  },
  sub() {
    const d = ri(4, 12), a = ri(2, d - 1), b = ri(1, a - 1);
    return { ask: `${fr(a, d)} − ${fr(b, d)} = ?`, scene: box(bar(d, a)),
             choices: shuffle(uniqFr([[a - b, d], [a - b, 0 || d], [a + b <= 2 * d ? a + b : a - b + 1, d], [a - b, d - 1 > 1 ? d - 1 : d + 1], [a - b + 1, d]]).slice(0, 4)).map(([x, y]) => frv(x, y)), answer: `${a - b}/${d}`, tall: true,
             rule: ['분모는 그대로, 분자끼리 빼요', `${fr(a, d)} − ${fr(b, d)} = ${fr(a - b, d)}`], hint: '분모는 빼지 않아요. 조각 수만 빼요', sig: 's' + a + b + d };
  },
  oneMinus() {
    const d = ri(3, 10), a = ri(1, d - 1);
    return { ask: `1 − ${fr(a, d)} = ?`, scene: box(pizza(d, new Set([...Array(d).keys()]))),
             choices: shuffle(uniqFr([[d - a, d], [1, d], [a, d], [d - a + 1, d], [d - a, d + 1]]).slice(0, 4)).map(([x, y]) => frv(x, y)), answer: `${d - a}/${d}`, tall: true,
             onReveal: sc => { sc.innerHTML = box(pizza(d, new Set([...Array(d - a).keys()]))); },
             rule: [`1 은 ${fr(d, d)} 와 같아요`, `${fr(d, d)} − ${fr(a, d)} = ${fr(d - a, d)}`], hint: `피자 한 판(1)은 ${d}조각 모두예요 → ${fr(d, d)}`, sig: 'o' + a + d };
  },
  equivUp() {
    const d = ri(2, 6), n = ri(1, d - 1), m = ri(2, 4), g = gcd(n, d); if (g > 1) return GEN.equivUp();
    return { ask: `${fr(n, d)} = ${fr('?', d * m)}`, scene: box(bar(d, n) + bar(d * m, n * m)),
             choices: nums(n * m, [n + m, n, n * m + 1, n * m - 1, d * m - n * m], { fmt: String }), answer: String(n * m),
             rule: [`분모에 ${m}을 곱했으니 분자에도 ${m}을 곱해요`, `${fr(n, d)} = ${fr(n * m, d * m)}`], hint: `분모 ${d} → ${d * m} 는 몇 배가 되었나요? 분자도 똑같이!`, sig: 'e' + n + d + m };
  },
  equivDown() {
    const d = ri(2, 6), n = ri(1, d - 1), m = ri(2, 4); if (gcd(n, d) > 1) return GEN.equivDown();
    return { ask: `${fr(n * m, d * m)} = ${fr(n, '?')}`, scene: box(bar(d * m, n * m) + bar(d, n)),
             choices: nums(d, [d * m, d + m, d * m - n, d + 1], { fmt: String, ok: v => v > n }), answer: String(d),
             rule: [`분자 ${n * m} → ${n} 은 ${m}으로 나눈 것, 분모도 ${m}으로 나눠요`, `${fr(n * m, d * m)} = ${fr(n, d)} (약분)`], hint: '분자가 몇으로 나누어졌는지 보고 분모도 똑같이 나눠요', sig: 'w' + n + d + m };
  },
  equivPick() {
    const d = ri(2, 5), n = ri(1, d - 1); if (gcd(n, d) > 1) return GEN.equivPick();
    const m = ri(2, 4), right = [n * m, d * m], wrong = uniqFr([[n + m, d + m], [n * m, d + m], [n + 1, d * m], [n * m + 1, d * m]]).filter(([a, b]) => a * d !== b * n).slice(0, 3);
    return { ask: `${fr(n, d)} 와 크기가 같은 분수는?`, scene: box(bar(d, n)), choices: shuffle([right, ...wrong]).map(([a, b]) => frv(a, b)), answer: `${right[0]}/${right[1]}`, tall: true,
             onReveal: sc => { sc.innerHTML = box(bar(d, n) + bar(d * m, n * m)); },
             rule: ['분모와 분자에 같은 수를 곱하면 크기가 같은 분수가 돼요', `${fr(n, d)} = ${fr(n * m, d * m)} (분모·분자에 ${m}을 곱함)`], hint: '분모와 분자에 똑같은 수를 곱했는지 찾아봐요 (더하면 안 돼요!)', sig: 'k' + n + d + m };
  }
};
const $s = () => document.getElementById('scene');
function uniq(a) { return [...new Set(a)]; }
function uniqFr(list) { const seen = new Set(), out = []; for (const [a, b] of list) { if (!(a > 0 && b > 0)) continue; const k = a + '/' + b; if (!seen.has(k)) { seen.add(k); out.push([a, b]); } } return out; }
// 덧셈 그림: 앞 a 칸 파랑, 다음 b 칸 주황
function stack(d, a, b) {
  const w = 300, h = 54, cw = w / d; let s = '';
  for (let i = 0; i < d; i++) s += `<rect x="${(i * cw).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${h}" fill="${i < a ? '#4d96ff' : i < a + b ? '#ffb347' : '#fff'}" stroke="#22324f" stroke-width="2.5"/>`;
  return `<svg viewBox="-4 -4 ${w + 8} ${h + 8}" role="img">${s}</svg>`;
}

Learn.run({ data: D, key: 'fraction', gen: GEN });
});
