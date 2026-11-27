/* 계산 순서 블록 — 5학년 1학기 자연수의 혼합 계산
 * 식 틀(templates)과 이야기는 data.json. 저장 키: mixcalcStars, mixcalcStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U;
const wrap = s => `<div class="box">${s}</div>`;
const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
const SHOW = { '-': '−' };
const tokenize = s => s.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
// 지금 계산할 연산의 위치 (괄호 안 → × ÷ → + −, 같으면 앞에서부터)
function nextOp(t) {
  let lo = 0, hi = t.length;
  for (let i = 0; i < t.length; i++) if (t[i] === '(') { let j = i + 1; while (t[j] !== ')' && t[j] !== '(') j++; if (t[j] === ')') { lo = i + 1; hi = j; break; } }
  for (const group of [['×', '÷'], ['+', '-']]) for (let i = lo; i < hi; i++) if (group.includes(t[i])) return i;
  return -1;
}
function step(t, i) {
  const v = OPS[t[i]](+t[i - 1], +t[i + 1]); const n = [...t.slice(0, i - 1), String(v), ...t.slice(i + 2)];
  for (let k = 0; k < n.length - 2; k++) if (n[k] === '(' && n[k + 2] === ')') { n.splice(k + 2, 1); n.splice(k, 1); }
  return n;
}
function evaluate(t) { const steps = []; let c = t; while (c.length > 1) { const i = nextOp(c); if (i < 0) return null; const v = OPS[c[i]](+c[i - 1], +c[i + 1]); if (!Number.isInteger(v) || v <= 0) return null; steps.push([c, i, v]); c = step(c, i); } return { value: +c[0], steps }; }
// 계산 순서를 무시한 실수: 괄호를 빼고 앞에서부터
function leftToRight(t) { const u = t.filter(x => x !== '(' && x !== ')'); let v = +u[0]; for (let i = 1; i < u.length; i += 2) v = OPS[u[i]](v, +u[i + 1]); return Number.isInteger(v) && v >= 0 ? v : null; }
const txt = t => t.map(x => SHOW[x] || x).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
// 틀에 수를 넣어 올바른 식 만들기
function build(set) {
  for (let tries = 0; tries < 400; tries++) {
    const tpl = pick(D.templates[set]), vals = {};
    for (const L of 'abcde') vals[L] = ri(2, set === 'addsub' ? 90 : 20);
    if (/÷/.test(tpl)) { for (const L of 'abcde') if (Math.random() < .5) vals[L] = ri(2, 9) * ri(2, 9); }
    const t = tokenize(tpl).map(x => vals[x] != null ? String(vals[x]) : x), e = evaluate(t);
    if (e && e.value <= 300 && e.value > 0) return { t, ...e };
  }
  return build(set);
}
function opLabel(c, i) { return `${c[i - 1]} ${SHOW[c[i]] || c[i]} ${c[i + 1]}`; }

/* ---------- 순서대로 누르기 ---------- */
function orderQ(set) {
  const E = build(set); let cur = E.t, done = 0, box = null, api = null;
  const draw = () => {
    box.innerHTML = `<div class="expr">${cur.map((x, i) => OPS[x] ? `<button class="op" data-i="${i}">${SHOW[x] || x}</button>` : x === '(' || x === ')' ? `<span class="par">${x}</span>` : `<span class="nb">${x}</span>`).join('')}</div><div class="trail">${E.steps.slice(0, done).map(([c, i, v]) => `${opLabel(c, i)} = <b>${v}</b>`).join('<br>')}</div>`;
    box.querySelectorAll('.op').forEach(b => b.onclick = () => {
      if (api.locked) return; const i = +b.dataset.i, want = nextOp(cur);
      if (i !== want) { b.classList.add('bad'); Arcade.play('bad'); return api.submit(false, `${opLabel(cur, i)} 보다 먼저 계산할 곳이 있어요.`); }
      Arcade.play('pop'); cur = step(cur, i); done++; draw();
      if (cur.length === 1) setTimeout(() => api.submit(true), 250);
    });
  };
  return { ask: '계산할 기호를 <b>순서대로</b> 눌러요', render(sc) { sc.innerHTML = '<div class="box"><div class="board"></div></div>'; box = sc.querySelector('.board'); cur = E.t; done = 0; if (api) draw(); },
           _E: E, custom: { mount(el, a) { api = a; el.innerHTML = '<div class="tip">( ) → × ÷ → + − , 같은 단계는 왼쪽부터</div>'; draw(); } },
           rule: [...E.steps.map(([c, i, v], k) => `${k + 1}. ${opLabel(c, i)} = ${v}`), `답: ${E.value}`], hint: '괄호가 있으면 괄호 안부터, 그다음 곱셈·나눗셈!', sig: 'o' + E.t.join('') };
}

const GEN = {
  order(g) { return orderQ(g.set); },
  value(g) {
    const E = build(g.set), wrong = leftToRight(E.t);
    return { ask: '계산 결과는?', scene: wrap(`<div class="expr big">${txt(E.t)}</div>`),
             choices: nums(E.value, [wrong, E.value + 10, E.value + 1, Math.abs(E.value - 2)].filter(v => v != null && v !== E.value), { ok: v => v >= 0 }), answer: String(E.value),
             rule: [...E.steps.map(([c, i, v], k) => `${k + 1}. ${opLabel(c, i)} = ${v}`), ...(wrong != null && wrong !== E.value ? [`(앞에서부터만 계산하면 ${wrong} → 틀려요)`] : [])], hint: '어디를 먼저 계산할지 정한 다음 차근차근!', sig: 'v' + E.t.join('') };
  },
  first(g) {
    let E; do { E = build(g.set); } while (E.steps.length < 2);
    const [c, i] = E.steps[0], ans = opLabel(c, i), others = [];
    for (let k = 1; k < c.length - 1; k++) if (OPS[c[k]] && k !== i && !isNaN(+c[k - 1]) && !isNaN(+c[k + 1])) others.push(opLabel(c, k));
    if (!others.length) return GEN.first(g);
    return { ask: '<b>가장 먼저</b> 계산해야 하는 부분은?', scene: wrap(`<div class="expr big">${txt(E.t)}</div>`), choices: shuffle([ans, ...others.slice(0, 3)]), answer: ans, cols: 1,
             rule: ['( ) → × ÷ → + −', `→ ${ans} 먼저`], hint: '괄호, 그다음 곱셈·나눗셈을 찾아요', sig: 'f' + E.t.join('') };
  },
  story() {
    const s = pick(D.stories);
    for (;;) {
      const v = { a: ri(3, 9), b: ri(2, 9), c: ri(2, 6) };
      if (s.right.startsWith('a - b')) { v.a = ri(10, 30) * 100; v.b = ri(2, 9) * 100; v.c = ri(2, 5); }
      if (s.right.includes('÷')) { v.c = ri(2, 6); v.a = v.c * ri(3, 12); v.b = v.c * ri(1, 9); if (s.right === 'a ÷ b + c') { v.b = ri(2, 6); v.a = v.b * ri(3, 12); } }
      if (s.right === 'a × b - c') v.c = ri(1, v.a * v.b - 1);
      const fill = tpl => tokenize(tpl).map(x => v[x] != null ? String(v[x]) : x), R = evaluate(fill(s.right));
      if (!R || R.value <= 0) continue;
      const opts = [s.right, ...s.wrong].map(tpl => txt(fill(tpl)));
      return { ask: s.t.replace('{a}', v.a).replace('{b}', v.b).replace('{c}', v.c), scene: wrap('<div class="emo">🧮</div>'), choices: shuffle([...new Set(opts)]), answer: opts[0], cols: 1, small: true,
               rule: [`하나의 식: ${opts[0]}`, `= ${R.value}`, '먼저 해야 할 계산이 뒤에 있으면 괄호를 써요'], hint: '무엇을 먼저 구해야 하는지 생각해요', sig: 's' + s.t.slice(0, 5) + v.a + v.b };
    }
  },
  paren() {
    for (;;) {
      const a = ri(2, 30), b = ri(2, 12), c = ri(2, 9), tpls = [[`${a} + ${b} × ${c}`, `(${a} + ${b}) × ${c}`], [`${a * c + b * c} - ${b} × ${c}`, `(${a * c + b * c} - ${b}) × ${c}`]];
      const [p, q] = pick(tpls), E1 = evaluate(tokenize(p)), E2 = evaluate(tokenize(q));
      if (!E1 || !E2 || E1.value === E2.value) continue;
      const ask = pick([p, q]), E = ask === p ? E1 : E2, other = ask === p ? E2 : E1;
      return { ask: '계산 결과는?', scene: wrap(`<div class="expr big">${ask.replace(/-/g, '−')}</div>`), choices: nums(E.value, [other.value, E.value + c, Math.abs(E.value - b)], { ok: v => v >= 0 }), answer: String(E.value),
               rule: [...E.steps.map(([cc, i, v], k) => `${k + 1}. ${opLabel(cc, i)} = ${v}`), `괄호 ${ask === p ? '없으면' : '있으면'} ${E.value}, ${ask === p ? '있으면' : '없으면'} ${other.value}`], hint: '괄호가 있는지 꼭 확인해요', sig: 'p' + ask };
    }
  }
};

Learn.run({ data: D, key: 'mixcalc', gen: GEN });
});
