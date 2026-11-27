/* 세로셈 — 자리를 맞춰 쓰고, 일의 자리부터 키패드로 답을 채워요.
 * 쓰는 곳: add-sub-rocket, multiply-factory (learn.js 의 custom 문제)
 *   const v = VCalc.make({ a: 357, b: 286, op: '+' });   // op: + − ×
 *   q.render = sc => v.render(sc);  q.custom = { mount: (el, api) => v.mount(el, api) };
 * 받아올림 칸(위 작은 칸)을 누르면 1·2·3… 을 적어 둘 수 있어요 (채점하지 않는 메모).
 * 뺄셈은 위 숫자를 누르면 받아내림 표시가 생겨요: 그 숫자는 1 줄고, 오른쪽 숫자는 10 늘어요(빗금 + 작은 수). */
(function () {
  const PLACE = ['일', '십', '백', '천', '만'];
  function make({ a, b, op }) {
    const ans = String(op === '+' ? a + b : op === '-' ? a - b : a * b), A = String(a), B = String(b);
    const W = Math.max(A.length, B.length + 1, ans.length);
    const col = s => Array(W - s.length).fill('').concat(s.split(''));     // 오른쪽 맞춤
    const ca = col(A), cb = col(B), memo = Array(W).fill(0), borrow = Array(W).fill(false), got = Array(ans.length).fill('');
    let sc = null, el = null, api = null;
    // 받아내림 표시를 반영한 위 숫자: 왼쪽에서 10을 받으면 +10, 오른쪽에 빌려주면 −1
    const val = i => ca[i] === '' ? 0 : +ca[i] + (i > 0 && borrow[i - 1] ? 10 : 0) - (borrow[i] ? 1 : 0);
    const sym = op === '-' ? '−' : op === '*' || op === '×' ? '×' : '+';
    function draw(bad = []) {
      if (!sc) return;
      const off = W - ans.length, act = got.lastIndexOf('') ;
      const cell = (i, html, cls = '') => `<div class="vc ${cls}" data-i="${i}">${html}</div>`;
      let h = '<div class="vgrid" style="--w:' + (W + 1) + '">';
      h += '<div class="vc"></div>' + ca.map((_, i) => {
        const m = memo[i] ? memo[i] : '';
        return cell(i, m ? `<span class="cy">${m}</span>` : '', 'memo' + (op === '-' ? ' msub' : ''));
      }).join('');
      h += '<div class="vc"></div>' + ca.map((d, i) => { const v = val(i); return cell(i, d === '' ? '' : v !== +d ? `<s>${d}</s><span class="bw">${v}</span>` : d, 'top' + (op === '-' && d !== '' ? ' tap' : '')); }).join('');
      h += `<div class="vc op">${sym}</div>` + cb.map(d => cell(-1, d)).join('');
      h += `<div class="vline" style="grid-column:1/span ${W + 1}"></div>`;
      h += '<div class="vc"></div>' + Array.from({ length: W }, (_, i) => {
        if (i < off) return '<div class="vc"></div>';
        const k = i - off; return cell(k, got[k], 'ans' + (k === act ? ' on' : '') + (bad.includes(k) ? ' bad' : ''));
      }).join('');
      h += '</div>';
      sc.innerHTML = `<div class="vbox">${h}<div class="vhint">${act >= 0 ? PLACE[ans.length - 1 - act] + '의 자리를 써요' : ''}</div></div>`;
      sc.querySelectorAll('.memo').forEach(c => c.onclick = () => { if (op === '-') return; const i = +c.dataset.i; memo[i] = (memo[i] + 1) % 10; Arcade.play('tick'); draw(); });
      if (op === '-') sc.querySelectorAll('.top.tap').forEach(c => c.onclick = () => { const i = +c.dataset.i; if (i >= W - 1 || (val(i) <= 0 && !borrow[i]) || ca[i] === '') return; borrow[i] = !borrow[i]; Arcade.play('tick'); draw(); });
    }
    function key(k) {
      if (api && api.locked) return;
      if (k === 'del') { const i = got.findIndex(x => x !== ''); if (i >= 0) got[i] = ''; Arcade.play('tick'); return draw(); }
      const i = got.lastIndexOf(''); if (i < 0) return; got[i] = k; Arcade.play('pop'); draw();
      if (got.every(x => x !== '')) setTimeout(check, 180);
    }
    function check() {
      const bad = got.map((d, i) => d === ans[i] ? -1 : i).filter(i => i >= 0);
      if (!bad.length) return api.submit(true);
      draw(bad);
      const where = bad.map(i => PLACE[ans.length - 1 - i]).reverse().join('·');
      setTimeout(() => { got.fill(''); draw(); }, 700);
      api.submit(false, `${where}의 자리를 다시 봐요.`);
    }
    return {
      ans,
      render(s) { sc = s; draw(); },
      mount(e, a) {
        el = e; api = a;
        el.innerHTML = `<div class="vpad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => `<button class="vk" data-k="${n}">${n}</button>`).join('')}<button class="vk del" data-k="del" aria-label="지우기">⌫</button><button class="vk" data-k="0">0</button><span></span></div>`;
        el.querySelectorAll('.vk').forEach(b => b.onclick = () => key(b.dataset.k));
      },
      type(s) { for (const c of s) key(c); }
    };
  }
  window.VCalc = { make };
})();
