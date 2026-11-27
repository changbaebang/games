/* 컴퍼스 공방 — 원 (3학년 2학기)
 * 공통 진행은 ../common/learn.js, 색·O/X 문장·단계는 data.json
 * 저장 키: circleStars, circleStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const cm = v => `${v} cm`;
const half = v => Number.isInteger(v) ? v : v.toFixed(1);

/* ---------- 원 그림: 부분 이름 ---------- */
function partSVG(kind, rot) {
  const cx = 160, cy = 150, r = 110, a = rot, p = (t, rr = r) => [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr];
  let hi = '';
  if (kind === '반지름') { const [x, y] = p(a); hi = `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="hi"/><circle cx="${x}" cy="${y}" r="5" fill="${C.hi}"/>`; }
  if (kind === '지름') { const [x1, y1] = p(a), [x2, y2] = p(a + Math.PI); hi = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="hi"/><circle cx="${x1}" cy="${y1}" r="5" fill="${C.hi}"/><circle cx="${x2}" cy="${y2}" r="5" fill="${C.hi}"/>`; }
  if (kind === '원의 중심') hi = `<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${C.hi}" stroke-width="4"/><path d="M${cx + 40} ${cy - 40} L${cx + 14} ${cy - 14}" class="arrow"/>`;
  if (kind === '지름이 아닌 선분') { const [x1, y1] = p(a), [x2, y2] = p(a + 1.9); hi = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="hi"/><circle cx="${x1}" cy="${y1}" r="5" fill="${C.hi}"/><circle cx="${x2}" cy="${y2}" r="5" fill="${C.hi}"/>`; }
  return `<svg viewBox="0 0 320 300" class="cv" role="img"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.fill}" stroke="${C.circle}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="4" fill="${C.ink}"/><text class="lb" x="${cx - 14}" y="${cy + 18}">ㅇ</text>${hi}</svg>`;
}

/* ---------- 자와 원: 반지름·지름 길이 ---------- */
function rulerCircle(r, show, label) {          // show: 'r' 반지름 표시 / 'd' 지름 표시
  const S = 22, cx = 40 + r * S, cy = 30 + r * S, W = 2 * r * S + 80;
  let s = `<circle cx="${cx}" cy="${cy}" r="${r * S}" fill="${C.fill}" stroke="${C.circle}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="${C.ink}"/>`;
  if (show === 'r') s += `<line x1="${cx}" y1="${cy}" x2="${cx + r * S}" y2="${cy}" class="hi"/><text class="dim" x="${cx + r * S / 2}" y="${cy - 12}">${label}</text>`;
  else s += `<line x1="${cx - r * S}" y1="${cy}" x2="${cx + r * S}" y2="${cy}" class="hi"/><text class="dim" x="${cx}" y="${cy - 12}">${label}</text>`;
  return `<svg viewBox="0 0 ${W} ${2 * r * S + 60}" class="cv" style="max-width:min(94vw,${Math.min(420, W * 1.4)}px)" role="img">${s}</svg>`;
}

/* ---------- 가장 긴 선분 ---------- */
function chordsSVG(order) {
  const cx = 160, cy = 150, r = 115, labels = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];
  const segs = [[0.3, 0.3 + Math.PI], [2.2, 3.4], [4.0, 5.9], [1.0, 2.0]];     // 첫 번째가 지름
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.fill}" stroke="${C.circle}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="4" fill="${C.ink}"/>`;
  order.forEach((k, i) => { const [a, b] = segs[k], x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r, x2 = cx + Math.cos(b) * r, y2 = cy + Math.sin(b) * r;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${['#e5533d', '#2fa36b', '#9b5de5', '#f0a020'][i]}" stroke-width="4"/><text class="lb" x="${(x1 + x2) / 2 + 12}" y="${(y1 + y2) / 2 - 10}">${labels[i]}</text>`; });
  return `<svg viewBox="0 0 320 300" class="cv" role="img">${s}</svg>`;
}

/* ---------- 원 이어 붙이기 ---------- */
function rowSVG(n, r, mode) {
  const S = Math.min(26, 300 / (2 * r * n)), R = r * S, x0 = 20, cy = R + 30, W = 2 * R * n + 40;
  let s = `<rect x="${x0}" y="${cy - R}" width="${2 * R * n}" height="${2 * R}" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`;
  for (let i = 0; i < n; i++) { const cx = x0 + R + 2 * R * i; s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.fill}" stroke="${C.circle}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="${C.ink}"/>`; }
  if (mode === 'centers') s += `<line x1="${x0 + R}" y1="${cy}" x2="${x0 + R + 2 * R * (n - 1)}" y2="${cy}" class="hi"/><text class="lb" x="${x0 + R}" y="${cy + 18}">ㄱ</text><text class="lb" x="${x0 + R + 2 * R * (n - 1)}" y="${cy + 18}">ㄴ</text>`;
  else s += `<line x1="${x0}" y1="${cy + R + 14}" x2="${x0 + 2 * R * n}" y2="${cy + R + 14}" class="hi"/><text class="lb" x="${x0 + R * n}" y="${cy + R + 30}">?</text>`;
  s += `<line x1="${x0 + R}" y1="${cy}" x2="${x0 + R}" y2="${cy - R}" stroke="${C.ink}" stroke-width="2" stroke-dasharray="4 3"/><text class="dim" x="${x0 + R + 22}" y="${cy - R / 2}">${cm(r)}</text>`;
  return `<svg viewBox="0 0 ${W} ${2 * R + 76}" class="cv wide" role="img">${s}</svg>`;
}

/* ---------- 컴퍼스 (직접 조작) ---------- */
function compassQ(target, byD) {
  const P = D.cmPx, X0 = 30, RY = 300, L = 170;
  let open = 1, drawn = false, box = null;
  const draw = (ok) => {
    const px = X0 + open * P, mid = (X0 + px) / 2, h = Math.sqrt(Math.max(L * L - ((px - X0) / 2) ** 2, 900)), hy = RY - 8 - h;
    let s = `<rect x="0" y="0" width="480" height="${RY - 30}" fill="#fff" rx="14"/>`;
    // 도안: 그린 원 (실제의 1/2 크기)
    if (drawn) s += `<circle cx="300" cy="120" r="${open * P / 2.2}" fill="none" stroke="${ok ? C.circle : C.hi}" stroke-width="4" class="drawn"/><circle cx="300" cy="120" r="3" fill="${C.ink}"/><text class="lb" x="300" y="${Math.min(250, 120 + open * P / 2.2 + 20)}">반지름 ${half(open)} cm 원</text>`;
    else s += `<circle cx="300" cy="120" r="${byD ? target / 2 * P / 2.2 : target * P / 2.2}" fill="none" stroke="#c9d3e8" stroke-width="3" stroke-dasharray="7 7"/><circle cx="300" cy="120" r="3" fill="${C.ink}"/><text class="lb" x="300" y="${Math.min(250, 120 + (byD ? target / 2 : target) * P / 2.2 + 20)}">${byD ? `지름 ${target} cm` : `반지름 ${target} cm`}</text>`;
    // 자
    s += `<rect x="10" y="${RY}" width="${X0 + 11 * P - 30}" height="46" rx="6" fill="${C.ruler}" stroke="${C.ink}" stroke-width="2"/>`;
    for (let i = 0; i <= 10 * 2; i++) { const x = X0 + i * P / 2; s += `<line x1="${x}" y1="${RY}" x2="${x}" y2="${RY + (i % 2 ? 9 : 16)}" stroke="${C.ink}" stroke-width="1.6"/>`; if (i % 2 === 0) s += `<text class="tk" x="${x}" y="${RY + 30}">${i / 2}</text>`; }
    // 컴퍼스
    s += `<line x1="${mid}" y1="${hy}" x2="${X0}" y2="${RY - 2}" stroke="#7a8296" stroke-width="7" stroke-linecap="round"/><line x1="${mid}" y1="${hy}" x2="${px}" y2="${RY - 10}" stroke="#4f8fe0" stroke-width="7" stroke-linecap="round"/>`;
    s += `<path d="M${px - 5} ${RY - 14} L${px + 5} ${RY - 14} L${px} ${RY - 1} Z" fill="${C.hi}"/><circle cx="${mid}" cy="${hy}" r="9" fill="${C.ink}"/><rect x="${mid - 4}" y="${hy - 26}" width="8" height="18" rx="3" fill="${C.ink}"/>`;
    s += `<circle cx="${px}" cy="${RY - 18}" r="16" fill="${C.hi}" fill-opacity=".18" stroke="${C.hi}" stroke-width="2"/>`;
    box.innerHTML = `<svg viewBox="0 0 480 ${RY + 52}" class="cmp" role="img" aria-label="컴퍼스와 자">${s}</svg>`;
  };
  const setFrom = e => { const svg = box.querySelector('svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); const v = Math.round(((p.x - X0) / P) * 2) / 2; const nv = Math.max(.5, Math.min(10, v)); if (nv !== open) { open = nv; drawn = false; Arcade.play('tick'); draw(); } };
  const want = byD ? target / 2 : target;
  return {
    ask: byD ? `<b>지름이 ${target} cm</b> 인 원을 그려요<small>연필 다리(주황)를 끌어 컴퍼스를 벌려요</small>` : `<b>반지름이 ${target} cm</b> 인 원을 그려요<small>연필 다리(주황)를 끌어 컴퍼스를 벌려요</small>`,
    render(sc) {
      sc.innerHTML = '<div class="box cbox"></div>'; box = sc.querySelector('.cbox'); open = 1; drawn = false; draw();
      let drag = false;
      box.addEventListener('pointerdown', e => { drag = true; try { box.setPointerCapture(e.pointerId); } catch (_) {} setFrom(e); });
      box.addEventListener('pointermove', e => { if (drag) setFrom(e); });
      box.addEventListener('pointerup', () => { drag = false; }); box.addEventListener('pointercancel', () => { drag = false; });
    },
    _set: v => { open = v; draw(); }, _want: want,
    custom: { mount(el, api) {
      el.innerHTML = '<button class="btn" id="drawBtn">빙글! 그리기</button>';
      el.querySelector('#drawBtn').onclick = () => {
        if (api.locked) return; const ok = open === want; drawn = true; draw(ok); Arcade.play('whoosh');
        setTimeout(() => api.submit(ok, ok ? '' : `지금 컴퍼스는 ${half(open)} cm 벌어져 있어요.`), 650);
      };
    } },
    rule: byD ? [`지름 ${target} cm → 반지름은 ${target} ÷ 2 = ${half(want)} cm`, `컴퍼스를 ${half(want)} cm 벌려요`] : [`컴퍼스를 벌린 길이 = 반지름`, `0 에서 ${target} 까지 벌려요`],
    hint: byD ? '컴퍼스는 반지름만큼 벌려요. 지름의 반!' : '침은 0 에, 연필은 반지름 눈금에!', sig: 'c' + target + byD
  };
}

const GEN = {
  partName() {
    const parts = ['원의 중심', '반지름', '지름', '지름이 아닌 선분'], k = pick(parts.slice(0, 3).concat(parts.slice(0, 3), parts[3]));
    const tips = { '원의 중심': '원의 한가운데 점', '반지름': '중심과 원 위의 한 점을 이은 선분', '지름': '원 위의 두 점을 이은 선분 중 중심을 지나는 것', '지름이 아닌 선분': '원 위의 두 점을 이었지만 중심을 지나지 않아요' };
    return { ask: '주황색으로 표시한 것의 이름은?', scene: wrap(partSVG(k, Math.random() * Math.PI * 2)), choices: shuffle(parts), answer: k, small: true,
             rule: [`${k}: ${tips[k]}`], hint: '선분이 원의 중심(ㅇ)을 지나는지 보세요', sig: 'p' + k + ri(0, 9) };
  },
  rToD() {
    const r = ri(2, 9);
    return { ask: `반지름이 <b>${cm(r)}</b> 인 원의 지름은?`, scene: wrap(rulerCircle(Math.min(r, 6), 'r', cm(r))),
             choices: nums(2 * r, [r, r + 2, 4 * r, r / 2].map(Math.round), { ok: v => v > 0, fmt: cm }), answer: cm(2 * r),
             rule: ['지름 = 반지름 × 2', `${r} × 2 = ${2 * r} cm`], hint: '지름에는 반지름이 두 번 들어가요', sig: 'rd' + r };
  },
  dToR() {
    const r = ri(2, 9), d = 2 * r;
    return { ask: `지름이 <b>${cm(d)}</b> 인 원의 반지름은?`, scene: wrap(rulerCircle(Math.min(r, 6), 'd', cm(d))),
             choices: nums(r, [d, 2 * d, r + 1, r - 1], { ok: v => v > 0, fmt: cm }), answer: cm(r),
             rule: ['반지름 = 지름 ÷ 2', `${d} ÷ 2 = ${r} cm`], hint: '반지름은 지름의 반이에요', sig: 'dr' + r };
  },
  longest() {
    const order = shuffle([0, 1, 2, 3]), labels = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'], ans = labels[order.indexOf(0)];
    return { ask: '원 위의 두 점을 이은 선분 중 <b>가장 긴</b> 것은?', scene: wrap(chordsSVG(order)), choices: labels.map(l => '선분 ' + l), answer: '선분 ' + ans, cols: 4,
             rule: [`선분 ${ans}: 원의 중심을 지나는 지름`, '원 안에서 가장 긴 선분은 지름이에요'], hint: '원의 중심을 지나는 선분을 찾아요', sig: 'l' + order.join('') };
  },
  compass(g) { const t = g.byD ? 2 * ri(2, 5) + (Math.random() < .25 ? 1 : 0) : ri(2, 5) + (Math.random() < .2 ? .5 : 0); return compassQ(t, !!g.byD); },
  rowWidth(g) {
    const n = g.hard ? ri(4, 6) : ri(2, 4), r = ri(2, g.hard ? 9 : 6), w = 2 * r * n;
    return { ask: `반지름이 <b>${cm(r)}</b> 인 원 <b>${n}개</b>를 이어 붙였어요. 직사각형의 <b>가로</b>는?`, scene: wrap(rowSVG(n, r, 'width')),
             choices: nums(w, [r * n, 2 * r * (n - 1), w + 2 * r, r * (n + 1)], { ok: v => v > 0, fmt: cm }), answer: cm(w),
             rule: [`원 하나의 지름 = ${r} × 2 = ${2 * r} cm`, `지름 ${n}개 → ${2 * r} × ${n} = ${w} cm`], hint: '가로에는 지름이 몇 개 들어갈까요?', sig: 'w' + n + r + !!g.hard };
  },
  centers() {
    const n = ri(3, 5), r = ri(2, 7), v = 2 * r * (n - 1);
    return { ask: `반지름 <b>${cm(r)}</b> 인 원 ${n}개, 선분 ㄱㄴ 의 길이는?`, scene: wrap(rowSVG(n, r, 'centers')),
             choices: nums(v, [2 * r * n, r * (n - 1), v + r, v - r], { ok: x => x > 0, fmt: cm }), answer: cm(v),
             rule: [`중심과 중심 사이 = 지름 = ${2 * r} cm`, `사이가 ${n - 1}칸 → ${2 * r} × ${n - 1} = ${v} cm`], hint: '중심에서 다음 중심까지는 반지름 두 개!', sig: 'k' + n + r };
  },
  nested() {
    const r = ri(2, 6), big = 2 * r;   // 큰 원 안에 작은 원 두 개가 지름 위에 나란히
    const s = `<svg viewBox="0 0 320 300" class="cv"><circle cx="160" cy="150" r="130" fill="${C.fill}" stroke="${C.circle}" stroke-width="4"/><circle cx="95" cy="150" r="65" fill="#fff" stroke="${C.circle}" stroke-width="3"/><circle cx="225" cy="150" r="65" fill="#fff" stroke="${C.circle}" stroke-width="3"/><line x1="95" y1="150" x2="160" y2="150" class="hi"/><text class="dim" x="128" y="138">${cm(r)}</text><circle cx="160" cy="150" r="4" fill="${C.ink}"/><circle cx="95" cy="150" r="3" fill="${C.ink}"/><circle cx="225" cy="150" r="3" fill="${C.ink}"/></svg>`;
    return { ask: '작은 원 두 개가 큰 원 안에 꼭 맞아요. <b>큰 원의 반지름</b>은?', scene: wrap(s),
             choices: nums(big, [r, 4 * r, 3 * r], { ok: v => v > 0, fmt: cm }), answer: cm(big),
             rule: [`작은 원의 지름 = ${2 * r} cm`, `큰 원의 반지름 = 작은 원의 지름 = ${big} cm`], hint: '큰 원의 중심에서 끝까지 작은 원이 몇 번 들어가나요?', sig: 'n' + r };
  },
  ox() {
    const [t, ok, why] = pick(D.facts);
    return { ask: 'O 일까요, X 일까요?', scene: wrap(`<div class="fact">${t}</div>`), choices: ['⭕ 맞아요', '❌ 틀려요'], answer: ok ? '⭕ 맞아요' : '❌ 틀려요', once: true,
             rule: [ok ? '맞아요!' : why || '틀려요'], hint: '원을 그리며 생각해 봐요', sig: 'x' + t };
  },
  squareFit() {
    const r = ri(2, 8), side = 2 * r, peri = 4 * side, ask = Math.random() < .5;
    const s = `<svg viewBox="0 0 300 300" class="cv"><rect x="30" y="30" width="240" height="240" fill="none" stroke="${C.ink}" stroke-width="3"/><circle cx="150" cy="150" r="120" fill="${C.fill}" stroke="${C.circle}" stroke-width="3"/><circle cx="150" cy="150" r="3.5" fill="${C.ink}"/></svg>`;
    return ask
      ? { ask: `정사각형 안에 꼭 맞는 원이에요. 정사각형의 <b>네 변의 길이의 합이 ${cm(peri)}</b> 이면 원의 반지름은?`, scene: wrap(s), choices: nums(r, [side, peri / 2, r + 1], { ok: v => v > 0, fmt: cm }), answer: cm(r),
          rule: [`한 변 = ${peri} ÷ 4 = ${side} cm = 원의 지름`, `반지름 = ${side} ÷ 2 = ${r} cm`], hint: '정사각형의 한 변은 원의 무엇과 같을까요?', sig: 'q' + r + 1 }
      : { ask: `반지름 <b>${cm(r)}</b> 인 원이 꼭 맞는 정사각형의 <b>네 변의 길이의 합</b>은?`, scene: wrap(s), choices: nums(peri, [4 * r, 2 * side, peri + 4], { ok: v => v > 0, fmt: cm }), answer: cm(peri),
          rule: [`한 변 = 지름 = ${side} cm`, `${side} × 4 = ${peri} cm`], hint: '정사각형 한 변 = 원의 지름', sig: 'q' + r + 0 };
  },
  pattern() {
    const r0 = ri(1, 2), step = ri(1, 2), k = 3, rs = Array.from({ length: k + 1 }, (_, i) => r0 + step * i);   // 반지름이 늘어나는 원 무늬(같은 중심)
    const S = 120 / rs[k], c = rs.slice(0, k).map(r => `<circle cx="140" cy="140" r="${r * S}" fill="none" stroke="${C.circle}" stroke-width="3"/>`).join('') + `<circle cx="140" cy="140" r="${rs[k] * S}" fill="none" stroke="${C.hi}" stroke-width="3" stroke-dasharray="8 6"/>`;
    const lab = rs.slice(0, k).map((r, i) => `<text class="tk" x="${140 + r * S - 8}" y="${140 - 6 - i * 0}">${r}</text>`).join('');
    return { ask: `같은 중심에 반지름을 <b>${rs.slice(0, k).join(' cm, ')} cm</b> 로 원을 그렸어요. 규칙대로 다음 원의 반지름은?`, scene: wrap(`<svg viewBox="0 0 280 280" class="cv">${c}<circle cx="140" cy="140" r="3" fill="${C.ink}"/>${lab}</svg>`),
             choices: nums(rs[k], [rs[k] + 1, rs[k] - 1, rs[k] + step + 1, rs[k] * 2], { ok: v => v > 0 && v !== rs[k - 1], fmt: cm }), answer: cm(rs[k]),
             rule: [`반지름이 ${step} cm 씩 늘어나요`, `${rs[k - 1]} + ${step} = ${rs[k]} cm`], hint: '반지름이 얼마씩 커지는지 보세요', sig: 'g' + r0 + step };
  }
};

Learn.run({ data: D, key: 'circle', gen: GEN });
});
