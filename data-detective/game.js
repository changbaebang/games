/* 데이터 탐정단 — 5학년 규칙과 대응(1학기) · 평균과 가능성(2학기)
 * 생활 예·자료·가능성 문장·단계는 data.json. 저장 키: data5Stars, data5StarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const fr = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;
// 대응 규칙: y = f(x)
function rule() { const op = pick(['×', '×', '+', '-']), k = op === '×' ? ri(2, 9) : ri(2, 15); return { op, k, f: x => op === '×' ? x * k : op === '+' ? x + k : x - k, s: `□ ${op === '-' ? '−' : op} ${k} = △` }; }
const table = (xs, ys, hide = -1, lab = ['□', '△']) => `<table class="tb"><tr><th>${lab[0]}</th>${xs.map(x => `<td>${x}</td>`).join('')}</tr><tr><th>${lab[1]}</th>${ys.map((y, i) => `<td class="${i === hide ? 'q' : ''}">${i === hide ? '?' : y}</td>`).join('')}</tr></table>`;
function barsSVG(vals, names, avg = null, u = '') {
  const W = 340, H = 200, max = Math.max(...vals) * 1.15, bw = Math.min(46, (W - 40) / vals.length * .6), step = (W - 40) / vals.length;
  let s = `<line x1="30" y1="${H - 24}" x2="${W - 6}" y2="${H - 24}" stroke="#2b2f45" stroke-width="2"/>`;
  vals.forEach((v, i) => { const h = (H - 40) * v / max, x = 30 + step * i + step / 2; s += `<rect x="${x - bw / 2}" y="${H - 24 - h}" width="${bw}" height="${h}" fill="${C.bar}" rx="4"/><text class="v" x="${x}" y="${H - 32 - h}">${v}</text><text class="n" x="${x}" y="${H - 10}">${names[i]}</text>`; });
  if (avg != null) { const y = H - 24 - (H - 40) * avg / max; s += `<line x1="26" y1="${y}" x2="${W - 6}" y2="${y}" stroke="${C.avg}" stroke-width="3" stroke-dasharray="7 5"/><text class="v" x="${W - 30}" y="${y - 10}" fill="${C.avg}">평균 ${avg}${u}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img">${s}</svg>`;
}

const GEN = {
  tableFill() {
    const R = rule(), x0 = ri(R.op === '-' ? R.k + 1 : 1, 6), xs = [0, 1, 2, 3, 4].map(i => x0 + i * (Math.random() < .5 ? 1 : 2)), ys = xs.map(R.f), h = ri(1, 4);
    return { ask: '표의 규칙을 찾아 ? 에 알맞은 수는?', scene: wrap(table(xs, ys, h)), choices: nums(ys[h], [ys[h] + 1, ys[h] - 1, ys[h - 1] + (ys[1] - ys[0]) + 1, xs[h] + R.k + (R.op === '×' ? 0 : 1)], { ok: v => v > 0 }), answer: String(ys[h]),
             rule: [`규칙: ${R.s}`, `${xs[h]} ${R.op === '-' ? '−' : R.op} ${R.k} = ${ys[h]}`], hint: '□ 가 1 커질 때 △ 는 얼마나 커지나요? 곱하기일까, 더하기일까?', sig: 'f' + R.op + R.k + xs.join() };
  },
  tableNext() {
    const R = rule(), xs = [1, 2, 3, 4].map(x => x + (R.op === '-' ? R.k : 0)), ys = xs.map(R.f), x = xs[3] + ri(3, 8), y = R.f(x);
    return { ask: `□ 가 <b>${x}</b>일 때 △ 는?`, scene: wrap(table(xs, ys)), choices: nums(y, [y + R.k, y - 1, x + R.k, R.f(x - 1)].filter(v => v !== y), { ok: v => v > 0 }), answer: String(y),
             rule: [`규칙: ${R.s}`, `${x} ${R.op === '-' ? '−' : R.op} ${R.k} = ${y}`], hint: '표에서 규칙을 찾아 큰 수에도 써요', sig: 'n' + R.op + R.k + x };
  },
  tableRule() {
    const R = rule(), xs = [1, 2, 3, 4, 5].map(x => x + (R.op === '-' ? R.k : 0)), ys = xs.map(R.f);
    const wrong = [`□ + ${ys[0] - xs[0]} = △`, `□ × ${Math.max(2, Math.round(ys[0] / xs[0]))} = △`, `△ ${R.op === '-' ? '−' : R.op} ${R.k} = □`, `□ − ${Math.abs(ys[0] - xs[0]) + 1} = △`].filter(w => w !== R.s);
    return { ask: '□ 와 △ 사이의 대응 관계를 식으로 나타내면?', scene: wrap(table(xs, ys)), choices: shuffle([R.s, ...[...new Set(wrong)].filter(w => { const m = w.match(/^□ ([+−×]) (\d+) = △$/); if (!m) return true; return !xs.every((x, i) => (m[1] === '+' ? x + +m[2] : m[1] === '−' ? x - +m[2] : x * +m[2]) === ys[i]); }).slice(0, 3)]), answer: R.s, cols: 1,
             rule: [`모든 칸에서 ${R.s}`, '한두 칸만 맞는 식이 아니라 모든 칸에 맞는 식을 찾아요'], hint: '첫째 칸만 보지 말고 둘째, 셋째 칸에도 맞는지 확인해요', sig: 'r' + R.op + R.k };
  },
  life() {
    const L = pick(D.life), k = pick(L.k), sym = { '×': '×', '+': '+', '-': '−', '÷': '÷' }[L.op], right = `□ ${sym} ${k} = △`;
    const wrong = [`△ ${sym} ${k} = □`, `□ ${L.op === '×' ? '+' : L.op === '+' ? '×' : L.op === '-' ? '+' : '×'} ${k} = △`, `□ ${L.op === '×' ? '÷' : '−'} ${k} = △`].filter(w => w !== right);
    return { ask: L.t.replace('{k}', k), scene: wrap(`<div class="emo">${L.e}</div>`), choices: shuffle([right, ...new Set(wrong)]).slice(0, 4), answer: right, cols: 1, small: true,
             rule: [right, `예: □ 가 ${L.op === '÷' ? k * 3 : 10} 이면 △ 는 ${L.op === '×' ? 10 * k : L.op === '+' ? 10 + k : L.op === '-' ? 10 - k : 3}`], hint: '□ 에 수를 넣어 보며 △ 가 맞게 나오는지 확인해요', sig: 'l' + L.e + k };
  },
  sticks() {
    const kind = pick(['tri', 'sq', 'line']), per = { tri: 2, sq: 3, line: 1 }[kind], first = { tri: 3, sq: 4, line: 2 }[kind], n = ri(5, 12), ans = first + per * (n - 1);
    const draw = k => { let s = ''; const S = 34;
      if (kind === 'tri') { const P = Array.from({ length: k + 2 }, (_, j) => [10 + j * S / 2, j % 2 ? 10 : 10 + S]); let d = `M${P[0][0]} ${P[0][1]}`; for (let j = 1; j <= k + 1; j++) d += ` L${P[j][0]} ${P[j][1]}`; for (let i = 0; i < k; i++) d += ` M${P[i][0]} ${P[i][1]} L${P[i + 2][0]} ${P[i + 2][1]}`; s += `<path d="${d}" fill="none" stroke="#c0392b" stroke-width="4" stroke-linecap="round"/>`; return `<svg viewBox="0 0 ${30 + (k + 1) * S / 2} 54" class="st">${s}</svg>`; }
      for (let i = 0; i < k; i++) { const x = 10 + i * S; if (kind === 'sq') s += `<path d="M${x} 10h${S}v${S}h-${S}${i === 0 ? 'z' : ''}" fill="none" stroke="#c0392b" stroke-width="4"/>`; if (kind === 'line') s += `<line x1="${x}" y1="${10 + S / 2}" x2="${x + S}" y2="${10 + S / 2}" stroke="#c0392b" stroke-width="4"/><circle cx="${x}" cy="${10 + S / 2}" r="5"/>${i === k - 1 ? `<circle cx="${x + S}" cy="${10 + S / 2}" r="5"/>` : ''}`; } return `<svg viewBox="0 0 ${20 + k * 34} ${54}" class="st">${s}</svg>`; };
    const shape = { tri: '삼각형', sq: '정사각형', line: '점과 선' }[kind], unit = kind === 'line' ? '점' : '성냥개비';
    const counts = [1, 2, 3].map(k => first + per * (k - 1));
    return { ask: `${shape} 모양을 ${kind === 'line' ? '선으로 이어' : '이어 붙여'} 만들어요. <b>${n}개</b>를 만들려면 ${unit}${kind === 'line' ? '은' : '는'} 몇 개 필요할까요?`, scene: wrap(`<div class="steps">${[1, 2, 3].map(k => `<div>${draw(k)}<span>${k}개 → ${counts[k - 1]}${unit === '점' ? '점' : '개'}</span></div>`).join('')}</div>`),
             choices: nums(ans, [first * n, per * n, ans + 1, ans - per], { ok: v => v > 0 && v !== ans, fmt: v => v + '개' }), answer: ans + '개',
             rule: [`하나 늘 때마다 ${per}개씩 늘어요`, `△ = □ × ${per} + ${first - per}`, `${n} × ${per} + ${first - per} = ${ans}`], hint: `하나 늘 때마다 몇 개씩 늘어나는지 보세요`, sig: 's' + kind + n };
  },
  mean() {
    const S = pick(D.averageSets), n = S.names.length, avg = ri(10, 40) * (S.u === '점' ? 2 : 1), vals = Array.from({ length: n }, () => 0);
    let tot = avg * n; for (let i = 0; i < n - 1; i++) { vals[i] = avg + ri(-8, 8); tot -= vals[i]; } vals[n - 1] = tot;
    if (vals.some(v => v <= 0) || Math.abs(vals[n - 1] - avg) > 15) return GEN.mean();
    const sum = avg * n;
    return { ask: `${S.t.replace('{who}', '지우')}의 <b>평균</b>은?`, scene: wrap(barsSVG(vals, S.names)), choices: nums(avg, [Math.round(sum / (n - 1)), avg + 1, avg - 2, sum], { ok: v => v > 0 && v !== avg, fmt: v => v + S.u }), answer: avg + S.u,
             onReveal: sc => { sc.innerHTML = wrap(barsSVG(vals, S.names, avg, S.u)); },
             rule: [`합: ${vals.join(' + ')} = ${sum}`, `자료 수: ${n}`, `평균 = ${sum} ÷ ${n} = ${avg}${S.u}`], hint: '모두 더한 다음 자료의 수로 나눠요', sig: 'm' + vals.join() };
  },
  level() {
    const n = ri(3, 4), avg = ri(4, 9), vals = Array.from({ length: n }, () => avg), names = ['가', '나', '다', '라'].slice(0, n);
    for (let t = 0; t < 4; t++) { const i = ri(0, n - 1), j = ri(0, n - 1), d = ri(1, 3); if (i !== j && vals[j] - d > 0) { vals[i] += d; vals[j] -= d; } }
    if (vals.every(v => v === avg)) return GEN.level();
    return { ask: '막대의 높이를 고르게 하면 한 막대는 몇 칸이 될까요?', scene: wrap(barsSVG(vals, names)), choices: nums(avg, [avg + 1, avg - 1, Math.max(...vals), Math.min(...vals)].filter(v => v !== avg), { ok: v => v > 0, fmt: v => v + '칸' }), answer: avg + '칸',
             onReveal: sc => { sc.innerHTML = wrap(barsSVG(vals, names, avg, '칸')); },
             rule: ['높은 막대에서 낮은 막대로 옮겨 고르게 하면 그 높이가 평균', `(${vals.join(' + ')}) ÷ ${n} = ${avg}`], hint: '높은 곳을 덜어 낮은 곳에 채워 봐요', sig: 'v' + vals.join() };
  },
  missing() {
    const S = pick(D.averageSets), n = S.names.length, avg = ri(10, 30), vals = Array.from({ length: n }, () => avg + ri(-6, 6)), h = ri(0, n - 1);
    vals[h] = 0; vals[h] = avg * n - vals.reduce((s, v) => s + v, 0);
    if (vals[h] <= 0) return GEN.missing();
    const shown = vals.map((v, i) => i === h ? '?' : v);
    return { ask: `${S.t.replace('{who}', '지우')}의 평균이 <b>${avg}${S.u}</b>예요. ? 에 알맞은 수는?`, scene: wrap(`<table class="tb"><tr>${S.names.map(x => `<th>${x}</th>`).join('')}</tr><tr>${shown.map(v => `<td class="${v === '?' ? 'q' : ''}">${v}</td>`).join('')}</tr></table>`),
             choices: nums(vals[h], [avg, vals[h] + n, vals[h] - 1, avg * n], { ok: v => v > 0 && v !== vals[h], fmt: v => v + S.u }), answer: vals[h] + S.u,
             rule: [`전체 합 = 평균 × 자료 수 = ${avg} × ${n} = ${avg * n}`, `? = ${avg * n} − (${vals.filter((_, i) => i !== h).join(' + ')}) = ${vals[h]}`], hint: '평균 × 자료 수 = 합계 를 먼저 구해요', sig: 'x' + vals.join() };
  },
  compareMean() {
    const mk = (n) => { const a = ri(20, 40), v = Array.from({ length: n }, () => a + ri(-6, 6)); const s = v.reduce((p, c) => p + c, 0); return { v, m: s / n }; };
    let A, B; do { A = mk(3); B = mk(4); } while (!Number.isInteger(A.m) || !Number.isInteger(B.m) || A.m === B.m);
    const sumA = A.v.reduce((p, c) => p + c, 0), sumB = B.v.reduce((p, c) => p + c, 0), ans = A.m > B.m ? '가 모둠' : '나 모둠';
    return { ask: '모둠별 고리 던지기 점수예요. <b>평균</b>으로 비교하면 더 잘한 모둠은?', scene: wrap(`<div class="grp"><div><b>가 모둠 (3명)</b>${A.v.join(', ')}점</div><div><b>나 모둠 (4명)</b>${B.v.join(', ')}점</div></div>`),
             choices: ['가 모둠', '나 모둠'], answer: ans, once: true,
             rule: [`가: ${sumA} ÷ 3 = ${A.m}점`, `나: ${sumB} ÷ 4 = ${B.m}점`, '사람 수가 다르면 합계가 아니라 평균으로 비교해요'], hint: '사람 수가 달라요. 합보다 평균!', sig: 'c' + A.v.join() + B.v.join() };
  },
  chanceWord() {
    const [t, k] = pick(D.chances);
    return { ask: '일이 일어날 가능성을 말로 나타내면?', scene: wrap(`<div class="fact">${t}</div>`), choices: D.chanceWords, answer: D.chanceWords[k], small: true, cols: 1,
             rule: [`→ ${D.chanceWords[k]}`], hint: '절대 안 일어나면 불가능, 꼭 일어나면 확실, 둘 중 하나면 반반!', sig: 'w' + t };
  },
  chanceNum() {
    const [t, k] = pick(D.chances.filter(c => [0, 2, 4].includes(c[1]))), val = { 0: '0', 2: '1/2', 4: '1' }[k];
    return { ask: '일이 일어날 가능성을 수로 나타내면?', scene: wrap(`<div class="fact">${t}</div>`), choices: [{ label: '0', value: '0' }, { label: fr(1, 2), value: '1/2' }, { label: '1', value: '1' }], answer: val,
             rule: ['불가능하다 → 0, 반반이다 → 1/2, 확실하다 → 1'], hint: '가능성을 0 부터 1 사이의 수로!', sig: 'k' + t };
  },
  spinner() {
    const n = pick([2, 4, 6, 8]), colors = ['#e5533d', '#3d74e5', '#2fa36b', '#f0a020'], kind = pick(['all', 'half', 'none']);
    const segs = Array.from({ length: n }, (_, i) => kind === 'all' ? colors[0] : kind === 'none' ? colors[1 + (i % 2)] : i % 2 ? colors[0] : colors[1]);
    let s = ''; segs.forEach((c, i) => { const a0 = i / n * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / n * Math.PI * 2 - Math.PI / 2; s += `<path d="M0 0 L${Math.cos(a0) * 90} ${Math.sin(a0) * 90} A90 90 0 0 1 ${Math.cos(a1) * 90} ${Math.sin(a1) * 90} Z" fill="${c}" stroke="#fff" stroke-width="3"/>`; });
    s += `<path d="M0 -10 L60 0 L0 10 Z" fill="#2b2f45"/><circle r="8" fill="#2b2f45"/>`;
    const ans = kind === 'all' ? '1' : kind === 'half' ? '1/2' : '0';
    return { ask: '화살이 <b>빨간색</b>에 멈출 가능성을 수로 나타내면?', scene: wrap(`<svg viewBox="-100 -100 200 200" class="spin">${s}</svg>`), choices: [{ label: '0', value: '0' }, { label: fr(1, 2), value: '1/2' }, { label: '1', value: '1' }], answer: ans,
             rule: [kind === 'all' ? '모두 빨간색 → 확실하다 → 1' : kind === 'half' ? '빨간색이 절반 → 반반이다 → 1/2' : '빨간색이 없어요 → 불가능하다 → 0'], hint: '빨간색이 차지하는 부분을 보세요', sig: 'p' + n + kind };
  }
};

Learn.run({ data: D, key: 'data5', gen: GEN });
});
