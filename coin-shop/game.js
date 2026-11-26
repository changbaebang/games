/* 동전 가게 — 게임 동작
 * 단계·가격 범위·물건·손님·문구는 data.json 에서 읽어요. 내용을 바꿀 때는 data.json 만 고치면 돼요.
 * 저장(localStorage): coinStars {단계번호: 별}, coinStarTotal (목록 화면 '내 기록'용) */
(async () => {
const HERE = document.currentScript.src;
const $ = id => document.getElementById(id), snd = (...a) => window.Arcade && Arcade.play(...a);

let D;
try { const r = await fetch(new URL('data.json', HERE)); if (!r.ok) throw new Error(r.status); D = await r.json(); }
catch (e) {
  $('stages').innerHTML = '<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';
  console.error('data.json 불러오기 실패', e); return;
}
const STAGES = D.stages, QN = D.questionsPerStage, MAXC = D.maxCoinsOnTray;

// ---------- 도구
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const won = v => v.toLocaleString('ko-KR') + '원';
const hasB = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };   // 마지막 글자 받침 여부(을/를)
const unit = d => d === 1000 ? '장' : '개';
const breakdown = (v, dens) => { const out = []; for (const d of dens) { const k = Math.floor(v / d); if (k) { out.push([d, k]); v -= k * d; } } return out; };
const bdText = b => b.map(([d, k]) => `${d}원 ${k}${unit(d)}`).join(', ');
const group = (list, dens) => dens.map(d => [d, list.filter(x => x === d).length]).filter(x => x[1]);
// data.json 의 price {min,max,step,avoidRoundHundreds} 로 값 하나 뽑기
function rollPrice(p) {
  let v, g = 0;
  do { v = p.min + p.step * ri(0, Math.floor((p.max - p.min) / p.step)); }
  while (p.avoidRoundHundreds && v % 100 === 0 && Math.random() < p.avoidRoundHundreds && ++g < 20);
  return v;
}

let stars = store.get('coinStars', {}); if (!stars || typeof stars !== 'object') stars = {};

// ---------- 손님(문제) 만들기
function makeQ(st) {
  const S = STAGES[st - 1], it = shuffle(D.items.slice());
  if (S.mode === 'change') {
    let r = Math.random(), opt = S.paidWith[S.paidWith.length - 1];
    for (const o of S.paidWith) { if (r < o.chance) { opt = o; break; } r -= o.chance; }
    const paid = opt.money, p = rollPrice(opt.price);
    return { items: [[...it[0], p]], paid, target: paid - p, ask: `${it[0][1]} 주세요!<br>여기 ${won(paid)}이요.`,
             explain: [`받은 돈 ${won(paid)} − 물건값 ${won(p)} = ${won(paid - p)}`] };
  }
  if (S.mode === 'two') {
    const a = rollPrice(S.price), b = rollPrice(S.price), w = it[0][1];
    return { items: [[...it[0], a], [...it[1], b]], target: a + b, ask: `${w}${hasB(w) ? '이랑' : '랑'} ${it[1][1]} 주세요!`,
             explain: [`${won(a)} + ${won(b)} = ${won(a + b)}`] };
  }
  const p = rollPrice(S.price);
  return { items: [[...it[0], p]], target: p, ask: `${it[0][1]} 주세요!`, explain: [] };
}

// ---------- 그리기
function coin(d) { const e = document.createElement('div'); e.className = 'coin c' + d; e.textContent = d === 1000 ? '1000원' : d; return e; }
let stage = 1, qi = 0, results = [], cur = null, tray = [], tries = 0, locked = false, used = new Set();
const S = () => STAGES[stage - 1];

function startStage(n) {
  stage = n; qi = 0; results = []; used = new Set();
  $('stgName').textContent = `${n}단계 · ${S().short}`; show(null);
  const W = $('wallet'); W.innerHTML = '';
  for (const d of S().coins) {
    const b = document.createElement('button'); b.className = 'wbtn'; b.setAttribute('aria-label', d + '원 내기'); b.appendChild(coin(d));
    const l = document.createElement('span'); l.textContent = d + '원'; b.appendChild(l); b.onclick = () => add(d); W.appendChild(b);
  }
  $('trayLabel').textContent = S().mode === 'change' ? '거스름돈' : '낸 돈';
  nextQ();
}
function nextQ() {
  $('fb').hidden = true; locked = false; tries = 0; tray = [];
  let q, g = 0; do { q = makeQ(stage); } while (used.has(q.ask + q.target) && ++g < 20); used.add(q.ask + q.target); cur = q;
  const c = $('cust'); c.textContent = pick(D.customers); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  $('bubble').innerHTML = q.ask;
  const I = $('items'); I.innerHTML = '';
  for (const [e, n, p] of q.items) {
    const d = document.createElement('div'); d.className = 'item';
    d.innerHTML = `<span class="emo" aria-hidden="true">${e}</span><span><small style="display:block;font-size:14px;color:var(--mute)">${n}</small><span class="price">${won(p)}</span></span>`;
    I.appendChild(d);
  }
  if (q.paid) { const g2 = document.createElement('div'); g2.className = 'got'; g2.textContent = '받은 돈'; g2.appendChild(coin(q.paid)); I.appendChild(g2); }
  dots(); renderTray();
}
function dots() {
  const el = $('dots'); el.innerHTML = '';
  for (let i = 0; i < QN; i++) { const d = document.createElement('i'); if (results[i]) d.className = results[i]; else if (i === qi) d.className = 'now'; el.appendChild(d); }
}
function renderTray() {
  const T = $('tray'); T.innerHTML = '';
  const order = S().coins, sorted = tray.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  sorted.forEach(d => { const e = coin(d); e.setAttribute('role', 'button'); e.setAttribute('aria-label', d + '원 빼기'); e.onclick = () => remove(d); T.appendChild(e); });
  const sum = tray.reduce((a, b) => a + b, 0);
  $('trayTotal').textContent = S().showTotal || locked ? won(sum) : (tray.length ? '얼마일까?' : '');
  $('payBtn').disabled = !tray.length || locked; $('clearBtn').disabled = !tray.length || locked;
}
function add(d) {
  if (locked || tray.length >= MAXC) return;
  tray.push(d); snd(d === 1000 ? 'swap' : 'coin'); renderTray();
  const els = $('tray').querySelectorAll('.c' + d); if (els.length) els[els.length - 1].classList.add('new');
}
function remove(d) { if (locked) return; const i = tray.lastIndexOf(d); if (i >= 0) tray.splice(i, 1); snd('select'); renderTray(); }
$('clearBtn').onclick = () => { if (locked) return; tray = []; snd('whoosh'); renderTray(); };

// ---------- 확인: 한 번에 맞히면 o, 고쳐서 맞히면 f, 두 번 틀리면 x 와 함께 정답 보여 주기
$('payBtn').onclick = () => {
  if (locked || !tray.length) return;
  locked = true; tries++;
  const sum = tray.reduce((a, b) => a + b, 0), t = cur.target, fb = $('fb'), dens = S().coins;
  const paidTxt = bdText(group(tray, dens)), best = breakdown(t, dens), bestN = best.reduce((a, [, k]) => a + k, 0);
  fb.hidden = false; renderTray();
  if (sum === t) {
    results[qi] = tries === 1 ? 'o' : 'f'; snd(tries === 1 ? 'coin' : 'level');
    fb.className = 'fb' + (tries === 1 ? '' : ' mid');
    $('fbTitle').textContent = (tries === 1 ? pick(D.praise) : '고쳤어요! 잘했어요') + ' ' + won(t);
    const verb = S().mode === 'change' ? (hasB(paidTxt) ? '을' : '를') + ' 줬어요' : (hasB(paidTxt) ? '으로' : '로') + ' 냈어요';
    const lines = [...cur.explain, paidTxt + verb];
    if (stage > 1) lines.push(tray.length === bestN ? '동전을 가장 적게 썼어요! 👍' : `더 적게 하려면: ${bdText(best)}`);
    $('fbText').innerHTML = '<span>' + lines.join('</span><span>') + '</span>';
    $('nextBtn').textContent = qi < QN - 1 ? '다음 손님' : '결과 보기'; $('nextBtn').onclick = advance;
  } else if (tries === 1) {
    results[qi] = 'x'; snd('bad'); fb.className = 'fb bad';
    $('fbTitle').textContent = sum > t ? `${won(sum - t)}이 많아요` : `${won(t - sum)}이 모자라요`;
    $('fbText').innerHTML = `<span>${S().mode === 'change' ? '준 거스름돈' : '낸 돈'}은 ${won(sum)}이에요.</span><span>돈을 더 넣거나 빼서 고쳐 봐요.</span>`;
    $('nextBtn').textContent = '고쳐 보기'; $('nextBtn').onclick = () => { fb.hidden = true; locked = false; renderTray(); };
  } else {
    snd('bad'); fb.className = 'fb bad'; $('fbTitle').textContent = '이렇게 하면 돼요';
    tray = best.flatMap(([d, k]) => Array(k).fill(d)); renderTray();
    $('fbText').innerHTML = '<span>' + [...cur.explain, `${won(t)} = ${bdText(best)}`].join('</span><span>') + '</span>';
    $('nextBtn').textContent = qi < QN - 1 ? '다음 손님' : '결과 보기'; $('nextBtn').onclick = advance;
  }
  dots(); $('nextBtn').focus({ preventScroll: true });
};
function advance() { if (qi >= QN - 1) return endStage(); qi++; nextQ(); }
addEventListener('keydown', e => { if (!$('fb').hidden && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('nextBtn').click(); } });

// ---------- 단계 끝
function endStage() {
  $('fb').hidden = true;
  const ok = results.filter(r => r === 'o').length, fixed = results.filter(r => r === 'f').length;
  const s = D.starThresholds.filter(n => ok >= n).length;
  stars[stage] = Math.max(stars[stage] || 0, s); store.set('coinStars', stars);
  store.set('coinStarTotal', Object.values(stars).reduce((a, b) => a + b, 0));
  $('eStars').innerHTML = '★'.repeat(s) + '<span style="color:#e8dcc6;text-shadow:none">' + '★'.repeat(3 - s) + '</span>';
  $('eTitle').textContent = D.endTitles[s];
  $('eTxt').textContent = `${stage}단계 · ${S().name}\n손님 ${QN}명 중 ${ok}명은 한 번에 맞혔어요` + (fixed ? `\n${fixed}명은 고쳐서 맞혔어요` : '') + (s < 3 ? `\n별 3개는 ${QN}명 모두 한 번에!` : '');
  $('nextStageBtn').hidden = stage >= STAGES.length || s === 0; $('nextStageBtn').textContent = `${stage + 1}단계로`;
  show('endOv'); snd(s >= 2 ? 'win' : s === 1 ? 'level' : 'lose');
  ($('nextStageBtn').hidden ? $('againBtn') : $('nextStageBtn')).focus();
}
$('nextStageBtn').onclick = () => startStage(stage + 1);
$('againBtn').onclick = () => startStage(stage);
$('pickBtn').onclick = () => { renderStages(); show('titleOv'); };
$('menuBtn').onclick = () => { $('fb').hidden = true; renderStages(); show('titleOv'); };
function show(id) { for (const o of ['titleOv', 'endOv']) $(o).hidden = o !== id; }
function renderStages() {
  const el = $('stages'); el.innerHTML = ''; const next = STAGES.findIndex((_, i) => !stars[i + 1]);
  STAGES.forEach((st, i) => {
    const n = i + 1, s = stars[n] || 0, b = document.createElement('button'); b.className = 'stage' + (i === next ? ' next' : '');
    b.innerHTML = `<span class="no">${n}</span><span class="nm">${st.name}${st.grade3 ? '<span class="tag3">3학년</span>' : ''}<small>${st.sub}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`;
    b.onclick = () => { snd('click'); startStage(n); }; el.appendChild(b);
  });
}
renderStages();
})();
