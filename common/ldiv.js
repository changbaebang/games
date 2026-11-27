/* 나눗셈 세로셈 — 몫을 높은 자리부터 하나씩 쓰면, 곱하고 빼고 내려 쓰는 줄이 차례로 나타나요.
 * 쓰는 곳: division-candy (learn.js 의 custom 문제)
 *   const v = LDiv.make({ a: 745, b: 3 });
 *   q.render = sc => v.render(sc);  q.custom = { mount: (el, api) => v.mount(el, api) };
 * 입력 순서: 몫의 각 자리(왼쪽부터) → 마지막 나머지. v.seq 가 정답 입력 순서예요. */
(function () {
  function make({ a, b }) {
    const A = String(a), n = A.length, q = Math.floor(a / b), r = a % b;
    // 자리마다 계산: cur(이번에 나누는 수), qd(몫 숫자), p(곱), rem(남은 수)
    const steps = []; let cur = 0, started = false;
    for (let i = 0; i < n; i++) {
      cur = cur * 10 + +A[i]; const qd = Math.floor(cur / b);
      if (qd > 0) started = true;
      if (started) steps.push({ i, cur, qd, p: qd * b, rem: cur - qd * b });
      cur = cur - qd * b;
    }
    const first = steps[0].i;                       // 몫이 시작되는 자리
    const seq = steps.map(s => String(s.qd)).join('') + String(r);
    const got = [];                                  // 입력한 숫자들
    let sc = null, api = null;
    const W = n + 1;                                 // 0 열: 나누는 수, 1..n 열: 나누어지는 수
    const put = (row, endCol, str, cls = '') => { const out = {}; str.split('').forEach((c, k) => { out[endCol - str.length + 1 + k] = `<span class="${cls}">${c}</span>`; }); row.push(out); };
    function draw(bad = -1) {
      if (!sc) return;
      const qCells = {}; steps.forEach((s, k) => { const c = s.i + 1, v = got[k]; qCells[c] = `<div class="lq${k === got.length && got.length < steps.length ? ' on' : ''}${bad === k ? ' bad' : ''}">${v != null ? v : ''}</div>`; });
      let rows = '';
      const cell = (c, html, cls = '') => `<div class="lc ${cls}" style="grid-column:${c + 1}">${html || ''}</div>`;
      rows += `<div class="lrow">${Array.from({ length: W }, (_, c) => cell(c, c === 0 ? '' : qCells[c] || '')).join('')}</div>`;
      rows += `<div class="lrow"><div class="lc dv" style="grid-column:1">${b}</div>${A.split('').map((d, k) => cell(k + 1, d, 'dd' + (k === 0 ? ' first' : ''))).join('')}</div>`;
      const row = (fill, cls = '') => `<div class="lrow ${cls}">${Array.from({ length: W }, (_, c) => cell(c, fill(c))).join('')}</div>`;
      const num = (str, endC, k) => c => { const st = endC - str.length + 1; return c >= st && c <= endC ? `<span class="${k}">${str[c - st]}</span>` : ''; };
      for (let k = 0; k < Math.min(got.length, steps.length); k++) {
        const s = steps[k]; if (s.qd === 0 && k > 0) continue;          // 몫이 0 인 자리는 곱하기 줄 없이 내려 쓰기만
        rows += row(num(String(s.p), s.i + 1, 'p'), 'ul');
        let j = k + 1; while (j < steps.length && steps[j].qd === 0) j++;
        if (j < steps.length) { const t = String(+(String(s.rem) + A.slice(s.i + 1, steps[j].i + 1))); rows += row(num(t, steps[j].i + 1, 'm')); }
        else { const rv = got.length > steps.length ? got[steps.length] : ''; rows += row(c => c === n ? `<div class="lq rr${got.length === steps.length ? ' on' : ''}${bad === steps.length ? ' bad' : ''}">${rv}</div>` : ''); }
      }
      sc.innerHTML = `<div class="lbox"><div class="lgrid" style="--w:${W}">${rows}</div><div class="vhint">${got.length < steps.length ? `몫의 ${['일', '십', '백', '천'][n - 1 - steps[got.length].i]}의 자리를 써요` : got.length === steps.length ? '마지막 나머지를 써요' : ''}</div></div>`;
    }
    function key(k) {
      if (api && api.locked) return;
      if (k === 'del') { got.pop(); Arcade.play('tick'); return draw(); }
      if (got.length > steps.length) return;
      const idx = got.length, want = seq[idx];
      got.push(k); Arcade.play('pop');
      if (k !== want) {
        draw(idx);
        const note = idx < steps.length ? `${steps[idx].cur} ÷ ${b} 의 몫을 다시 생각해 봐요.` : '마지막에 남은 수를 다시 봐요.';
        setTimeout(() => { got.pop(); draw(); }, 700);
        return api.submit(false, note);
      }
      draw();
      if (got.length === seq.length) setTimeout(() => api.submit(true), 200);
    }
    return {
      seq, q, r,
      render(s) { sc = s; draw(); },
      mount(el, a2) {
        api = a2;
        el.innerHTML = `<div class="vpad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(x => `<button class="vk" data-k="${x}">${x}</button>`).join('')}<button class="vk del" data-k="del" aria-label="지우기">⌫</button><button class="vk" data-k="0">0</button><span></span></div>`;
        el.querySelectorAll('.vk').forEach(bt => bt.onclick = () => key(bt.dataset.k));
      },
      type(s) { for (const c of s) key(c); }
    };
  }
  window.LDiv = { make };
})();
