/* 한자 서당 — 문제 만들기
 * 공통 진행은 ../common/learn.js, 한자·훈음·한자어는 모두 data.json
 * 저장 키: hanjaStars, hanjaStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample } = Learn.U;
const CH = {}; D.chars.forEach(([c, hun, eum, g]) => { CH[c] = { c, hun, eum, g }; });
const ALL = D.chars.map(x => x[0]), NUMS = ALL.filter(c => CH[c].g === 'num');
const NUMV = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 萬: 10000 };
const HU = c => `${CH[c].hun} ${CH[c].eum}`;                      // 훈음: 물 수
const hz = c => `<span class="hz">${c}</span>`;
const big = (html, sub = '') => `<div class="box"><div class="card-big">${html}${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>`;
const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eun = w => jong(w) ? '은' : '는';
const HEAD = { 륙: '육', 녀: '여', 년: '연', 력: '역', 류: '유' };   // 두음 법칙 (첫소리)
// 닮은 한자 → 같은 묶음 → 나머지 순서로 n-1 개
function similar(c, n = 3, { inSet = true, pool = ALL } = {}) {
  const look = [...new Set(D.lookAlike.filter(g => g.includes(c)).join('').split(''))].filter(x => x !== c && (!inSet || CH[x]) && (pool === ALL || pool.includes(x)));
  const same = pool.filter(x => x !== c && CH[x] && CH[x].g === CH[c].g && !look.includes(x));
  const rest = pool.filter(x => x !== c && !look.includes(x) && !same.includes(x));
  return [...shuffle(look), ...shuffle(same), ...shuffle(rest)].slice(0, n);
}
const hzChoices = (c, others) => shuffle([c, ...others]).map(x => ({ label: hz(x), value: x, aria: CH[x] ? HU(x) : x }));
const ruleOf = c => `${hz(c)} ${HU(c)}`;
const naive = w => w.split('').map(c => CH[c].eum).join('');

const GEN = {
  numToHanja() {
    const c = pick(NUMS), v = NUMV[c];
    return { ask: '이 수를 한자로 쓰면?', scene: big(`<span class="num">${v === 10000 ? '10000' : v}</span>`, v === 10000 ? '만' : ''),
             choices: hzChoices(c, similar(c, 3, { pool: NUMS })), answer: c, tall: true,
             rule: [ruleOf(c)], hint: '一 二 三 은 막대 수, 四 부터는 모양을 떠올려요', sig: 'n' + c };
  },
  hanjaToNum() {
    const c = pick(NUMS), v = NUMV[c], others = similar(c, 3, { pool: NUMS }).map(x => NUMV[x]);
    return { ask: '이 한자가 나타내는 수는?', scene: big(hz(c)),
             choices: shuffle([v, ...others]).map(x => ({ label: x === 10000 ? '10000' : String(x), value: x })), answer: v,
             rule: [ruleOf(c)], hint: `${CH[c].hun}…`, sig: 'h' + c };
  },
  readHanja() {
    const c = pick(ALL.filter(x => CH[x].g !== 'num' || Math.random() < .3));
    // 음이 같거나(日/一) 훈이 같은(日/生) 한자, 닮은 한자의 훈음을 보기로
    const near = ALL.filter(x => x !== c && (CH[x].eum === CH[c].eum || CH[x].hun === CH[c].hun));
    const others = [...new Set([...shuffle(near), ...similar(c, 4)])].filter(x => HU(x) !== HU(c)).slice(0, 3);
    return { ask: '이 한자의 훈과 음은?', scene: big(hz(c)), choices: shuffle([c, ...others]).map(x => ({ label: HU(x), value: x })), answer: c,
             rule: [ruleOf(c), `뜻(훈)은 '${CH[c].hun}', 소리(음)는 '${CH[c].eum}'`], hint: `${D.groupNames[CH[c].g]} 에 관한 한자예요`, sig: 'r' + c };
  },
  findHanja(g) {
    const c = pick(g.hard ? ALL.filter(x => D.lookAlike.some(s => s.includes(x))) : ALL);
    return { ask: `<b>${HU(c)}</b>, 어느 한자일까?`, scene: big(`<span class="hu">${HU(c)}</span>`),
             choices: hzChoices(c, similar(c, 3, { inSet: !g.hard })), answer: c, tall: true,
             rule: [ruleOf(c)], hint: '닮은 한자가 섞여 있어요. 획을 하나하나 비교해 봐요', sig: 'f' + c + !!g.hard };
  },
  picToHanja() {
    const [c, e, why] = pick(D.pictures);
    return { ask: '이 그림에서 생겨난 한자는?', scene: big(`<span class="pic">${e}</span>`), choices: hzChoices(c, similar(c, 3, { pool: D.pictures.map(p => p[0]) })), answer: c, tall: true,
             rule: [ruleOf(c), `${why}${jong(why) ? '을' : '를'} 본떴어요`], hint: '그림의 모양과 닮은 한자를 찾아요', sig: 'p' + c };
  },
  weekday() {
    const [day, c] = pick(D.weekdays), others = sample(D.weekdays.map(w => w[1]).filter(x => x !== c), 3);
    return { ask: `<b>${day}</b>의 '${day[0]}' 는 어느 한자?`, scene: big(`<span class="cal">📅</span><span class="hu">${day}</span>`),
             choices: hzChoices(c, others), answer: c, tall: true,
             rule: [`${day} = ${c}曜日`, ruleOf(c), '月火水木金土日 → 월화수목금토일'], hint: `${day[0]}: ${D.chars.find(x => x[0] === c)[1]}`, sig: 'w' + day };
  },
  wordRead(g) {
    const list = D.words.filter(w => g.special ? /읽어요/.test(w[2] || '') : !/읽어요/.test(w[2] || '')), [w, rd, mean] = pick(list);
    const cands = [naive(w), (HEAD[naive(w)[0]] || '') + naive(w).slice(1), w.split('').map(c => CH[c].hun).join(' '), naive(w).split('').reverse().join('')];
    const swap = w.split('').map(c => { const s = similar(c, 1)[0]; return s && Math.random() < .5 ? CH[s].eum : CH[c].eum; }).join('');
    const others = [...new Set([...cands, swap, ...shuffle(D.words.map(x => x[1]))])].filter(x => x && x !== rd && x.length >= 2).slice(0, 3);
    return { ask: '이 한자어를 어떻게 읽을까?', scene: big(`<span class="hz word">${w}</span>`), choices: shuffle([rd, ...others]), answer: rd,
             rule: [`${w} → ${rd}${mean && !/읽어요/.test(mean) ? ` (${mean})` : ''}`, ...(g.special ? [mean] : w.split('').map(ruleOf))], hint: '한 글자씩 음을 떠올려 이어 읽어요', sig: 'd' + w };
  },
  wordBlank() {
    const [w, rd, mean] = pick(D.words.filter(x => x[0].length === 2 && !/읽어요/.test(x[2] || ''))), i = ri(0, 1), c = w[i];
    const shown = w.split('').map((x, j) => j === i ? '<u>？</u>' : x).join('');
    return { ask: `<b>${rd}</b>${mean ? ` (${mean})` : ''}, 빈칸의 한자는?`, scene: big(`<span class="hz word">${shown}</span>`, rd),
             choices: hzChoices(c, similar(c, 3)), answer: c, tall: true,
             rule: [`${w} → ${rd}`, ruleOf(c)], hint: `'${rd[i]}' 소리가 나는 한자를 찾아요`, sig: 'b' + w + i };
  },
  wordMeaning() {
    const [w, rd, mean] = pick(D.words.filter(x => x[2] && !/읽어요/.test(x[2]) && x[2] !== x[1])), others = sample(D.words.filter(x => x[2] && !/읽어요/.test(x[2]) && x[0] !== w && x[2] !== x[1]).map(x => x[2]), 3);
    return { ask: `<b>${w}(${rd})</b>의 뜻은?`, scene: big(`<span class="hz word">${w}</span>`, rd), choices: shuffle([mean, ...others]), answer: mean, small: true, cols: 1,
             rule: [`${w}(${rd}): ${mean}`, ...w.split('').map(ruleOf)], hint: '한 글자씩 훈(뜻)을 떠올려 이어 봐요', sig: 'm' + w };
  },
  compass() {
    const dirs = [['北', 0, '위쪽(북쪽)'], ['東', 90, '오른쪽(동쪽), 해가 뜨는 쪽'], ['南', 180, '아래쪽(남쪽)'], ['西', 270, '왼쪽(서쪽), 해가 지는 쪽']], k = ri(0, 3), [c, , where] = dirs[k];
    const sun = Math.random() < .3 && (c === '東' || c === '西');
    let s = `<circle cx="120" cy="120" r="92" fill="#fff8e6" stroke="#8a6a3a" stroke-width="4"/><path d="M120 40 L134 120 L120 200 L106 120Z" fill="#e8d6b0"/><path d="M40 120 L120 106 L200 120 L120 134Z" fill="#e8d6b0"/><path d="M120 40 L134 120 L106 120Z" fill="#d9452b"/>`;
    dirs.forEach(([d, a], j) => { const r = 106, x = 120 + r * Math.sin(a * Math.PI / 180), y = 120 - r * Math.cos(a * Math.PI / 180); s += `<circle cx="${x}" cy="${y}" r="19" fill="${j === k ? '#ffcf3f' : '#fff'}" stroke="#8a6a3a" stroke-width="3"/><text class="hzs" x="${x}" y="${y + 1}">${j === k ? '?' : d}</text>`; });
    return { ask: sun ? `해가 ${c === '東' ? '뜨는' : '지는'} 쪽, <b>?</b> 에 알맞은 한자는?` : '나침반의 <b>?</b> 에 알맞은 한자는?', scene: `<div class="box"><svg viewBox="-10 -10 260 260" class="cmp" role="img">${s}</svg></div>`,
             choices: hzChoices(c, dirs.map(d => d[0]).filter(x => x !== c)), answer: c, cols: 4,
             rule: [ruleOf(c), `${where}`, '東西南北: 동서남북'], hint: '빨간 바늘이 가리키는 위쪽이 北(북)이에요', sig: 'c' + c + sun };
  }
};

Learn.run({ data: D, key: 'hanja', gen: GEN });
});
