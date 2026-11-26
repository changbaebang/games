/* 단위 탐험대 — 문제 만들기와 그림
 * 공통 진행은 ../common/learn.js, 단계·어림 물건·단위 짝은 data.json
 * 저장 키: unitStars, unitStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U;
const SP = u => /[가-힣]/.test(u) ? '' : ' ';            // 'cm' 은 "3 cm", '분' 은 "3분"
const q2 = (v, u) => `${v}${SP(u)}${u}`;
const mixed = (a, A, b, B) => b ? `${q2(a, A)} ${q2(b, B)}` : q2(a, A);
const fmtN = v => Number.isInteger(v) ? String(v) : String(v);
// 받침이 있으면 '은', 없으면 '는'
const eun = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? '은' : '는'); };
const big = t => `<div class="box"><div class="emo">${t}</div></div>`;

// 자: 0~cm 까지, 물건은 s~e (mm)
function ruler(s, e, cm = 10) {
  const W = 34, px = mm => 20 + mm * W / 10; let t = '';
  t += `<rect x="${px(s)}" y="18" width="${px(e) - px(s)}" height="30" rx="8" fill="#ffcf3f" stroke="#c79400" stroke-width="2"/>`;
  t += `<rect x="6" y="60" width="${cm * W + 28}" height="66" rx="6" fill="#fff6d8" stroke="#b89a4a" stroke-width="2"/>`;
  for (let m = 0; m <= cm * 10; m++) { const x = px(m), L = m % 10 === 0 ? 24 : m % 5 === 0 ? 16 : 10; t += `<line x1="${x}" y1="60" x2="${x}" y2="${60 + L}" stroke="#3a3a3a" stroke-width="${m % 10 ? 1 : 1.8}"/>`; if (m % 10 === 0) t += `<text class="rl" x="${x}" y="104">${m / 10}</text>`; }
  t += `<line x1="${px(s)}" y1="48" x2="${px(s)}" y2="62" stroke="#ef6a3a" stroke-dasharray="3 3" stroke-width="2"/><line x1="${px(e)}" y1="48" x2="${px(e)}" y2="62" stroke="#ef6a3a" stroke-dasharray="3 3" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${cm * W + 40} 132" role="img" aria-label="자">${t}</svg>`;
}

const GEN = {
  estimate(g) {
    const [emo, name, v, unit] = pick(D.objects[g.measure]), units = D.units[g.measure];
    const cands = [...units.filter(u => u !== unit).map(u => q2(fmtN(v), u)), q2(fmtN(v * 10), unit), q2(fmtN(v * 100), unit)];
    const choices = shuffle([q2(fmtN(v), unit), ...cands.slice(0, 3)]);
    return { ask: `${eun(name)} 약 얼마일까요?`, scene: big(emo), choices, answer: q2(fmtN(v), unit),
             rule: [`${name}: 약 ${q2(fmtN(v), unit)}`, g.measure === 'length' ? '1 cm는 손톱 폭쯤, 1 m는 어른 한 걸음쯤, 1 km는 걸어서 15분쯤' : g.measure === 'volume' ? '1 L는 큰 우유 한 통, 1 mL는 몇 방울쯤' : '1 g은 클립 한 개쯤, 1 kg은 큰 우유 한 통쯤, 1 t은 승용차쯤'],
             hint: '다른 물건과 견주어 생각해 봐요', sig: 'e' + name };
  },
  ruler() {
    const L = ri(12, 95), cm = Math.floor(L / 10), mm = L % 10, ans = mixed(cm, 'cm', mm, 'mm');
    const c = [mixed(cm, 'cm', mm ? 10 - mm : 5, 'mm'), mixed(cm + 1, 'cm', mm, 'mm'), mixed(mm || cm + 2, 'cm', cm, 'mm'), mixed(cm, 'cm', mm + 1 < 10 ? mm + 1 : mm - 1, 'mm')];
    return { ask: '노란 막대의 길이는?', scene: `<div class="box">${ruler(0, L)}</div>`, choices: shuffle([ans, ...[...new Set(c)].filter(x => x !== ans)].slice(0, 4)), answer: ans,
             rule: [`큰 눈금 ${cm}칸 = ${cm} cm, 작은 눈금 ${mm}칸 = ${mm} mm`, `${ans} = ${L} mm`], hint: '숫자가 쓰인 큰 눈금은 1 cm, 그 사이 작은 눈금 한 칸은 1 mm예요', sig: 'u' + L };
  },
  rulerShift() {
    const s = ri(1, 4) * 10, L = ri(12, 50), e = s + L, cm = Math.floor(L / 10), mm = L % 10, ans = mixed(cm, 'cm', mm, 'mm');
    const endRead = mixed(Math.floor(e / 10), 'cm', e % 10, 'mm');
    return { ask: '노란 막대의 길이는?<small>막대가 0에서 시작하지 않아요</small>', scene: `<div class="box">${ruler(s, e)}</div>`,
             choices: shuffle([ans, ...[...new Set([endRead, mixed(cm + 1, 'cm', mm, 'mm'), mixed(cm, 'cm', mm + 1 < 10 ? mm + 1 : mm - 1, 'mm')])].filter(x => x !== ans)].slice(0, 4)), answer: ans,
             rule: [`막대는 ${s / 10} cm에서 시작해서 ${endRead}에서 끝나요`, `${endRead} − ${s / 10} cm = ${ans}`], hint: '끝 눈금만 읽으면 안 돼요. 시작한 눈금부터 몇 칸인지 세어 봐요', sig: 'v' + s + L };
  },
  convert(g) {
    const [B, S, f] = pick(g.pairs), mode = pick(['toSmall', 'toMixed', 'whole']);
    const a = ri(1, f >= 1000 ? 9 : f === 60 ? 4 : 9), b = ri(1, f - 1 > 99 ? 99 * (f / 100) : f - 1);
    const bb = f === 1000 ? ri(1, 9) * (Math.random() < .5 ? 100 : 10) + (Math.random() < .3 ? ri(1, 9) : 0) : b;   // 1000 짝은 250, 80, 905 같은 수
    if (mode === 'whole') {
      const ans = a * f;
      return { ask: `${q2(a, B)} = ? ${S}`, scene: '', choices: nums(ans, [a * (f === 60 ? 100 : f / 10 || 6), a * f * 10, a + f, a * 10], { fmt: v => q2(v, S), step: f >= 100 ? f / 10 : 5 }), answer: q2(ans, S),
               rule: [`1${SP(B)}${B} = ${q2(f, S)}`, `${q2(a, B)} = ${q2(ans, S)}`], hint: `1${SP(B)}${B} 는 ${q2(f, S)}예요`, sig: 'w' + B + a };
    }
    const tot = a * f + bb;
    if (mode === 'toSmall') {
      const wrong = [a * (f === 60 ? 100 : f) + bb === tot ? a * 10 + bb : a * (f === 60 ? 100 : f) + bb, a * f * 10 + bb, a + bb, Number(`${a}${bb}`)];
      return { ask: `${mixed(a, B, bb, S)} = ? ${S}`, scene: '', choices: nums(tot, wrong, { fmt: v => q2(v, S), ok: v => v > 0 }), answer: q2(tot, S),
               rule: [`${q2(a, B)} = ${q2(a * f, S)}`, `${q2(a * f, S)} + ${q2(bb, S)} = ${q2(tot, S)}`], hint: `먼저 ${q2(a, B)} 를 ${S}로 바꾼 다음 더해요 (1${SP(B)}${B} = ${q2(f, S)})`, sig: 's' + B + tot };
    }
    const ans = mixed(a, B, bb, S);
    // 흔한 실수: 몇 단위가 하나인지 잘못 알고 나누기(60분을 100분으로, 1000 mL를 100 mL로), 큰 단위 하나 더 세기
    const wrongBase = f === 60 ? 100 : f / 10, c = [mixed(a + 1, B, bb, S), mixed(Math.floor(tot / wrongBase), B, tot % wrongBase, S), mixed(a, B, bb + 1 < f ? bb + 1 : bb - 1, S)];
    return { ask: `${q2(tot, S)} = ? ${B} ? ${S}`, scene: '', choices: shuffle([ans, ...[...new Set(c)].filter(x => x !== ans).slice(0, 3)]), answer: ans, small: true,
             rule: [`${q2(f, S)} = 1${SP(B)}${B}`, `${q2(tot, S)} = ${q2(a * f, S)} + ${q2(bb, S)} = ${ans}`], hint: `${q2(f, S)} 마다 1${SP(B)}${B} 예요. ${q2(tot, S)} 안에 ${q2(f, S)} 가 몇 번 있을까요?`, sig: 'm' + B + tot };
  },
  timeAdd() {
    const h = ri(1, 3), m1 = ri(25, 55), m2 = ri(15, 45), tot = m1 + m2, H = h + Math.floor(tot / 60), M = tot % 60;
    const t = (x, y) => y ? `${x}시간 ${y}분` : `${x}시간`, ans = t(H, M);
    // 1시간 74분처럼 값은 같고 받아올림만 안 한 꼴은 보기에 넣지 않아요(틀린 답이 아니라서)
    const c = [t(H, M + 10 < 60 ? M + 10 : M - 10), t(tot >= 60 ? h : H + 1, M), t(H + 1, M), t(H, M >= 5 ? M - 5 : M + 5)];
    return { ask: `${t(h, m1)} + ${m2}분 = ?`, scene: '', choices: shuffle([ans, ...[...new Set(c)].filter(x => x !== ans).slice(0, 3)]), answer: ans, small: true,
             rule: [`${m1}분 + ${m2}분 = ${tot}분`, tot >= 60 ? `${tot}분 = 1시간 ${tot - 60}분, 받아올려서 ${ans}` : ans], hint: '분끼리 더한 값이 60분을 넘으면 1시간으로 받아올려요', sig: 'a' + h + m1 + m2 };
  }
};

Learn.run({ data: D, key: 'unit', gen: GEN });
});
