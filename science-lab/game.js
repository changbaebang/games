/* 과학 탐험대 — 문제 만들기와 그림
 * 공통 진행은 ../common/learn.js, 동물·물질·행성 같은 내용은 모두 data.json
 * 저장 키: scienceStars, scienceStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample } = Learn.U;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eun = w => jong(w) ? '은' : '는', eul = w => jong(w) ? '을' : '를', ga = w => jong(w) ? '이' : '가';
const A = D.animals.map(([n, e, g, legs, note]) => ({ n, e, g, legs, note }));
const big = (html, cls = '') => `<div class="box"><div class="card-big ${cls}">${html}</div></div>`;
const thing = ([n, e]) => ({ label: `<span class="em">${e}</span>${esc(n)}`, value: n, aria: n });
const GROUPS = Object.keys(D.groups);

/* ---------- 순서대로 누르기 (한살이·행성) ---------- */
function orderTap(items, ok) {          // items: [{html, key}] 정답 순서, ok(누른 순서 key 배열)
  const order = shuffle(items.map((_, i) => i)); let picked = [];
  return { mount(el, api) {
    el.innerHTML = `<div class="seq">${items.map((_, i) => `<span class="slot" data-n="${i + 1}"></span>`).join('<i>→</i>')}</div><div class="tiles">${order.map(i => `<button class="tile" data-k="${i}">${items[i].html}</button>`).join('')}</div><button class="sub undo" type="button">⌫ 하나 지우기</button>`;
    const paint = () => { el.querySelectorAll('.seq .slot').forEach((s, j) => { s.innerHTML = picked[j] != null ? items[picked[j]].html : ''; s.classList.toggle('on', picked[j] != null); }); el.querySelectorAll('.tile').forEach(b => { b.disabled = picked.includes(+b.dataset.k); }); };
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => {
      if (api.locked || b.disabled) return; picked.push(+b.dataset.k); Arcade.play('pop'); paint();
      if (picked.length === items.length) { const good = picked.every((k, j) => k === j); setTimeout(() => { api.submit(good, good ? '' : '순서가 조금 달라요.'); if (!good) { picked = []; paint(); } }, 250); }
    });
    el.querySelector('.undo').onclick = () => { if (!api.locked) { picked.pop(); paint(); } };
  } };
}

/* ---------- 그림: 자석 ---------- */
function magnetSVG(l, r, gap = 60) {        // l, r: 'NS' 또는 'SN' (왼쪽 끝부터)
  const bar = (x, p) => `<g transform="translate(${x} 40)">${[0, 1].map(j => `<rect x="${j * 70}" width="70" height="56" fill="${p[j] === 'N' ? '#e5533d' : '#3d74e5'}" ${j ? 'rx="0"' : ''}/><text class="mg" x="${j * 70 + 35}" y="30">${p[j]}</text>`).join('')}<rect width="140" height="56" fill="none" stroke="#2b2f45" stroke-width="3" rx="4"/></g>`;
  return `<svg viewBox="0 0 ${280 + gap + 20} 130" role="img">${bar(10, l)}${bar(150 + gap, r)}<text class="q" x="${150 + gap / 2}" y="68">?</text></svg>`;
}

/* ---------- 그림: 전기 회로 ---------- */
// mode: ok | gap | same | open | closed | thing(이름, 통하는지)
function circuitSVG(mode, lit = false, obj = null) {
  const glow = lit ? `<circle cx="170" cy="62" r="46" fill="#ffe36a" opacity=".55"/>` : '';
  const bulb = `${glow}<circle cx="170" cy="62" r="30" fill="${lit ? '#fff3a0' : '#f4f6fb'}" stroke="#2b2f45" stroke-width="3"/><path d="M160 70 q5 -16 10 0 q5 -16 10 0" fill="none" stroke="${lit ? '#e08a00' : '#8a90a2'}" stroke-width="2.5"/><rect x="154" y="90" width="32" height="20" rx="3" fill="#b8bcc8" stroke="#2b2f45" stroke-width="3"/>`;
  const batt = `<rect x="110" y="210" width="120" height="44" rx="8" fill="#ffcf3f" stroke="#2b2f45" stroke-width="3"/><rect x="230" y="222" width="10" height="20" fill="#2b2f45"/><text class="bt" x="214" y="233">+</text><text class="bt" x="126" y="233">−</text>`;
  // 왼쪽 선: 전구 왼쪽 → 배터리 − / 오른쪽 선: 전구 오른쪽 → 배터리 +
  let L = `M156 104 H60 V232 H110`, R = `M184 104 H280 V232 H240`, extra = '';
  if (mode === 'gap') L = `M156 104 H60 V150 M60 176 V232 H110`;
  if (mode === 'same') L = `M156 104 H60 V180 H236 V222`;
  if (mode === 'open' || mode === 'closed') { R = `M184 104 H280 V140 M280 190 V232 H240`; extra = `<circle cx="280" cy="140" r="5" fill="#2b2f45"/><circle cx="280" cy="190" r="5" fill="#2b2f45"/><line x1="280" y1="190" x2="${mode === 'open' ? 310 : 280}" y2="${mode === 'open' ? 150 : 140}" stroke="#2b2f45" stroke-width="5" stroke-linecap="round"/><text class="lb" x="322" y="168">스위치</text>`; }
  if (obj) { R = `M184 104 H280 V138 M280 192 V232 H240`; extra = `<rect x="244" y="138" width="72" height="54" rx="10" fill="#fff" stroke="#c9cfdc" stroke-width="2"/><text class="oe" x="280" y="160">${obj[1]}</text><text class="lb" x="280" y="184">${esc(obj[0])}</text>`; }
  const wire = d => `<path d="${d}" fill="none" stroke="#d9452b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 350 300" role="img">${wire(L)}${wire(R)}${extra}${bulb}${batt}</svg>`;
}

/* ---------- 그림: 행성 ---------- */
const planetDot = ([n, c, r], s = 1) => `<svg class="pl" viewBox="-30 -30 60 60" width="${Math.round(30 * s)}" height="${Math.round(30 * s)}" aria-hidden="true">${n === '토성' ? `<ellipse rx="${Math.min(29, r * 1.3)}" ry="${r * .35}" fill="none" stroke="#b89a5a" stroke-width="3"/>` : ''}<circle r="${Math.min(r, 26)}" fill="${c}"/></svg>`;
function solarSVG(hi = -1, mark = -1) {
  let s = `<rect width="440" height="120" fill="#141a33" rx="12"/><circle cx="-30" cy="60" r="70" fill="#ffcf3f"/>`;
  D.planets.forEach(([n, c, r], i) => { const x = 62 + i * 49; s += `${n === '토성' ? `<ellipse cx="${x}" cy="56" rx="${r * .8}" ry="${r * .22}" fill="none" stroke="#e6cf8f" stroke-width="2"/>` : ''}<circle cx="${x}" cy="56" r="${r / 1.6}" fill="${c}" ${i === hi ? 'stroke="#fff" stroke-width="3"' : ''}/><text class="pn" x="${x}" y="100">${i === mark ? '?' : n}</text>`; });
  return `<svg viewBox="0 0 440 120" role="img">${s}</svg>`;
}

const GEN = {
  animalGroup() {
    const a = pick(A), others = shuffle(GROUPS.filter(g => g !== a.g)).slice(0, 3);
    return { ask: `<b>${esc(a.n)}</b>${eun(a.n)} 어떤 무리일까?`, scene: big(`<span class="pic">${a.e}</span><span class="nm">${esc(a.n)}</span>`),
             choices: shuffle([a.g, ...others]), answer: a.g,
             rule: [`${a.n}: ${a.g}`, a.note || D.groups[a.g].tip], hint: D.groups[a.g].egg ? '알을 낳을까, 새끼를 낳을까? 몸은 무엇으로 덮여 있을까?' : '새끼를 낳을까, 알을 낳을까 생각해 봐요', sig: 'g' + a.n };
  },
  legCount() {
    const pool = [...A, ...D.notInsects.map(([n, e, legs, note]) => ({ n, e, legs, note, g: '거미' }))], a = pick(pool);
    const ch = shuffle([a.legs, ...shuffle([0, 2, 4, 6, 8].filter(v => v !== a.legs)).slice(0, 3)]).map(String);
    return { ask: `<b>${esc(a.n)}</b>의 다리는 몇 개?`, scene: big(`<span class="pic">${a.e}</span><span class="nm">${esc(a.n)}</span>`),
             choices: shuffle(ch).map(v => ({ label: v + '개', value: v })), answer: String(a.legs),
             rule: [`${a.n}: 다리 ${a.legs}개`, a.g === '곤충' ? '곤충은 모두 다리가 6개예요' : (a.note || (a.legs === 0 ? '다리가 없이 기어가거나 헤엄쳐요' : D.groups[a.g] ? D.groups[a.g].tip : ''))], hint: '곤충은 6개, 새는 2개, 거미는 8개!', sig: 'l' + a.n };
  },
  insectOdd() {
    const ins = sample(A.filter(a => a.g === '곤충'), 3), odd = pick([...D.notInsects.map(([n, e, , note]) => ({ n, e, note })), ...A.filter(a => ['조류', '포유류'].includes(a.g) && a.legs)]);
    const all = shuffle([...ins, odd]);
    return { ask: '<b>곤충이 아닌</b> 것은?', scene: big('<span class="mini">머리 · 가슴 · 배 / 다리 6개</span><span class="pic">🔍</span>'),
             choices: all.map(a => ({ label: `<span class="em">${a.e}</span>${esc(a.n)}`, value: a.n })), answer: odd.n, tall: true,
             rule: [odd.note || `${odd.n}${eun(odd.n)} 다리가 ${odd.legs}개라 곤충이 아니에요`, D.groups['곤충'].tip], hint: '다리 수와 몸의 생김새를 떠올려 봐요', sig: 'o' + all.map(a => a.n).join() };
  },
  cycleOrder() {
    const c = pick(D.cycles), items = c.steps.map(([n, e]) => ({ html: `${e ? `<span class="em">${e}</span>` : ''}${esc(n)}` }));
    return { ask: `<b>${esc(c.name)}</b>의 한살이, 순서대로 눌러요`, scene: big(`<span class="pic">${c.steps[c.steps.length - 1][1] || '🔄'}</span><span class="nm">${esc(c.name)}</span>`),
             custom: orderTap(items), _n: items.length,
             rule: [c.steps.map(s => s[0]).join(' → ')], hint: '가장 작고 처음인 것부터 다 자란 모습까지', sig: 'c' + c.name };
  },
  cycleNext() {
    const c = pick(D.cycles), i = ri(0, c.steps.length - 2), nx = c.steps[i + 1][0], others = shuffle(c.steps.filter((_, j) => j !== i + 1 && j !== i).map(s => s[0])).slice(0, 2);
    const extra = shuffle(D.cycles.filter(x => x !== c).flatMap(x => x.steps.map(s => s[0])).filter(n => n !== nx && !others.includes(n) && n !== c.steps[i][0]))[0];
    return { ask: `${esc(c.name)}: <b>${esc(c.steps[i][0])}</b> 다음에는?`, scene: big(`<span class="pic">${c.steps[i][1] || c.steps[c.steps.length - 1][1]}</span><span class="nm">${esc(c.steps[i][0])}</span>`),
             choices: shuffle([nx, ...others, extra].slice(0, 4)), answer: nx, small: true,
             rule: [c.steps.map(s => s[0] === nx ? `<b>${s[0]}</b>` : s[0]).join(' → ')], hint: '자라는 순서를 처음부터 떠올려 봐요', sig: 'n' + c.name + i };
  },
  plantPart() {
    const [p, job] = pick(D.plantParts), flip = Math.random() < .5;
    return flip
      ? { ask: `<b>${esc(p)}</b>${eun(p)} 무슨 일을 할까?`, scene: big('<span class="pic">🌱</span>'), choices: shuffle(D.plantParts.map(x => x[1])), answer: job, small: true, cols: 1,
          rule: [`${p}: ${job}`], hint: '물은 아래에서 위로, 양분은 잎에서!', sig: 'p' + p + 1 }
      : { ask: `"${esc(job)}" 하는 곳은?`, scene: big('<span class="pic">🌻</span>'), choices: shuffle(D.plantParts.map(x => x[0])), answer: p,
          rule: [`${p}: ${job}`], hint: '물은 아래에서 위로, 양분은 잎에서!', sig: 'p' + p + 0 };
  },
  stateOf() {
    const [n, e, s] = pick(D.states);
    return { ask: `<b>${esc(n)}</b>${eun(n)} 고체, 액체, 기체 중 무엇?`, scene: big(`<span class="pic">${e}</span><span class="nm">${esc(n)}</span>`),
             choices: ['고체', '액체', '기체'], answer: s, rule: [`${n}: ${s}`, `${s}${eun(s)} ${D.stateTips[s]}`], hint: '모양이 그대로인지, 흐르는지, 퍼져 나가는지 생각해요', sig: 's' + n };
  },
  changeName() {
    const [txt, e, a] = pick(D.changeCases), keys = Object.keys(D.changes), others = shuffle(keys.filter(k => k !== a)).slice(0, 3);
    return { ask: '어떤 상태 변화일까?', scene: big(`<span class="pic">${e}</span><span class="nm">${esc(txt)}</span>`),
             choices: shuffle([a, ...others]).map(k => ({ label: `${k}<small>${D.changes[k].split(' (')[0]}</small>`, value: k })), answer: a, small: true,
             rule: [`${a}: ${D.changes[a]}`], hint: '처음 상태와 나중 상태가 각각 고체·액체·기체 중 무엇일까요?', sig: 'v' + txt };
  },
  magnetPick() {
    const yes = Math.random() < .6, right = pick(yes ? D.magnetic : D.nonMagnetic), wrong = sample(yes ? D.nonMagnetic : D.magnetic, 3);
    return { ask: yes ? '자석에 <b>붙는</b> 물체는?' : '자석에 <b>붙지 않는</b> 물체는?', scene: big('<span class="pic">🧲</span>'),
             choices: shuffle([right, ...wrong]).map(thing), answer: right[0], tall: true,
             rule: ['자석에는 철로 된 물체가 붙어요', `${right[0]}${eun(right[0])} ${yes ? '철이라 붙어요' : '철이 아니라 붙지 않아요'}`, ...(right[0] === '동전' || wrong.some(w => w[0] === '동전') ? ['동전은 구리 같은 금속이지만 철이 아니라 안 붙어요'] : [])], hint: '쇠(철)로 만든 것을 찾아요', sig: 'm' + right[0] + yes };
  },
  magnetPoles() {
    const l = pick(['NS', 'SN']), r = pick(['NS', 'SN']), face = l[1] + r[0], pull = face[0] !== face[1];
    return { ask: '두 자석을 가까이 하면?', scene: big(magnetSVG(l, r), 'wide'),
             choices: ['끌어당겨요', '밀어내요'], answer: pull ? '끌어당겨요' : '밀어내요',
             rule: [`마주 보는 극: ${face[0]}극과 ${face[1]}극`, pull ? '다른 극끼리는 끌어당겨요' : '같은 극끼리는 밀어내요'], hint: '가운데에서 마주 보는 두 극의 색을 보세요', sig: 'p' + l + r };
  },
  circuitLit() {
    const modes = ['ok', 'gap', 'same', 'open', 'closed', 'thing', 'thing'], mode = pick(modes);
    let lit, why, obj = null;
    if (mode === 'thing') { const c = Math.random() < .5; obj = pick(c ? D.conductors : D.insulators); lit = c; why = `${obj[0]}${eun(obj[0])} 전기가 ${c ? '통해요' : '통하지 않아요'}`; }
    else ({ lit, why } = { ok: { lit: true, why: '전구·전선·전지가 끊어지지 않고 한 바퀴 이어졌어요' }, gap: { lit: false, why: '전선이 끊어져 있어요' }, same: { lit: false, why: '두 전선이 모두 전지의 + 극에만 이어졌어요. +극과 −극에 하나씩!' }, open: { lit: false, why: '스위치가 열려 있어서 길이 끊겼어요' }, closed: { lit: true, why: '스위치를 닫아 길이 이어졌어요' } }[mode]);
    return { ask: '전구에 불이 켜질까?', scene: big(circuitSVG(mode, false, obj), 'wide'), choices: ['💡 켜져요', '🌑 안 켜져요'], answer: lit ? '💡 켜져요' : '🌑 안 켜져요',
             onReveal: sc => { sc.innerHTML = big(circuitSVG(mode, lit, obj), 'wide'); },
             rule: [why, '전기가 흐르려면 전지 + 극 → 전구 → 전지 − 극까지 길이 한 바퀴 이어져야 해요'], hint: '전선을 손가락으로 따라가 봐요. 끊긴 곳이 있나요?', sig: 'k' + mode + (obj ? obj[0] : '') + ri(0, 2) };
  },
  conductor() {
    const yes = Math.random() < .6, right = pick(yes ? D.conductors : D.insulators), wrong = sample(yes ? D.insulators : D.conductors, 3);
    return { ask: yes ? '전기가 <b>통하는</b> 물체는?' : '전기가 <b>통하지 않는</b> 물체는?', scene: big('<span class="pic">🔋</span>'),
             choices: shuffle([right, ...wrong]).map(thing), answer: right[0], tall: true,
             rule: ['쇠·구리·알루미늄 같은 금속은 전기가 잘 통해요', '나무·플라스틱·고무·유리·종이는 잘 통하지 않아요'], hint: '금속으로 만든 것일까요?', sig: 'e' + right[0] + yes };
  },
  planetOrder() {
    const items = D.planets.map(p => ({ html: `${planetDot(p, 1)}<span>${p[0]}</span>` }));
    return { ask: '태양에서 가까운 순서대로 눌러요', scene: `<div class="box"><div class="sunbar">☀️ 태양 → → → 멀리</div></div>`,
             custom: orderTap(items), _n: items.length,
             rule: ['수성 → 금성 → 지구 → 화성 → 목성 → 토성 → 천왕성 → 해왕성', '“수금지화목토천해” 로 외워요'], hint: '“수금지화목토천해”', sig: 'o' + ri(0, 99) };
  },
  planetFact() {
    const i = ri(0, 7), p = D.planets[i], others = sample(D.planets.filter((_, j) => j !== i), 3);
    return { ask: `<b>${esc(p[3])}</b>, 어느 행성일까?`, scene: `<div class="box">${solarSVG(-1, -1)}</div>`,
             choices: shuffle([p, ...others]).map(x => ({ label: `${planetDot(x, 1.2)} ${x[0]}`, value: x[0] })), answer: p[0], tall: false,
             onReveal: sc => { sc.innerHTML = `<div class="box">${solarSVG(i)}</div>`; },
             rule: [`${p[0]}: ${p[3]}`, `태양에서 ${i + 1}번째 행성이에요`], hint: '그림의 색과 크기를 살펴봐요', sig: 'f' + i };
  },
  planetNext() {
    const i = ri(0, 6), before = Math.random() < .3 && i > 0, k = before ? i - 1 : i + 1, base = before ? i : i;
    const ans = D.planets[k][0], others = sample(D.planets.filter((_, j) => j !== k && j !== base), 3).map(x => x[0]);
    return { ask: `<b>${D.planets[base][0]}</b> 바로 ${before ? '안쪽(태양 쪽)' : '바깥쪽'} 행성은?`, scene: `<div class="box">${solarSVG(base, k)}</div>`,
             choices: shuffle([ans, ...others]), answer: ans,
             onReveal: sc => { sc.innerHTML = `<div class="box">${solarSVG(k)}</div>`; },
             rule: ['수성 → 금성 → 지구 → 화성 → 목성 → 토성 → 천왕성 → 해왕성'], hint: '“수금지화목토천해”', sig: 'x' + base + before };
  }
};

Learn.run({ data: D, key: 'science', gen: GEN });
});
