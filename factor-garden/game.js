/* 약수 배수 정원 — 5학년 1학기 약수와 배수
 * 공통 진행은 ../common/learn.js, 문장제·단계는 data.json. 저장 키: factorStars, factorStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const factors = n => { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f; };
const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a / gcd(a, b) * b;
const RICH = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 60, 64, 72];
const KN = '영일이삼사오육칠팔구'; const eunN = n => { const d = n % 10; return d === 0 || '일삼육칠팔'.includes(KN[d]) ? '은' : '는'; };
const listV = arr => ({ label: arr.join(', '), value: arr.join(',') });
// 점 배열: n 개를 r 줄로
function dotsSVG(n, r) {
  const c = n / r, S = Math.min(28, 300 / Math.max(c, r)); let s = '';
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) s += `<circle cx="${14 + j * S + S / 2}" cy="${14 + i * S + S / 2}" r="${S * .36}" fill="${C.dot}"/>`;
  return `<svg viewBox="0 0 ${28 + c * S} ${28 + r * S}" class="dots" role="img" aria-label="${r}줄 ${c}개씩">${s}</svg>`;
}
// 1~50 수 판
function gridHTML(hi, upto = 50, mark = []) {
  return `<div class="grid100">${Array.from({ length: upto }, (_, i) => i + 1).map(n => `<span class="${hi.includes(n) ? 'hi' : ''}${mark.includes(n) ? ' mk' : ''}">${n}</span>`).join('')}</div>`;
}

const GEN = {
  factorList() {
    const n = pick(RICH), f = factors(n), drop = f[ri(1, f.length - 2)], wrong1 = f.filter(x => x !== drop), wrong2 = [...f.slice(0, -1), n * 2], extra = [...f, f[1] * f[f.length - 2] + 1].sort((a, b) => a - b);
    return { ask: `<b>${n}</b>의 약수를 모두 쓴 것은?`, scene: wrap(`<div class="big">${n}</div>`), choices: shuffle([listV(f), listV(wrong1), listV(wrong2.filter(x => x <= n * 2)), listV(extra.filter((x, i, a) => a.indexOf(x) === i))]), answer: f.join(','), small: true, cols: 1,
             rule: [`${n}을 나누어떨어지게 하는 수: ${f.join(', ')}`, `짝지어 찾기: ${f.slice(0, Math.ceil(f.length / 2)).map(x => `${x} × ${n / x}`).join(', ')}`], hint: '곱해서 그 수가 되는 두 수를 짝지어 찾아요', sig: 'L' + n };
  },
  notFactor() {
    const n = pick(RICH), f = factors(n), nf = pick(Array.from({ length: n - 1 }, (_, i) => i + 1).filter(x => n % x)), opts = shuffle([nf, ...sample(f.filter(x => x > 1 && x < n), 3)]);
    if (opts.length < 4) return GEN.notFactor();
    const r = ri(1, 3), rows = f.includes(r * 2) ? r * 2 : f[1];
    return { ask: `<b>${n}</b>의 약수가 <b>아닌</b> 것은?`, scene: wrap(dotsSVG(n, rows)), choices: opts.map(String), answer: String(nf), cols: 4,
             rule: [`${n} ÷ ${nf} = ${Math.floor(n / nf)} … ${n % nf} → 나누어떨어지지 않아요`, `${n}의 약수: ${f.join(', ')}`], hint: '그 수로 나누어 나머지가 0 인지 확인해요', sig: 'N' + n + nf };
  },
  factorCount() {
    const n = pick(RICH.concat([7, 11, 13, 9, 25, 49])), k = factors(n).length;
    return { ask: `<b>${n}</b>의 약수는 모두 몇 개일까요?`, scene: wrap(`<div class="big">${n}</div>`), choices: nums(k, [k + 1, k - 1, k + 2, Math.floor(n / 2)], { ok: v => v > 0 && v !== k, fmt: v => v + '개' }), answer: k + '개',
             rule: [`${n}의 약수: ${factors(n).join(', ')}`, k === 2 ? '약수가 1과 자기 자신뿐인 수도 있어요' : `모두 ${k}개`], hint: '1부터 차례로 나누어 보세요. 짝으로 찾으면 빠짐없이!', sig: 'C' + n };
  },
  multiplePick() {
    const k = ri(3, 9), m = k * ri(3, 9), wrong = sample([...new Set([m + 1, m - 1, m + 2, m - 2, k * ri(2, 9) + ri(1, k - 1), k + 10])].filter(v => v % k && v > 0), 3);
    return { ask: `<b>${k}</b>의 배수는?`, scene: wrap(`<div class="big">${k} × □</div>`), choices: shuffle([m, ...wrong]).map(String), answer: String(m), cols: 4,
             rule: [`${m} = ${k} × ${m / k} → ${k}의 배수`], hint: `${k}로 나누어떨어지는 수를 찾아요`, sig: 'M' + k + m };
  },
  nthMultiple() {
    const k = ri(3, 12), t = ri(4, 9), v = k * t;
    return { ask: `<b>${k}</b>의 배수를 작은 수부터 쓸 때 <b>${t}번째</b> 수는?`, scene: wrap(`<div class="seq">${[1, 2, 3].map(i => k * i).join(', ')}, …</div>`), choices: nums(v, [k * (t - 1), k * (t + 1), k + t, v + 1], { ok: x => x > 0 && x !== v }), answer: String(v),
             rule: [`${t}번째 배수 = ${k} × ${t} = ${v}`], hint: `${k}의 ${t}배를 구해요`, sig: 'T' + k + t };
  },
  multipleGrid() {
    const k = ri(3, 9), hi = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => n % k === 0), cnt = hi.length;
    return { ask: `1부터 50까지의 수 중 <b>${k}의 배수</b>는 몇 개일까요?`, scene: wrap(gridHTML([])), choices: nums(cnt, [cnt + 1, cnt - 1, 50 - cnt, cnt + 2], { ok: v => v > 0 && v !== cnt, fmt: v => v + '개' }), answer: cnt + '개',
             onReveal: sc => { sc.innerHTML = wrap(gridHTML(hi)); },
             rule: [`50 ÷ ${k} = ${Math.floor(50 / k)} … ${50 % k}`, `→ ${k}의 배수 ${cnt}개`], hint: `50 을 ${k}로 나눈 몫을 생각해 봐요`, sig: 'G' + k };
  },
  relation() {
    const a = ri(2, 9), b = ri(2, 9), n = a * b, ok = Math.random() < .55, x = ok ? a : pick([a + 1, n + a, b * 2 + 1].filter(v => n % v));
    const form = ri(0, 1), txt = form ? `${n}${eunN(n)} ${x}의 배수예요` : `${x}${eunN(x)} ${n}의 약수예요`;
    return { ask: 'O 일까요, X 일까요?', scene: wrap(`<div class="fact">${txt}</div>`), choices: ['⭕ 맞아요', '❌ 틀려요'], answer: n % x === 0 ? '⭕ 맞아요' : '❌ 틀려요', once: true,
             rule: [n % x === 0 ? `${n} = ${x} × ${n / x} → ${x}는 ${n}의 약수, ${n}은 ${x}의 배수` : `${n} ÷ ${x} 는 나누어떨어지지 않아요`], hint: '큰 수를 작은 수로 나누어 봐요', sig: 'R' + n + x + form };
  },
  relationPick() {
    let pairs; for (;;) { const a = ri(2, 12), b = a * ri(2, 6); const bad = () => { const p = ri(2, 15), q = ri(p + 1, 40); return q % p ? [p, q] : null; }; pairs = [[a, b]]; while (pairs.length < 4) { const z = bad(); if (z && !pairs.some(y => y[0] === z[0] && y[1] === z[1])) pairs.push(z); } break; }
    const ans = `${pairs[0][0]}, ${pairs[0][1]}`;
    return { ask: '두 수가 <b>약수와 배수의 관계</b>인 것은?', scene: wrap('<div class="emo">🌱</div>'), choices: shuffle(pairs.map(p => `${p[0]}, ${p[1]}`)), answer: ans, cols: 2,
             rule: [`${pairs[0][1]} = ${pairs[0][0]} × ${pairs[0][1] / pairs[0][0]}`, '큰 수가 작은 수로 나누어떨어지면 약수와 배수의 관계'], hint: '큰 수를 작은 수로 나누어떨어지는지 보세요', sig: 'P' + ans };
  },
  commonFactors() {
    let a, b; do { a = pick(RICH); b = pick(RICH); } while (a === b || gcd(a, b) < 2);
    const cf = factors(gcd(a, b)), fa = factors(a), wrong = [fa, cf.slice(0, -1), [...cf, cf[cf.length - 1] * 2].filter(x => x <= Math.min(a, b))].map(x => x.join(','));
    return { ask: `<b>${a}</b>와 <b>${b}</b>의 공약수를 모두 쓴 것은?`, scene: wrap(`<div class="two"><div><b>${a}의 약수</b>${fa.join(' ')}</div><div><b>${b}의 약수</b>${factors(b).join(' ')}</div></div>`),
             choices: shuffle([cf.join(','), ...wrong].filter((x, i, A) => A.indexOf(x) === i)).map(x => ({ label: x.split(',').join(', '), value: x })), answer: cf.join(','), small: true, cols: 1,
             rule: [`공약수: ${cf.join(', ')}`, `공약수는 최대공약수 ${gcd(a, b)}의 약수와 같아요`], hint: '두 줄에 모두 있는 수를 찾아요', sig: 'F' + a + b };
  },
  gcd() {
    let a, b; do { const g = ri(2, 12); a = g * ri(1, 7); b = g * ri(1, 7); } while (a === b || a < 6 || b < 6);
    const g = gcd(a, b);
    return { ask: `<b>${a}</b>와 <b>${b}</b>의 최대공약수는?`, scene: wrap(`<div class="big sm">${a} · ${b}</div>`), choices: nums(g, [g / 2 | 0 || 1, g * 2, lcm(a, b), Math.min(a, b) === g ? g + 1 : Math.min(a, b), 1].filter(v => v !== g), { ok: v => v > 0 }), answer: String(g),
             rule: [`${a}의 약수: ${factors(a).join(', ')}`, `${b}의 약수: ${factors(b).join(', ')}`, `공통인 것 중 가장 큰 수 → ${g}`], hint: '두 수를 똑같이 나눌 수 있는 가장 큰 수!', sig: 'g' + a + b };
  },
  commonMultiples() {
    let a, b; do { a = ri(2, 9); b = ri(2, 9); } while (a === b || lcm(a, b) > 40);
    const l = lcm(a, b), cm = [l, 2 * l, 3 * l], wrong = [[a * b, a * b * 2, a * b * 3], [l, 2 * l + a, 3 * l], [a * 2, b * 2, l]];
    return { ask: `<b>${a}</b>와 <b>${b}</b>의 공배수를 작은 수부터 3개 쓰면?`, scene: wrap(`<div class="two"><div><b>${a}의 배수</b>${[1, 2, 3, 4, 5, 6].map(i => a * i).join(' ')} …</div><div><b>${b}의 배수</b>${[1, 2, 3, 4, 5, 6].map(i => b * i).join(' ')} …</div></div>`),
             choices: shuffle([cm, ...wrong].map(x => x.join(',')).filter((x, i, A) => A.indexOf(x) === i)).map(x => ({ label: x.split(',').join(', '), value: x })), answer: cm.join(','), small: true, cols: 1,
             rule: [`최소공배수 ${l}`, `공배수는 최소공배수의 배수: ${cm.join(', ')} …`], hint: '두 줄에 모두 나오는 수를 찾아요', sig: 'm' + a + b };
  },
  lcm() {
    let a, b; do { a = ri(2, 15); b = ri(2, 15); } while (a === b || lcm(a, b) > 120 || gcd(a, b) === Math.min(a, b) && Math.random() < .5);
    const l = lcm(a, b);
    return { ask: `<b>${a}</b>와 <b>${b}</b>의 최소공배수는?`, scene: wrap(`<div class="big sm">${a} · ${b}</div>`), choices: nums(l, [a * b, gcd(a, b), l * 2, l + a].filter(v => v !== l), { ok: v => v > 0 }), answer: String(l),
             rule: [`${a}의 배수: ${[1, 2, 3, 4, 5].map(i => a * i).join(', ')} …`, `${b}의 배수: ${[1, 2, 3, 4, 5].map(i => b * i).join(', ')} …`, `공통인 것 중 가장 작은 수 → ${l}`, `(최대공약수 ${gcd(a, b)} × ${a / gcd(a, b)} × ${b / gcd(a, b)} = ${l})`], hint: '큰 수의 배수를 차례로 쓰면서 작은 수로 나누어떨어지는지 봐요', sig: 'l' + a + b };
  },
  gcdStory() {
    const s = pick(D.gcdStories); let a, b; do { const g = ri(3, 12); a = g * ri(2, 6); b = g * ri(2, 6); } while (a === b);
    const g = gcd(a, b);
    return { ask: s.t.replace('{a}', a).replace('{b}', b), scene: wrap(`<div class="emo">${s.e}</div>`), choices: nums(g, [lcm(a, b), g * 2, g / 2 | 0 || 1, a + b], { ok: v => v > 0 && v !== g, fmt: v => v + s.u }), answer: g + s.u, small: true,
             rule: ['남김없이 똑같이 “가장 많이/크게” 나누기 → 최대공약수', `${a}와 ${b}의 최대공약수 = ${g}`], hint: '똑같이 나누는 문제는 약수, 가장 큰 것 → 최대공약수', sig: 'gs' + s.e + a + b };
  },
  lcmStory() {
    const s = pick(D.lcmStories); let a, b; do { a = ri(3, 15); b = ri(3, 15); } while (a === b || lcm(a, b) > 90 || lcm(a, b) === Math.max(a, b));
    const l = lcm(a, b);
    return { ask: s.t.replace('{a}', a).replace('{b}', b), scene: wrap(`<div class="emo">${s.e}</div>`), choices: nums(l, [gcd(a, b), a * b, l * 2, a + b], { ok: v => v > 0 && v !== l, fmt: v => v + s.u }), answer: l + s.u, small: true,
             rule: ['“다시 함께”, “가장 작은 정사각형” → 최소공배수', `${a}와 ${b}의 최소공배수 = ${l}`], hint: '함께 만나는 때는 배수, 처음 만나는 때 → 최소공배수', sig: 'ls' + s.e + a + b };
  }
};

Learn.run({ data: D, key: 'factor', gen: GEN });
});
