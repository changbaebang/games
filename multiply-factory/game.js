/* 곱셈 공장 — 두 자리·세 자리 곱셈
 * 공통 진행은 ../common/learn.js, 세로셈 칸은 ../common/vcalc.js, 문장제·단계는 data.json
 * 저장 키: multiplyStars, multiplyStarTotal */
Arcade.boot(D => {
const { ri, pick, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const PL = ['일', '십', '백', '천'];
const dg = n => String(n).split('').reverse().map(Number);
const carryCount = (a, b) => { let c = 0, n = 0; for (const d of dg(a)) { const s = d * b + c; c = Math.floor(s / 10); if (c) n++; } return n; };
const noCarry = (a, b) => +dg(a).map(d => d * b % 10).reverse().join('');     // 올림을 잊은 실수

function steps(a, b) {
  const out = []; let c = 0;
  dg(a).forEach((d, i) => { const s = d * b + c; out.push(`${PL[i]}의 자리: ${d} × ${b}${c ? ` + ${c}(올림)` : ''} = ${s}${s >= 10 && i < dg(a).length - 1 ? ` → ${s % 10} 쓰고 ${Math.floor(s / 10)} 올림` : ''}`); c = Math.floor(s / 10); });
  return out;
}

/* ---------- 모형 그림: 두 자리 × 한 자리 ---------- */
function blocksSVG(a, b) {
  // 묶음(a)을 b 개 나란히: 묶음마다 십 모형 막대 + 일 모형
  const t = Math.floor(a / 10), o = a % 10, U = 7, H = U * 10;
  let s = '', x = 8;
  for (let r = 0; r < b; r++) {
    const x0 = x;
    for (let i = 0; i < t; i++, x += U + 3) s += `<rect x="${x}" y="8" width="${U}" height="${H}" fill="${C.ten}" stroke="${C.edge}" stroke-width="1.2"/>`;
    x += 4;
    for (let i = 0; i < o; i++) { const cx = x + (i % 2) * (U + 3), cy = 8 + H - (Math.floor(i / 2) + 1) * (U + 3); s += `<rect x="${cx}" y="${cy}" width="${U}" height="${U}" fill="${C.one}" stroke="${C.edge}" stroke-width="1"/>`; }
    x += o ? 2 * (U + 3) : 0;
    s = `<rect x="${x0 - 5}" y="2" width="${x - x0 + 6}" height="${H + 12}" rx="8" fill="#fff" stroke="${C.edge}" stroke-opacity=".25" stroke-width="2"/>` + s;
    x += 14;
  }
  return `<svg viewBox="0 0 ${x - 4} ${H + 16}" class="blk" style="width:min(94vw,${Math.round((x - 4) * 2.3)}px)" role="img" aria-label="${a}씩 ${b}묶음">${s}</svg>`;
}

/* ---------- 넓이 모형: 두 자리 × 두 자리 ---------- */
function areaSVG(a, b, { hide = -1, show = true } = {}) {
  const at = Math.floor(a / 10) * 10, ao = a % 10, bt = Math.floor(b / 10) * 10, bo = b % 10;
  const W = 300, H = 210, wx = W * at / a, hy = H * bt / b, X = 50, Y = 34;
  const cells = [[0, 0, wx, hy, at * bt, `${at}×${bt}`, C.a], [wx, 0, W - wx, hy, ao * bt, `${ao}×${bt}`, C.b], [0, hy, wx, H - hy, at * bo, `${at}×${bo}`, C.c], [wx, hy, W - wx, H - hy, ao * bo, `${ao}×${bo}`, C.d]];
  let s = '';
  cells.forEach(([x, y, w, h, v, lab, col], i) => {
    s += `<rect x="${X + x}" y="${Y + y}" width="${w}" height="${h}" fill="${col}" stroke="${C.edge}" stroke-width="2"/>`;
    const small = w < 70 || h < 50;
    if (show) s += `<text class="${small ? 'cs' : 'cv'}" x="${X + x + w / 2}" y="${Y + y + h / 2 - (small ? 0 : 10)}">${i === hide ? '?' : v}</text>${small ? '' : `<text class="cl" x="${X + x + w / 2}" y="${Y + y + h / 2 + 16}">${lab}</text>`}`;
  });
  s += `<text class="ax" x="${X + wx / 2}" y="${Y - 12}">${at}</text><text class="ax" x="${X + wx + (W - wx) / 2}" y="${Y - 12}">${ao}</text>`;
  s += `<text class="ax" x="${X - 20}" y="${Y + hy / 2}">${bt}</text><text class="ax" x="${X - 20}" y="${Y + hy + (H - hy) / 2}">${bo}</text>`;
  return `<svg viewBox="0 0 ${X + W + 8} ${Y + H + 8}" class="area" role="img" aria-label="${a} 곱하기 ${b} 넓이 모형">${s}</svg>`;
}
const parts4 = (a, b) => { const at = Math.floor(a / 10) * 10, ao = a % 10, bt = Math.floor(b / 10) * 10, bo = b % 10; return [at * bt, ao * bt, at * bo, ao * bo]; };
const twoByTwo = () => { for (;;) { const a = ri(12, 49), b = ri(12, 29); if (a % 10 && b % 10) return [a, b]; } };

const GEN = {
  tens() {
    const x = ri(2, 9), y = ri(2, 9), r = x * 10 * y;
    return { ask: '계산해 보세요', scene: wrap(`<div class="eq">${x}0 × ${y} = <span class="q">?</span></div><div class="mini">${x} × ${y} = ${x * y}</div>`),
             choices: nums(r, [x * y, r * 10, r + 10, r - 10], { ok: v => v > 0 }), answer: String(r),
             rule: [`${x} × ${y} = ${x * y}`, `${x}0 × ${y} 는 그 10배 → ${r}`], hint: '0 을 떼고 곱한 다음, 0 을 다시 붙여요', sig: 't' + x + y };
  },
  hundreds() {
    const x = ri(2, 9), y = ri(2, 9), r = x * 100 * y;
    return { ask: '계산해 보세요', scene: wrap(`<div class="eq">${x}00 × ${y} = <span class="q">?</span></div>`),
             choices: nums(r, [x * y * 10, r * 10, x * y, r + 100], { ok: v => v > 0 }), answer: String(r),
             rule: [`${x} × ${y} = ${x * y}`, `0 두 개를 붙이면 ${r}`], hint: '0 이 몇 개인지 세어 봐요', sig: 'h' + x + y };
  },
  blocks() {
    let a, b; do { a = ri(11, 43); b = ri(2, 4); } while (a % 10 === 0 || (a % 10) * b >= 10 || a * b > 99 + 30);
    const t = Math.floor(a / 10) * 10, o = a % 10, r = a * b;
    return { ask: `모형은 모두 얼마일까요? (<b>${a}</b>씩 <b>${b}</b>묶음)`, scene: wrap(blocksSVG(a, b)),
             choices: nums(r, [a + b, r + 10, r - 10, t * b + o]), answer: String(r),
             rule: [`십 모형: ${t} × ${b} = ${t * b}`, `일 모형: ${o} × ${b} = ${o * b}`, `${t * b} + ${o * b} = ${r}`], hint: '십 모형끼리, 일 모형끼리 따로 세어 더해요', sig: 'b' + a + b };
  },
  partial() {
    const a = ri(12, 89), b = ri(3, 9), t = Math.floor(a / 10) * 10, o = a % 10, hide = ri(0, 2);
    if (!o) return GEN.partial();
    const vals = [t * b, o * b, a * b], show = vals.map((v, i) => i === hide ? '<span class="q">?</span>' : v);
    return { ask: `<b>${a} × ${b}</b>, 나누어 곱해요. ? 에 알맞은 수는?`, scene: wrap(`<div class="eq sm">${t} × ${b} = ${show[0]}<br>${o} × ${b} = ${show[1]}<br><b>${a} × ${b} = ${show[2]}</b></div>`),
             choices: nums(vals[hide], [vals[hide] + 10, vals[hide] - b, hide === 2 ? noCarry(a, b) : vals[hide] * 10, vals[hide] + b], { ok: v => v > 0 }), answer: String(vals[hide]),
             rule: [`${a} = ${t} + ${o}`, `${t * b} + ${o * b} = ${a * b}`], hint: '몇십과 몇으로 나누어 각각 곱하고 더해요', sig: 'p' + a + b + hide };
  },
  vert(g) {
    let a, b; do { a = ri(g.a[0], g.a[1]); b = ri(2, 9); } while (a % 10 === 0 || (g.carry ? carryCount(a, b) < 1 : false) || a * b > 3999);
    const v = VCalc.make({ a, b, op: '×' });
    return { ask: `곱셈을 세로셈으로 해요<small>${a} × ${b}</small>`, render: sc => v.render(sc), _v: v, custom: { mount: (el, api) => v.mount(el, api) },
             rule: [...steps(a, b), `답: ${a * b}`], hint: '일의 자리부터 곱하고, 10 이 넘으면 위 칸을 눌러 올린 수를 적어 두세요', sig: 'v' + a + b };
  },
  tensTens() {
    const x = ri(2, 9), y = ri(2, 9), r = x * y * 100;
    return { ask: '계산해 보세요', scene: wrap(`<div class="eq">${x}0 × ${y}0 = <span class="q">?</span></div>`),
             choices: nums(r, [x * y * 10, x * y * 1000, x * y], { ok: v => v > 0 }), answer: String(r),
             rule: [`${x} × ${y} = ${x * y}`, `0 이 모두 두 개 → ${r}`], hint: '0 을 떼고 곱한 뒤 0 을 두 개 붙여요', sig: 'q' + x + y };
  },
  areaPart() {
    const [a, b] = twoByTwo(), p = parts4(a, b), h = ri(0, 3);
    return { ask: `<b>${a} × ${b}</b> 넓이 모형에서 ? 조각의 값은?`, scene: wrap(areaSVG(a, b, { hide: h })),
             choices: nums(p[h], [p[h] * 10, p[h] / 10, p[h] + 10, p[(h + 1) % 4]].map(v => Math.round(v)), { ok: v => v > 0 && v !== p[h] }), answer: String(p[h]),
             onReveal: sc => { sc.innerHTML = wrap(areaSVG(a, b)); },
             rule: ['가로 길이 × 세로 길이 = 조각의 넓이', `조각: ${p.join(' + ')} = ${a * b}`], hint: '그 조각의 위쪽 수와 왼쪽 수를 곱해요', sig: 'ap' + a + b + h };
  },
  areaTotal() {
    const [a, b] = twoByTwo(), p = parts4(a, b), r = a * b;
    return { ask: `<b>${a} × ${b}</b> 는 얼마일까요?`, scene: wrap(areaSVG(a, b)),
             choices: nums(r, [p[0] + p[3], r + 10, r - 10, (Math.floor(a / 10) * Math.floor(b / 10)) * 100 + (a % 10) * (b % 10) * 1 + 0], { ok: v => v > 0 }), answer: String(r),
             rule: [`네 조각을 모두 더해요`, `${p.join(' + ')} = ${r}`], hint: '네 조각의 값을 모두 더해요 (대각선 두 조각만 더하면 안 돼요!)', sig: 'at' + a + b };
  },
  story() {
    const s = pick(D.stories), two = Math.random() < .35, a = two ? ri(12, 35) : ri(13, 98), b = two ? ri(11, 25) : ri(3, 9), r = a * b;
    return { ask: s.t.replace('{a}', a).replace('{b}', b), scene: wrap(`<div class="story">${s.e}</div>`),
             choices: nums(r, [a + b, two ? parts4(a, b)[0] + parts4(a, b)[3] : noCarry(a, b), r + 10, r - a], { ok: v => v > 0, fmt: v => v + s.unit }), answer: r + s.unit,
             rule: [`${a}씩 ${b}번 → ${a} × ${b}`, `= ${r}${s.unit}`], hint: '“~씩 ~묶음”은 곱셈이에요', sig: 'y' + s.e + a + b };
  },
  estimate() {
    const a = ri(18, 98), b = ri(3, 9), ra = Math.round(a / 10) * 10, e = ra * b;
    if (Math.abs(a - ra) < 2 || a % 10 === 5) return GEN.estimate();
    return { ask: `<b>${a} × ${b}</b> 를 어림하면 약 얼마?`, scene: wrap(`<div class="eq">${a} × ${b} ≈ <span class="q">?</span></div>`),
             choices: nums(e, [e + b * 10, e - b * 10, e * 10], { ok: v => v > 0, fmt: v => '약 ' + v }), answer: '약 ' + e,
             rule: [`${a} → 약 ${ra}`, `${ra} × ${b} = ${e}`, `(정확한 값은 ${a * b})`], hint: `${a}를 가장 가까운 몇십으로 바꿔요`, sig: 'e' + a + b };
  },
  missing() {
    const a = ri(12, 89), b = ri(3, 9), r = a * b, d = a % 10;
    if (!d) return GEN.missing();
    return { ask: '□ 안에 알맞은 숫자는?', scene: wrap(`<div class="eq big">${Math.floor(a / 10)}<span class="q">□</span> × ${b} = ${r}</div>`),
             choices: nums(d, [(d + 1) % 10, (d + 9) % 10, (d + 2) % 10, (d + 5) % 10], { ok: v => v >= 0 && v <= 9 }), answer: String(d), cols: 4,
             rule: [`${a} × ${b} = ${r}`, `일의 자리: □ × ${b} 의 일의 자리가 ${r % 10}`], hint: `□ × ${b} 의 일의 자리 숫자가 ${r % 10} 인 수를 찾아요`, sig: 'm' + a + b };
  }
};

Learn.run({ data: D, key: 'multiply', gen: GEN });
});
