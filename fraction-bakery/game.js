/* 분수 빵집 — 3학년 2학기 분수
 * 분수만큼은 얼마, 진분수·가분수·대분수, 바꾸기, 크기 비교
 * 공통 진행은 ../common/learn.js, 빵·단위·단계는 data.json. 저장 키: fraction2Stars, fraction2StarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const fr = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;
const mx = (w, n, d) => n ? `<span class="mx">${w}${fr(n, d)}</span>` : `${w}`;
const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eun = w => jong(w) ? '은' : '는';
const KN = '영일이삼사오육칠팔구십';
const eulNum = n => jong(KN[n % 10] || '십') ? '을' : '를';          // 분수 읽기 끝 글자(분자)에 맞춘 조사
const fv = (n, d) => ({ label: fr(n, d), value: `${n}/${d}`, aria: `${d}분의 ${n}` });
const mv = (w, n, d) => ({ label: mx(w, n, d), value: n ? `${w} ${n}/${d}` : `${w}`, aria: n ? `${w}과 ${d}분의 ${n}` : `${w}` });

/* ---------- 그림 ---------- */
// 물건을 분모 개 묶음으로 나눠 담기
function groupsSVG(e, total, d, hi = 0) {
  const per = total / d, cols = Math.min(d, d <= 4 ? d : Math.ceil(d / 2)), rows = Math.ceil(d / cols), inner = Math.ceil(Math.sqrt(per)), cell = 30, bw = inner * cell + 14, bh = Math.ceil(per / inner) * cell + 14;
  let s = '';
  for (let g = 0; g < d; g++) {
    const x = 8 + (g % cols) * (bw + 10), y = 8 + Math.floor(g / cols) * (bh + 10);
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="12" fill="${g < hi ? C.box : '#fff'}" stroke="${C.cakeEdge}" stroke-width="2" stroke-dasharray="${g < hi ? '0' : '5 4'}"/>`;
    for (let k = 0; k < per; k++) s += `<text class="it" x="${x + 7 + (k % inner) * cell + cell / 2}" y="${y + 7 + Math.floor(k / inner) * cell + cell / 2}">${e}</text>`;
  }
  const W = 16 + cols * (bw + 10), H = 16 + rows * (bh + 10);
  return `<svg viewBox="0 0 ${W} ${H}" class="grp" style="max-width:min(94vw,${Math.min(460, W * 1.6)}px)" role="img">${s}</svg>`;
}
// 낱개로 늘어놓기 (묶기 전)
function looseSVG(e, total) {
  const cols = Math.min(total, 8), rows = Math.ceil(total / cols), cell = 34;
  let s = ''; for (let k = 0; k < total; k++) s += `<text class="it big" x="${12 + (k % cols) * cell + cell / 2}" y="${10 + Math.floor(k / cols) * cell + cell / 2}">${e}</text>`;
  return `<svg viewBox="0 0 ${24 + cols * cell} ${20 + rows * cell}" class="grp" role="img">${s}</svg>`;
}
// 케이크(원) 여러 판: 분모 d 조각, 칠한 조각 수 n
function piesSVG(n, d) {
  const k = Math.max(1, Math.ceil(n / d)), R = 44, gap = 14, W = k * (2 * R + gap) + gap;
  let s = '';
  for (let p = 0; p < k; p++) {
    const cx = gap + R + p * (2 * R + gap), cy = R + 10, filled = Math.min(d, n - p * d);
    for (let i = 0; i < d; i++) {
      const a0 = -Math.PI / 2 + i / d * Math.PI * 2, a1 = a0 + Math.PI * 2 / d, big = 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      s += d === 1 ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${filled ? C.cake : C.empty}" stroke="${C.cakeEdge}" stroke-width="2.5"/>`
        : `<path d="M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} Z" fill="${i < filled ? C.cake : C.empty}" stroke="${C.cakeEdge}" stroke-width="2.5"/>`;
    }
  }
  return `<svg viewBox="0 0 ${W} ${2 * R + 20}" class="pies" style="max-width:min(94vw,${Math.min(480, W * 1.3)}px)" role="img" aria-label="케이크 ${k}판">${s}</svg>`;
}
const pickD = (lo = 2, hi = 6) => ri(lo, hi);

const GEN = {
  unitOfSet() {
    const [nm, e] = pick(D.items), d = pickD(2, 6), per = ri(2, 4), total = d * per;
    return { ask: `${nm} <b>${total}개</b>의 ${fr(1, d)} 은(는) 몇 개일까요?`, scene: wrap(looseSVG(e, total)),
             choices: nums(per, [d, total - per, per + 1, per * 2], { ok: v => v > 0, fmt: v => v + '개' }), answer: per + '개',
             onReveal: sc => { sc.innerHTML = wrap(groupsSVG(e, total, d, 1)); },
             rule: [`${total}개를 똑같이 ${d}묶음으로 나누면 한 묶음에 ${per}개`, `${total}의 ${fr(1, d)} = ${per}`], hint: `${total}개를 똑같이 ${d}묶음으로 나눠 봐요`, sig: 'u' + total + d + nm };
  },
  groupFrac() {
    const [nm, e] = pick(D.items), d = pickD(3, 6), per = ri(2, 4), total = d * per, h = ri(1, d - 1);
    return { ask: `색칠한 묶음은 전체의 얼마일까요?`, scene: wrap(groupsSVG(e, total, d, h)),
             choices: shuffle([fv(h, d), fv(h * per, d), fv(d - h, d), fv(h, total)].filter((x, i, a) => a.findIndex(y => y.value === x.value) === i)), answer: `${h}/${d}`,
             rule: [`전체 ${d}묶음 중 ${h}묶음 → ${fr(h, d)}`, `(${total}개 중 ${h * per}개)`], hint: '낱개가 아니라 묶음 수로 세어요', sig: 'g' + total + d + h };
  },
  partOfSet() {
    const [nm, e] = pick(D.items), d = pickD(3, 6), per = ri(2, 5), total = d * per, n = ri(2, d - 1), ans = per * n;
    return { ask: `${nm} <b>${total}개</b>의 ${fr(n, d)} 는 몇 개일까요?`, scene: wrap(groupsSVG(e, total, d, 0)),
             choices: nums(ans, [per, total / n | 0, ans + per, total - ans], { ok: v => v > 0 && v !== ans, fmt: v => v + '개' }), answer: ans + '개',
             onReveal: sc => { sc.innerHTML = wrap(groupsSVG(e, total, d, n)); },
             rule: [`${total}의 ${fr(1, d)} = ${per}`, `${fr(n, d)} 는 그 ${n}배 → ${per} × ${n} = ${ans}`], hint: `먼저 ${fr(1, d)} 이 몇 개인지 구하고, ${n}배 해요`, sig: 'p' + total + d + n };
  },
  measure() {
    const m = pick(D.measures), d = pick(m.dens), n = ri(1, d - 1), ans = m.total / d * n;
    return { ask: `<b>${m.whole}</b>의 ${fr(n, d)} 는 몇 ${m.unit}일까요?`, scene: wrap(`<div class="eq">${m.whole} = ${m.total} ${m.unit}</div>`),
             choices: nums(ans, [m.total / d, ans + m.total / d, m.total - ans, ans * 2, ans / 2, n * 10, m.total / n].filter(v => v !== ans), { ok: v => v > 0 && Number.isInteger(v), fmt: v => `${v} ${m.unit}` }), answer: `${ans} ${m.unit}`,
             rule: [`${m.whole} = ${m.total} ${m.unit}`, `${m.total}의 ${fr(1, d)} = ${m.total / d}`, `${fr(n, d)} → ${m.total / d} × ${n} = ${ans} ${m.unit}`], hint: `먼저 ${m.whole}을 ${m.unit}로 바꿔요`, sig: 'm' + m.unit + d + n };
  },
  kindOf() {
    const d = pickD(2, 9), t = pick(['진', '가', '가', '대']);
    let label, rule;
    if (t === '진') { const n = ri(1, d - 1); label = fr(n, d); rule = `분자 ${n} 가 분모 ${d} 보다 작아요 → 진분수`; }
    else if (t === '가') { const n = ri(d, 3 * d); label = fr(n, d); rule = n === d ? `분자와 분모가 같아요 → 가분수 (= 1)` : `분자 ${n} 가 분모 ${d} 보다 커요 → 가분수`; }
    else { const w = ri(1, 4), n = ri(1, d - 1); label = mx(w, n, d); rule = `자연수와 진분수로 되어 있어요 → 대분수`; }
    return { ask: '어떤 분수일까요?', scene: wrap(`<div class="big">${label}</div>`), choices: ['진분수', '가분수', '대분수'], answer: t + '분수',
             rule: [rule, '진분수: 분자 < 분모 · 가분수: 분자 ≥ 분모 · 대분수: 자연수 + 진분수'], hint: '분자와 분모의 크기를 비교해요', sig: 'k' + label };
  },
  readPie() {
    const d = pickD(2, 6), n = ri(d + 1, 3 * d - 1);
    if (n % d === 0) return GEN.readPie();
    const w = Math.floor(n / d), r = n % d, asMixed = Math.random() < .5;
    const ans = asMixed ? mv(w, r, d) : fv(n, d);
    const opts = asMixed ? [ans, mv(w + 1, r, d), mv(w, d - r, d), mv(r, w, d)] : [ans, fv(n + 1, d), fv(n, d + 1), fv(r, d)];
    return { ask: `칠한 부분을 <b>${asMixed ? '대분수' : '가분수'}</b>로 나타내면?`, scene: wrap(piesSVG(n, d)), choices: shuffle(opts.filter((x, i, a) => a.findIndex(y => y.value === x.value) === i && !(x.value.includes(' 0/')))), answer: ans.value,
             rule: [`한 판을 ${d}조각으로 나눴어요`, `칠한 조각 ${n}개 → ${fr(n, d)} = ${mx(w, r, d)}`], hint: '한 판에 몇 조각인지 먼저 보고, 칠한 조각을 모두 세어요', sig: 'r' + n + d + asMixed };
  },
  toMixed() {
    const d = pickD(2, 9), w = ri(1, 4), r = ri(1, d - 1), n = w * d + r;
    return { ask: `${fr(n, d)} 를 대분수로 나타내면?`, scene: wrap(piesSVG(n, d)), choices: shuffle([mv(w, r, d), mv(w + 1, r, d), mv(w, r + 1 < d ? r + 1 : r - 1, d), mv(r, w < d ? w : 1, d)].filter((x, i, a) => a.findIndex(y => y.value === x.value) === i)), answer: `${w} ${r}/${d}`,
             rule: [`${n} ÷ ${d} = ${w} … ${r}`, `${fr(n, d)} = ${mx(w, r, d)}`], hint: `${fr(d, d)} = 1 이에요. ${d} 조각씩 묶으면 몇 판이 될까요?`, sig: 'x' + n + d };
  },
  toImproper() {
    const d = pickD(2, 9), w = ri(1, 4), r = ri(1, d - 1), n = w * d + r;
    return { ask: `${mx(w, r, d)} 를 가분수로 나타내면?`, scene: wrap(piesSVG(n, d)), choices: shuffle([fv(n, d), fv(w + r, d), fv(w * d, d), fv(n + d, d)].filter((x, i, a) => a.findIndex(y => y.value === x.value) === i)), answer: `${n}/${d}`,
             rule: [`자연수 ${w} = ${fr(w * d, d)}`, `${fr(w * d, d)} 와 ${fr(r, d)} → ${fr(n, d)}`, `(${d} × ${w} + ${r} = ${n})`], hint: `1 은 ${fr(d, d)} 예요. 자연수를 조각 수로 바꿔 봐요`, sig: 'y' + n + d };
  },
  wholeTo() {
    const d = pickD(2, 8), w = ri(1, 4), n = w * d;
    return { ask: `자연수 <b>${w}</b>를 분모가 ${d}인 분수로 나타내면?`, scene: wrap(piesSVG(n, d)), choices: shuffle([fv(n, d), fv(w, d), fv(d, w * 1 === d ? d + 1 : w), fv(n + 1, d)].filter((x, i, a) => a.findIndex(y => y.value === x.value) === i)), answer: `${n}/${d}`,
             rule: [`1 = ${fr(d, d)}`, `${w} = ${fr(n, d)}`], hint: `한 판 = ${fr(d, d)}`, sig: 'z' + w + d };
  },
  compare() {
    const d = pickD(3, 9);
    const make = () => Math.random() < .5 ? { t: 'i', n: ri(d + 1, 4 * d) } : { t: 'm', w: ri(1, 3), r: ri(1, d - 1) };
    let A, B, va, vb; do { A = make(); B = make(); va = A.t === 'i' ? A.n : A.w * d + A.r; vb = B.t === 'i' ? B.n : B.w * d + B.r; } while (va === vb || Math.abs(va - vb) > d + 2 || (A.t === B.t));
    const lab = X => X.t === 'i' ? fr(X.n, d) : mx(X.w, X.r, d), txt = X => X.t === 'i' ? `${X.n}/${d}` : `${X.w} ${X.r}/${d}`;
    return { ask: '더 큰 분수는?', scene: wrap(`<div class="big">${lab(A)} <span class="vs">vs</span> ${lab(B)}</div>`), choices: [{ label: lab(A), value: txt(A) }, { label: lab(B), value: txt(B) }], answer: va > vb ? txt(A) : txt(B), once: true,
             rule: [`${lab(A)} = ${fr(va, d)}`, `${lab(B)} = ${fr(vb, d)}`, '같은 모양(가분수끼리)으로 바꿔 분자를 비교해요'], hint: '대분수를 가분수로 바꾸거나, 가분수를 대분수로 바꿔서 비교해요', sig: 'c' + txt(A) + txt(B) };
  },
  largest() {
    const d = pickD(3, 8), vals = shuffle([...new Set([ri(d + 1, 4 * d), ri(d + 1, 4 * d), ri(d + 1, 4 * d), ri(d + 1, 4 * d)])]);
    if (vals.length < 3 || vals.some(v => v % d === 0)) return GEN.largest();
    const opts = vals.map((v, i) => i % 2 ? mv(Math.floor(v / d), v % d, d) : fv(v, d)), big = Math.max(...vals);
    const ans = opts[vals.indexOf(big)].value;
    return { ask: '가장 큰 분수는?', scene: wrap('<div class="emo">🏆</div>'), choices: opts, answer: ans,
             rule: vals.map((v, i) => `${opts[i].label} = ${fr(v, d)}`).concat(['분모가 같으면 분자가 클수록 커요']), hint: '모두 가분수로 바꿔 분자를 비교해요', sig: 'L' + vals.join() + d };
  },
  story() {
    const [nm, e] = pick(D.items), s = pick(D.stories), d = pickD(3, 6), per = ri(2, 6), total = d * per, n = ri(1, d - 1), ans = per * n;
    const t = s.t.replace(/\{item\}/g, nm).replace('{n}', total).replace('{f}', fr(n, d)).replace('{eul}', eulNum(n)).replace(/\{eun\}/g, eun(nm));
    return { ask: t, scene: wrap(`<div class="emo">${e}</div>`), choices: nums(ans, [per, total - ans, ans + per, n * d], { ok: v => v > 0 && v !== ans, fmt: v => v + '개' }), answer: ans + '개', small: true,
             rule: [`${total}의 ${fr(1, d)} = ${per}`, `${total}의 ${fr(n, d)} = ${per} × ${n} = ${ans}개`], hint: '전체를 분모만큼 똑같이 나누고, 분자만큼 가져와요', sig: 's' + nm + total + d + n };
  }
};
// 조사 정리: "~ 는/은" 앞이 분수면 분자 읽기에 맞춰요
for (const k of ['unitOfSet', 'partOfSet', 'measure', 'toMixed', 'toImproper']) {
  const f = GEN[k]; GEN[k] = g => { const q = f(g); q.ask = q.ask.replace(/(<span class="fr"><i>(\d+)<\/i><i>\d+<\/i><\/span>(<\/span>)?) (은\(는\)|는|를)/, (m0, fx, n, _c, p) => fx + ' ' + (p === '를' ? eulNum(+n) : (jong(KN[+n % 10]) ? '은' : '는'))); return q; };
}

Learn.run({ data: D, key: 'fraction2', gen: GEN });
});
