/* 곱셈 텃밭 — 5학년 2학기 분수의 곱셈·소수의 곱셈
 * 텃밭 색·이야기·단계는 data.json. 저장 키: mulsStars, mulsStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const fr = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;
function show(n, d) {   // 기약분수·대분수
  const g = gcd(n, d); n /= g; d /= g;
  if (d === 1) return { label: String(n), value: String(n) };
  const w = Math.floor(n / d), r = n % d;
  return w ? { label: `<span class="mx">${w}${fr(r, d)}</span>`, value: `${w} ${r}/${d}` } : { label: fr(n, d), value: `${n}/${d}` };
}
const valOf = v => { const m = String(v).match(/^(?:(\d+) )?(\d+)\/(\d+)$/); return m ? ((+m[1] || 0) * +m[3] + +m[2]) / +m[3] : +v; };
const uniq = a => a.filter((x, i) => x && a.findIndex(y => y && Math.abs(valOf(y.value) - valOf(x.value)) < 1e-9) === i);
const coprime = (lo, hi) => { for (;;) { const d = ri(lo, hi), n = ri(1, d - 1); if (gcd(n, d) === 1) return [n, d]; } };
// 소수: 정수 k 와 소수점 아래 자리 p 로 다뤄 오차 없이
const dec = (k, p) => { const s = String(Math.abs(k)).padStart(p + 1, '0'); const r = p ? s.slice(0, -p) + '.' + s.slice(-p) : s; return r.replace(/\.?0+$/, m => m.startsWith('.') ? '' : m.replace(/0+$/, '')).replace(/\.$/, ''); };
const decOpts = (ans, list) => [...new Set([ans, ...list])].filter(v => v !== '' && v !== 'NaN').slice(0, 4);

/* ---------- 넓이 모형: 1×1 텃밭을 가로 d1, 세로 d2 로 나눠 n1·n2 칠하기 ---------- */
function plotSVG(n1, d1, n2, d2, both = true) {
  const S = 240, X = 40, Y = 20, cw = S / d1, ch = S / d2;
  let s = `<rect x="${X}" y="${Y}" width="${S}" height="${S}" fill="#fff" stroke="${C.edge}" stroke-width="3"/>`;
  for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) { const inA = i < n1, inB = j < n2; s += `<rect x="${X + i * cw}" y="${Y + j * ch}" width="${cw}" height="${ch}" fill="${inA && inB && both ? C.ab : inA ? C.a : inB && both ? C.b : '#fff'}" stroke="${C.edge}" stroke-width="1" stroke-opacity=".5"/>`; }
  s += `<text class="lb" x="${X + n1 * cw / 2}" y="${Y + S + 16}">${n1}/${d1}</text>${both ? `<text class="lb" x="${X - 18}" y="${Y + n2 * ch / 2}">${n2}/${d2}</text>` : ''}`;
  return `<svg viewBox="0 0 ${S + 60} ${S + 44}" class="plot" role="img">${s}</svg>`;
}
// 분수 조각 여러 개 (분수 × 자연수)
function barsSVG(n, d, k) {
  const W = 300, h = 26; let s = '';
  for (let r = 0; r < k; r++) for (let i = 0; i < d; i++) s += `<rect x="${10 + i * W / d}" y="${10 + r * (h + 8)}" width="${W / d}" height="${h}" fill="${i < n ? C.a : '#fff'}" stroke="${C.edge}" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 ${W + 20} ${20 + k * (h + 8)}" class="bars" role="img">${s}</svg>`;
}

const GEN = {
  fracNat() {
    const [n, d] = coprime(3, 9), k = ri(2, 6), ans = show(n * k, d);
    return { ask: `${fr(n, d)} × ${k} 의 값은?`, scene: wrap(barsSVG(n, d, k)), choices: shuffle(uniq([ans, show(n * k, d * k), show(n + k, d), show(n, d * k), show(n * k + 1, d)]).slice(0, 4)), answer: ans.value,
             rule: [`${fr(n, d)} 를 ${k}번 더해요`, `${fr(`${n} × ${k}`, d)} = ${fr(n * k, d)} = ${ans.label}`, '분모는 그대로, 분자에 자연수를 곱해요'], hint: '분모는 그대로 두고 분자만 곱해요', sig: 'a' + n + d + k };
  },
  mixedNat() {
    const [n, d] = coprime(3, 6), w = ri(1, 3), k = ri(2, 4), ans = show((w * d + n) * k, d);
    return { ask: `<span class="mx">${w}${fr(n, d)}</span> × ${k} 의 값은?`, scene: wrap(barsSVG(n, d, 1)), choices: shuffle(uniq([ans, show(w * k * d + n, d), show((w * d + n) * k + d, d), show(w * d + n * k, d)]).slice(0, 4)), answer: ans.value,
             rule: [`자연수끼리: ${w} × ${k} = ${w * k}`, `분수끼리: ${fr(n, d)} × ${k} = ${fr(n * k, d)}`, `더하면 ${ans.label}`, '(또는 가분수로 바꿔서 곱해요)'], hint: '자연수 부분에도 꼭 곱해요!', sig: 'm' + w + n + d + k };
  },
  natFrac() {
    const [n, d] = coprime(2, 8), k = d * ri(1, 6) + (Math.random() < .3 ? ri(1, d - 1) : 0), ans = show(k * n, d);
    return { ask: `${k} × ${fr(n, d)} 의 값은?`, scene: wrap(`<div class="eq">${k}의 ${fr(n, d)}</div>`), choices: shuffle(uniq([ans, show(k * n, d * k), show(k + n, d), show(k * d, n), show(k * n + 1, d)]).slice(0, 4)), answer: ans.value,
             rule: [`${k} × ${fr(n, d)} = ${fr(`${k} × ${n}`, d)} = ${ans.label}`, `${k} 을 ${d}로 나눈 것의 ${n}배와 같아요`], hint: '자연수와 분자를 곱하고 분모는 그대로', sig: 'n' + k + n + d };
  },
  fracFrac() {
    const [n1, d1] = coprime(2, 6), [n2, d2] = coprime(2, 6), ans = show(n1 * n2, d1 * d2);
    return { ask: `${fr(n1, d1)} × ${fr(n2, d2)} 의 값은?`, scene: wrap(plotSVG(n1, d1, n2, d2)),
             choices: shuffle(uniq([ans, show(n1 + n2, d1 + d2), show(n1 * n2, d1 + d2), show(n1 * d2 + n2 * d1, d1 * d2), show(n1 * n2 + 1, d1 * d2)]).slice(0, 4)), answer: ans.value,
             rule: ['분자끼리, 분모끼리 곱해요', `${fr(`${n1} × ${n2}`, `${d1} × ${d2}`)} = ${fr(n1 * n2, d1 * d2)}${show(n1 * n2, d1 * d2).value !== `${n1 * n2}/${d1 * d2}` ? ` = ${ans.label}` : ''}`, `그림: 전체 ${d1 * d2}칸 중 진하게 겹친 ${n1 * n2}칸`], hint: '진하게 겹친 칸이 전체 몇 칸 중 몇 칸인지 세어 봐요', sig: 'f' + n1 + d1 + n2 + d2 };
  },
  unitFrac() {
    const a = ri(2, 9), b = ri(2, 9), ans = show(1, a * b);
    return { ask: `${fr(1, a)} × ${fr(1, b)} 의 값은?`, scene: wrap(plotSVG(1, a, 1, b)), choices: shuffle(uniq([ans, show(1, a + b), show(2, a * b), show(a * b, 1)]).slice(0, 4)), answer: ans.value,
             rule: [`단위분수끼리 곱하면 분모끼리 곱해요: ${fr(1, a * b)}`, '곱하면 더 작아져요'], hint: '1 을 a 로 나눈 것을 다시 b 로 나눠요', sig: 'u' + a + b };
  },
  decNat() {
    const k = ri(2, 9), p = ri(1, 2), x = p === 1 ? ri(1, 9) + (Math.random() < .4 ? ri(1, 9) * 10 : 0) : ri(11, 99), ans = dec(x * k, p);
    return { ask: `${dec(x, p)} × ${k} 의 값은?`, scene: wrap(`<div class="eq">${dec(x, p)} × ${k}</div>`), choices: shuffle(decOpts(ans, [dec(x * k, p + 1), dec(x * k, p - 1 < 0 ? 0 : p - 1) === ans ? dec(x * k + 1, p) : dec(x * k, Math.max(0, p - 1)), dec(x * k + k, p), dec(x + k, p)])), answer: ans,
             rule: [`${x} × ${k} = ${x * k}`, `${dec(x, p)} 는 소수 ${p}자리 → 곱도 소수 ${p}자리: ${ans}`], hint: '소수점을 떼고 자연수처럼 곱한 다음 소수점을 찍어요', sig: 'd' + x + p + k };
  },
  natDec() {
    const k = ri(2, 30), x = ri(1, 9), ans = dec(k * x, 1);
    return { ask: `${k} × ${dec(x, 1)} 의 값은?`, scene: wrap(`<div class="eq">${k} × ${dec(x, 1)}</div>`), choices: shuffle(decOpts(ans, [dec(k * x, 0), dec(k * x, 2), dec(k * x + x, 1), dec(k * x - 1, 1)])), answer: ans,
             rule: [`${k} × ${x} = ${k * x}`, `0.${x} 는 ${x}의 1/10 → ${ans}`, `${k} 보다 작아져요 (1 보다 작은 수를 곱했으니까)`], hint: '0.1 을 곱하면 1/10 이 돼요', sig: 'e' + k + x };
  },
  decDec() {
    const pa = ri(1, 2), pb = 1, a = pa === 1 ? ri(2, 39) : ri(11, 299), b = ri(2, 19), ans = dec(a * b, pa + pb);
    return { ask: `${dec(a, pa)} × ${dec(b, pb)} 의 값은?`, scene: wrap(`<div class="eq">${dec(a, pa)} × ${dec(b, pb)}</div>`),
             choices: shuffle(decOpts(ans, [dec(a * b, pa + pb - 1), dec(a * b, pa + pb + 1), dec(a * b, Math.max(pa, pb)) === ans ? dec(a * b + 1, pa + pb) : dec(a * b, Math.max(pa, pb)), dec(a * b + b, pa + pb)])), answer: ans,
             rule: [`${a} × ${b} = ${a * b}`, `소수점 아래 자리 수: ${pa} + ${pb} = ${pa + pb}`, `→ ${ans}`], hint: '두 수의 소수점 아래 자리 수를 더한 만큼 소수점을 옮겨요', sig: 'q' + a + pa + b };
  },
  point() {
    const a = ri(12, 99), b = ri(2, 99), base = a * b, pa = ri(1, 2), pb = ri(1, 2), ans = dec(base, pa + pb);
    return { ask: `${a} × ${b} = ${base} 이에요. <b>${dec(a, pa)} × ${dec(b, pb)}</b> 의 값은?`, scene: wrap(`<div class="eq sm">${a} × ${b} = ${base}</div>`),
             choices: shuffle(decOpts(ans, [dec(base, pa + pb - 1), dec(base, pa + pb + 1), dec(base, Math.max(pa, pb)) === ans ? dec(base, 0) : dec(base, Math.max(pa, pb))])), answer: ans, cols: 2,
             rule: [`소수점 아래 ${pa}자리 × ${pb}자리 → ${pa + pb}자리`, `${base} → ${ans}`], hint: '소수점 아래 자리 수를 모두 세어 더해요', sig: 'p' + a + b + pa + pb };
  },
  smaller() {
    const x = ri(12, 60), opts = shuffle([['× 0.9', true], ['× 1.2', false], ['× 3', false], ['× 1', false]]).map(([s, small]) => ({ label: `${x} ${s}`, value: s, small }));
    const ans = opts.find(o => o.small).value;
    return { ask: `계산 결과가 <b>${x}보다 작은</b> 것은?`, scene: wrap(`<div class="eq">${x}</div>`), choices: opts.map(o => ({ label: o.label, value: o.value })), answer: ans, cols: 2,
             rule: ['1 보다 작은 수를 곱하면 원래 수보다 작아져요', '1 보다 큰 수를 곱하면 커지고, 1 을 곱하면 그대로'], hint: '곱하는 수가 1 보다 큰지 작은지 보세요', sig: 's' + x + opts.map(o => o.value).join() };
  },
  shift() {
    const x = ri(101, 999), p = 2, mul = pick([[10, 1], [100, 2], [1000, 3], [0.1, -1], [0.01, -2]]), np = p - mul[1], ans = np >= 0 ? dec(x, np) : String(x * 10 ** -np);
    const alt = k => k >= 0 ? dec(x, k) : String(x * 10 ** -k);
    return { ask: `${dec(x, p)} × ${mul[0]} 의 값은?`, scene: wrap(`<div class="eq">${dec(x, p)} × ${mul[0]}</div>`), choices: shuffle(decOpts(ans, [alt(np + 1), alt(np - 1), alt(p + mul[1])])), answer: ans, cols: 2,
             rule: [mul[1] > 0 ? `${mul[0]}을 곱하면 소수점이 오른쪽으로 ${mul[1]}칸` : `${mul[0]}을 곱하면 소수점이 왼쪽으로 ${-mul[1]}칸`, `→ ${ans}`], hint: '0 의 개수(또는 소수점 아래 자리 수)만큼 소수점을 옮겨요', sig: 'h' + x + mul[0] };
  },
  story() {
    const s = pick(D.stories);
    let a, b, ansV, rule;
    if (s.kind === 'dec×nat') { const x = ri(11, 49), k = ri(3, 9); a = dec(x, 1); b = k; ansV = dec(x * k, 1); rule = [`${a} × ${k} = ${ansV}`]; }
    else if (s.kind === 'dec×dec') { const x = ri(11, 49), y = ri(11, 39); a = dec(x, 1); b = dec(y, 1); ansV = dec(x * y, 2); rule = [`${a} × ${b} = ${ansV}`, '넓이 = 가로 × 세로']; }
    else { const [n, d] = coprime(2, 5), k = d * ri(2, 6); a = k; b = fr(n, d); ansV = show(k * n, d).value; rule = [`${k} × ${fr(n, d)} = ${show(k * n, d).label}`]; }
    const isFrac = s.kind === 'nat×frac', ans = isFrac ? show(valOf(ansV) * 6 | 0, 6) : null;
    const opts = isFrac ? [ansV, String(a * 2), String(Math.max(1, valOf(ansV) - 1)), String(valOf(ansV) + 2)] : decOpts(ansV, [String(+ansV * 10), String((+ansV / 10).toFixed(3)).replace(/0+$/, ''), String(Math.round((+ansV + 1) * 100) / 100)]);
    return { ask: s.t.replace('{a}', a).replace('{b}', b), scene: wrap('<div class="emo">🥕</div>'), choices: shuffle([...new Set(opts)]).map(v => ({ label: (isFrac ? show(valOf(v) * 1000 | 0, 1000).label : v) + s.u, value: v })), answer: ansV, small: true,
             rule, hint: '무엇과 무엇을 곱해야 하는지 식을 세워 봐요', sig: 'y' + s.kind + a + b };
  }
};

Learn.run({ data: D, key: 'muls', gen: GEN });
});
