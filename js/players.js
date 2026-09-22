/*
 * Trình phát bài tập (S07) và trò chơi "Hành trình STOP-4P" 9 chặng cho nhân viên y tế.
 * Mỗi player: render(ex, api) → HTML; mount(body, ex, api) → trả về hàm tạm dừng (dùng cho "Trở về thở tự nhiên").
 */
(() => {
  'use strict';
  const D = window.STOP4P_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };

  /* ---------------- Âm thanh (không bao giờ tự phát) ---------------- */
  let audioCtx = null;
  const getCtx = () => {
    if (!audioCtx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; audioCtx = new A(); }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  };
  function chime(freq = 528, dur = 0.7) {
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }

  /* ================= Thở theo nhịp ================= */
  const PATTERNS = {
    BREATHE_46: [['in', 4, 'Hít vào nhẹ nhàng'], ['out', 6, 'Thở ra chậm, dài']],
    BOX_4444: [['in', 4, 'Hít vào'], ['hold', 4, 'Giữ nhẹ'], ['out', 4, 'Thở ra'], ['hold', 4, 'Nghỉ']],
    BREATHE_478: [['in', 4, 'Hít vào bằng mũi'], ['hold', 7, 'Giữ nhẹ (bỏ qua nếu khó chịu)'], ['out', 8, 'Thở ra chậm bằng miệng']],
    HUM: [['in', 4, 'Hít vào nhẹ bằng mũi'], ['out', 6, 'Thở ra, ngân "hừmmm" khẽ']]
  };

  const breath = {
    render(ex) {
      const durs = [1, 2, 3, 5].filter(m => m <= ex.max);
      return `
        ${ex.holdsBreath ? `
          <div class="gate" id="gate">
            <p><b>Bài này có nín thở.</b> Chỉ chọn nếu bạn thấy thoải mái. Không thực hành khi chóng mặt, khó thở hoặc đang làm nhiệm vụ cần an toàn cao.</p>
            <div class="btn-row">
              <button class="btn primary" id="gate-ok">Tôi thấy thoải mái, tiếp tục</button>
              <button class="btn soft" data-act="startEx" data-id="BREATHE_46">Chọn thở 4–6 (không nín thở)</button>
            </div>
          </div>` : ''}
        <div class="breath-ui" id="bui" ${ex.holdsBreath ? 'hidden' : ''}>
          <div class="orb-wrap">
            <div class="orb-ring"></div>
            <div class="orb" id="orb"></div>
            <div class="orb-label"><p id="phase" aria-live="polite">Sẵn sàng</p><p id="count" class="orb-count" aria-hidden="true"></p></div>
          </div>
          <div class="controls">
            <div><span class="label">Thời lượng</span>
              <div class="chips">${durs.map((m, i) => `<button class="chip ${i === Math.min(1, durs.length - 1) ? 'on' : ''}" data-dur="${m}">${m} phút</button>`).join('')}</div></div>
            <div><span class="label">Nhịp</span>
              <div class="chips">
                <button class="chip" data-tempo="0.75">Ngắn hơn</button>
                <button class="chip on" data-tempo="1">Gợi ý</button>
                <button class="chip" data-tempo="1.25">Chậm hơn</button>
              </div></div>
            <label class="check"><input type="checkbox" id="chime"> <span>Âm báo khi đổi nhịp</span></label>
          </div>
          <div class="btn-row center">
            <button class="btn primary" id="bplay">▶ Bắt đầu</button>
            <button class="btn ghost" id="bstop" hidden>■ Dừng</button>
          </div>
          <p class="fine center" id="remain"></p>
          <p class="fine center">Nếu nhịp không hợp, cứ thở theo cách tự nhiên của bạn — vòng tròn chỉ là gợi ý.</p>
        </div>`;
    },
    mount(body, ex, api) {
      const pattern = PATTERNS[ex.id];
      const gate = $('#gate', body);
      if (gate) $('#gate-ok', body).addEventListener('click', () => { gate.hidden = true; $('#bui', body).hidden = false; });
      let durMin = +($('[data-dur].on', body) || { dataset: { dur: 2 } }).dataset.dur, tempo = 1;
      let running = false, t = 0, total = 0, lastPhase = -1, timer = null;
      const orb = $('#orb', body), phaseEl = $('#phase', body), countEl = $('#count', body), remainEl = $('#remain', body);
      const rm = api.reduceMotion();
      const cycle = () => pattern.reduce((s, p) => s + p[1] * tempo, 0);
      const setScale = s => { orb.style.transform = rm ? 'scale(0.8)' : `scale(${s})`; orb.style.opacity = rm ? String(0.45 + 0.55 * (s - 0.55) / 0.45) : ''; };
      setScale(0.55);

      body.addEventListener('click', e => {
        const d = e.target.closest('[data-dur]'), tp = e.target.closest('[data-tempo]');
        if (d) { durMin = +d.dataset.dur; $$('[data-dur]', body).forEach(x => x.classList.toggle('on', x === d)); }
        if (tp) { tempo = +tp.dataset.tempo; $$('[data-tempo]', body).forEach(x => x.classList.toggle('on', x === tp)); }
      });

      let lastTs = 0;
      function tick() {
        const now = performance.now(); t += Math.min(1, (now - lastTs) / 1000); lastTs = now;
        if (t >= total) return stop(true);
        const c = cycle(); let inC = t % c, idx = 0;
        while (inC >= pattern[idx][1] * tempo) { inC -= pattern[idx][1] * tempo; idx++; }
        const [kind, sec, label] = pattern[idx];
        const len = sec * tempo, frac = inC / len;
        if (idx !== lastPhase) { lastPhase = idx; phaseEl.textContent = label; if ($('#chime', body).checked) chime(kind === 'in' ? 528 : kind === 'out' ? 396 : 440); }
        countEl.textContent = Math.ceil(len - inC);
        setScale(kind === 'in' ? 0.55 + 0.45 * frac : kind === 'out' ? 1 - 0.45 * frac : (idx > 0 && pattern[idx - 1][0] === 'in' ? 1 : 0.55));
        const left = Math.ceil(total - t);
        remainEl.textContent = `Còn khoảng ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      }
      function start() {
        getCtx();
        if (!total || t >= total) { t = 0; total = durMin * 60; lastPhase = -1; }
        running = true; lastTs = performance.now(); timer = setInterval(tick, 100);
        $('#bplay', body).textContent = '❚❚ Tạm dừng'; $('#bstop', body).hidden = false;
      }
      function pause() {
        running = false; clearInterval(timer);
        const b = $('#bplay', body); if (b) b.textContent = '▶ Tiếp tục';
      }
      function stop(finished) {
        pause(); t = 0; total = 0; setScale(0.55); countEl.textContent = '';
        phaseEl.textContent = finished ? 'Hoàn thành. Trở về thở tự nhiên.' : 'Đã dừng';
        $('#bplay', body).textContent = '▶ Bắt đầu lại'; $('#bstop', body).hidden = true;
        remainEl.innerHTML = finished ? '<button class="btn primary" data-act="finishExercise">Check-out</button>' : '';
      }
      $('#bplay', body).addEventListener('click', () => (running ? pause() : start()));
      $('#bstop', body).addEventListener('click', () => stop(false));
      api.lifecycle.onCleanup(() => clearInterval(timer));
      return pause;
    }
  };

  /* ================= Dừng 5 giây (các bước chạm) ================= */
  const STOP_STEPS = [
    ['✋', 'Dừng lại', 'Nếu an toàn, tạm dừng việc đang làm trong vài giây.'],
    ['😌', 'Thả lỏng vai và hàm', 'Để vai hạ xuống, hàm mềm ra, răng không chạm nhau.'],
    ['🌬️', 'Một hơi thở tự nhiên', 'Chỉ cần nhận biết một hơi thở vào và ra — không cần thay đổi gì.'],
    ['👀', 'Quan sát', 'Lúc này mình đang cảm thấy gì? Cơ thể đang báo hiệu điều gì?'],
    ['🧭', 'Chọn bước tiếp theo', 'Mình cần gì: tiếp tục công việc, nghỉ ngắn, nhờ trợ giúp, hay một bài dài hơn lúc nghỉ?']
  ];
  const steps = {
    render: () => `
      <div class="step-card" id="stepc" aria-live="polite"></div>
      <div class="dots" id="dots">${STOP_STEPS.map(() => '<span></span>').join('')}</div>
      <div class="btn-row center"><button class="btn soft" id="sprev">‹ Trước</button><button class="btn primary" id="snext">Tiếp ›</button></div>`,
    mount(body) {
      let i = 0;
      const show = () => {
        const [ic, h, p] = STOP_STEPS[i];
        $('#stepc', body).innerHTML = `<div class="step-icon" aria-hidden="true">${ic}</div><h2>${h}</h2><p>${p}</p>`;
        $$('#dots span', body).forEach((d, k) => d.classList.toggle('on', k <= i));
        $('#sprev', body).disabled = i === 0;
        const n = $('#snext', body);
        if (i === STOP_STEPS.length - 1) { n.textContent = 'Xong → Check-out'; n.dataset.act = 'finishExercise'; }
        else { n.textContent = 'Tiếp ›'; delete n.dataset.act; }
      };
      $('#snext', body).addEventListener('click', () => { if (i < STOP_STEPS.length - 1) { i++; show(); } });
      $('#sprev', body).addEventListener('click', () => { if (i > 0) { i--; show(); } });
      show();
    }
  };

  /* ================= Grounding 5-4-3-2-1 ================= */
  const GROUND = [
    [5, '👀', 'Nhìn', 'Tìm 5 thứ bạn nhìn thấy — một màu sắc, một hình dạng, ánh sáng…'],
    [4, '✋', 'Chạm', '4 thứ bạn cảm nhận bằng xúc giác — vải áo, mặt bàn, bàn chân chạm sàn…'],
    [3, '👂', 'Nghe', '3 âm thanh xung quanh, gần hoặc xa.'],
    [2, '👃', 'Ngửi', '2 mùi — hoặc chỉ cảm nhận không khí mát đi qua mũi.'],
    [1, '👅', 'Nếm / nhận biết cơ thể', '1 vị trong miệng, hoặc một cảm giác trong cơ thể lúc này.']
  ];
  const grounding = {
    render: () => `
      <div class="ground" id="ground"></div>
      <p class="fine center">Nếu một giác quan khó dùng, hãy thay bằng giác quan khác hoặc một cảm giác trong cơ thể. Không cần tìm bằng mọi giá.</p>`,
    mount(body) {
      let i = 0;
      const show = () => {
        if (i >= GROUND.length) {
          $('#ground', body).innerHTML = `<div class="step-card"><div class="step-icon">🌿</div><h2>Bạn đang ở đây, lúc này.</h2><p>Để ý xem cơ thể có thay đổi gì không — không cần phải khác đi.</p>
            <button class="btn primary" data-act="finishExercise">Check-out</button></div>`;
          return;
        }
        const [n, ic, h, p] = GROUND[i];
        $('#ground', body).innerHTML = `
          <div class="step-card">
            <div class="big-num" aria-hidden="true">${n}</div><div class="step-icon" aria-hidden="true">${ic}</div>
            <h2>${n} — ${h}</h2><p>${p}</p>
            <p class="fine">Chạm vào một chấm mỗi khi bạn nhận ra một điều:</p>
            <div class="tap-dots">${Array.from({ length: n }, (_, k) => `<button class="tap-dot" aria-label="Đã nhận ra điều thứ ${k + 1}"></button>`).join('')}</div>
            <button class="btn soft" id="gnext">${i < GROUND.length - 1 ? 'Tiếp ›' : 'Hoàn thành'}</button>
          </div>`;
        $$('.tap-dot', body).forEach(d => d.addEventListener('click', () => { d.classList.toggle('on'); vibrate(15); }));
        $('#gnext', body).addEventListener('click', () => { i++; show(); });
      };
      show();
    }
  };

  /* ================= Thư giãn cơ tiến triển ================= */
  const PMR = [
    ['Bàn tay & cẳng tay', 'Nắm nhẹ hai bàn tay', 'Mở bàn tay, để các ngón tay nghỉ.'],
    ['Cánh tay trên', 'Gập nhẹ khuỷu tay, siết bắp tay', 'Thả tay xuống, để cánh tay nặng xuống.'],
    ['Vai', 'Nhún vai nhẹ lên gần tai', 'Để vai rơi xuống, rời xa tai.'],
    ['Mặt & hàm', 'Nhíu mày, mím môi nhẹ', 'Thả lỏng trán, mắt, hàm; răng không chạm nhau.'],
    ['Bụng', 'Hóp bụng nhẹ', 'Bụng mềm ra, thở tự nhiên.'],
    ['Đùi & mông', 'Siết nhẹ đùi', 'Thả lỏng, để ghế hoặc sàn đỡ bạn.'],
    ['Bắp chân & bàn chân', 'Co nhẹ các ngón chân', 'Duỗi bàn chân, cảm nhận bàn chân chạm sàn.']
  ];
  const pmr = {
    render: () => `
      <label class="check"><input type="checkbox" id="relax-only"> <span>Chỉ thả lỏng, không gồng (phù hợp khi đau hoặc mệt)</span></label>
      <div class="pmr-card" id="pmrc" aria-live="polite"><p>Siết khoảng 30% sức trong ~5 giây, rồi thả lỏng ~10 giây. Bỏ qua vùng đang đau hoặc chấn thương.</p></div>
      <div class="progress"><div id="pbar"></div></div>
      <ol class="pmr-list">${PMR.map(g => `<li>${g[0]}</li>`).join('')}</ol>
      <div class="btn-row center">
        <button class="btn primary" id="pplay">▶ Bắt đầu</button>
        <button class="btn soft" id="pskip">Bỏ qua vùng này</button>
      </div>`,
    mount(body, ex, api) {
      let gi = 0, phase = 'tense', t = 0, running = false, timer = null;
      const len = () => ($('#relax-only', body).checked ? { tense: 0, relax: 12 } : { tense: 5, relax: 10 });
      const show = () => {
        const items = $$('.pmr-list li', body);
        items.forEach((li, k) => { li.classList.toggle('on', k === gi); li.classList.toggle('done', k < gi); });
        if (gi >= PMR.length) {
          $('#pmrc', body).innerHTML = '<h2>Hoàn thành</h2><p>Để cả cơ thể nghỉ thêm vài hơi thở tự nhiên.</p><button class="btn primary" data-act="finishExercise">Check-out</button>';
          $('#pbar', body).style.width = '100%'; pause(); $('#pplay', body).hidden = true; $('#pskip', body).hidden = true;
          return;
        }
        const [name, tense, relax] = PMR[gi];
        $('#pmrc', body).innerHTML = `<p class="label">${name}</p><h2>${phase === 'tense' ? tense : relax}</h2><p class="fine">${phase === 'tense' ? 'Nhẹ nhàng, không gồng hết sức' : 'Để ý cảm giác khi cơ thả lỏng'}</p>`;
      };
      let lastTs = 0;
      const tick = () => {
        const L = len();
        if (phase === 'tense' && L.tense === 0) phase = 'relax';
        const now = performance.now(); t += Math.min(1, (now - lastTs) / 1000); lastTs = now;
        const cur = phase === 'tense' ? L.tense : L.relax;
        $('#pbar', body).style.width = Math.min(100, (t / cur) * 100) + '%';
        if (t >= cur) {
          t = 0;
          if (phase === 'tense') { phase = 'relax'; chimeIf(396); }
          else { phase = 'tense'; gi++; chimeIf(528); }
          show();
        }
      };
      const chimeIf = f => { if (running) chime(f, 0.5); };
      function pause() { running = false; clearInterval(timer); const b = $('#pplay', body); if (b) b.textContent = '▶ Tiếp tục'; }
      $('#pplay', body).addEventListener('click', () => {
        if (running) return pause();
        getCtx(); running = true; lastTs = performance.now(); timer = setInterval(tick, 100); $('#pplay', body).textContent = '❚❚ Tạm dừng'; show();
      });
      $('#pskip', body).addEventListener('click', () => { gi++; phase = 'tense'; t = 0; show(); });
      api.lifecycle.onCleanup(() => clearInterval(timer));
      return pause;
    }
  };

  /* ================= Nhật ký ngắn ================= */
  const journal = {
    render(ex, api) {
      const member = api.state.mode === 'member' && api.hasConsent('store_narrative');
      return `
        <p class="warn">🔒 Không ghi tên, số hồ sơ, số giường hay chi tiết nhận diện người bệnh/đồng nghiệp.</p>
        <label class="label" for="j1">Chuyện gì đã xảy ra?</label><textarea id="j1" rows="3" maxlength="1000"></textarea>
        <label class="label" for="j2">Mình cảm thấy gì?</label><textarea id="j2" rows="2" maxlength="600"></textarea>
        <label class="label" for="j3">Mình cần gì lúc này?</label><textarea id="j3" rows="2" maxlength="600"></textarea>
        <div id="jpii"></div>
        ${member ? '<label class="check"><input type="checkbox" id="jsave"> <span>Lưu nhật ký này vào hành trình của tôi</span></label>'
          : `<p class="fine">${api.state.mode === 'guest' ? 'Chế độ ẩn danh: nhật ký không được lưu.' : 'Nhật ký không được lưu (bạn chưa đồng ý lưu nội dung tự viết).'}</p>`}
        <div class="btn-row">
          <button class="btn primary" id="jdone">Xong</button>
          <button class="btn ghost" id="jclear">Xóa nội dung</button>
        </div>
        <p class="fine">Viết ra giúp suy nghĩ có hình dạng. Bạn có thể đọc lại, rồi xóa nếu muốn.</p>`;
    },
    mount(body, ex, api) {
      const E = window.STOP4P_ENGINE;
      let acked = false;
      $$('textarea', body).forEach(t => t.addEventListener('input', () => { acked = false; $('#jpii', body).innerHTML = ''; }));
      $('#jclear', body).addEventListener('click', () => { $$('textarea', body).forEach(t => { t.value = ''; }); api.state.session.journal = null; api.toast('Đã xóa nội dung nhật ký.'); });
      $('#jdone', body).addEventListener('click', () => {
        const all = ['#j1', '#j2', '#j3'].map(id => $(id, body).value).join('\n');
        const hits = E.detectPII(all);
        if (hits.length && !acked) {
          acked = true;
          $('#jpii', body).innerHTML = `<div class="pii-panel" role="alert"><p><b>Có thể có thông tin nhận diện:</b> ${hits.map(h => `<mark>${api.esc(h.text)}</mark>`).join(', ')}</p>
            <p class="fine">Hãy sửa lại nếu cần, rồi bấm Xong lần nữa.</p></div>`;
          return;
        }
        const save = $('#jsave', body);
        if (save && save.checked) api.state.session.journal = { what: $('#j1', body).value, feel: $('#j2', body).value, need: $('#j3', body).value };
        api.finish();
      });
    }
  };

  /* ================= Ba điều biết ơn ================= */
  const treeSVG = n => `
    <svg viewBox="0 0 120 120" class="tree" aria-hidden="true">
      <path d="M60 115 C58 90 60 70 60 55 M60 80 C50 70 42 66 34 60 M60 70 C70 62 78 58 88 52" class="trunk"/>
      <ellipse cx="34" cy="54" rx="12" ry="8" class="leaf ${n > 0 ? 'on' : ''}"/>
      <ellipse cx="88" cy="46" rx="12" ry="8" class="leaf ${n > 1 ? 'on' : ''}"/>
      <ellipse cx="60" cy="40" rx="14" ry="10" class="leaf ${n > 2 ? 'on' : ''}"/>
      ${n > 2 ? '<circle cx="60" cy="40" r="4" class="flower"/>' : ''}
    </svg>`;
  function gratitudeBlock(values = ['', '', ''], sad) {
    return `
      <p class="gentle">Nếu phù hợp lúc này. ${sad ? 'Khi đang buồn hay bực, bạn hoàn toàn có thể bỏ qua phần này — điều đó ổn.' : 'Không cần phải tích cực; một điều rất nhỏ cũng được.'}</p>
      <div class="grat">
        <div id="tree">${treeSVG(values.filter(Boolean).length)}</div>
        <div class="grat-inputs">
          ${[0, 1, 2].map(i => `<label class="sr-only" for="g${i}">Điều biết ơn ${i + 1}</label><input id="g${i}" maxlength="140" placeholder="${['Một cốc nước ấm…', 'Đồng nghiệp đỡ mình một tay…', 'Ca trực đã qua…'][i]}" value="${values[i] ? values[i].replace(/"/g, '&quot;') : ''}">`).join('')}
        </div>
      </div>`;
  }
  function bindGratitude(body, onChange) {
    $$('.grat-inputs input', body).forEach(inp => inp.addEventListener('input', () => {
      const vals = $$('.grat-inputs input', body).map(i => i.value.trim());
      $('#tree', body).innerHTML = treeSVG(vals.filter(Boolean).length);
      onChange && onChange(vals);
    }));
  }
  const gratitude = {
    render: (ex, api) => `${gratitudeBlock(undefined, sadNow(api))}
      <p class="fine">Ba điều này chỉ hiện ở đây, không được lưu.</p>
      <div class="btn-row"><button class="btn primary" data-act="finishExercise">Hoàn tất</button><button class="btn soft" data-act="finishExercise">Bỏ qua</button></div>`,
    mount(body) { bindGratitude(body); }
  };
  const sadNow = api => ['sad', 'irritated'].some(c => api.state.checkin.emotions.includes(c));

  /* ================= Âm thanh thư giãn ================= */
  const audio = {
    render: () => `
      <div class="audio-ui">
        <div class="audio-art" id="aart" aria-hidden="true">🌊</div>
        <label class="label" for="akind">Âm nền</label>
        <select id="akind"><option value="waves">Sóng biển (dịu, lên xuống chậm)</option><option value="rain">Mưa nhẹ</option><option value="pink">Tiếng ồn hồng đều</option></select>
        <span class="label">Hẹn giờ</span>
        <div class="chips">${[5, 10, 15].map((m, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-amin="${m}">${m} phút</button>`).join('')}</div>
        <label class="label" for="avol">Âm lượng</label><input type="range" id="avol" min="0" max="100" value="40">
        <div class="btn-row center"><button class="btn primary" id="aplay">▶ Phát</button></div>
        <p class="fine center" id="aleft"></p>
        <p class="fine">Mô tả thay thế: âm nền không lời, đều và nhỏ, tự nhỏ dần khi hết giờ. Sách nói/nhạc có bản quyền sẽ được đơn vị bổ sung sau khi được phép sử dụng.</p>
      </div>`,
    mount(body, ex, api) {
      let nodes = null, mins = 5, endAt = 0, timer = null;
      body.addEventListener('click', e => { const c = e.target.closest('[data-amin]'); if (c) { mins = +c.dataset.amin; $$('[data-amin]', body).forEach(x => x.classList.toggle('on', x === c)); } });
      $('#akind', body).addEventListener('change', e => { $('#aart', body).textContent = { waves: '🌊', rain: '🌧️', pink: '🌫️' }[e.target.value]; if (nodes) { stop(); play(); } });
      $('#avol', body).addEventListener('input', () => { if (nodes) nodes.master.gain.setTargetAtTime(vol(), nodes.ctx.currentTime, 0.2); });
      const vol = () => (+$('#avol', body).value / 100) * 0.5;
      function build(kind) {
        const ctx = getCtx(); if (!ctx) return null;
        const len = ctx.sampleRate * 8, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        let last = 0, b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (kind === 'waves') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
          else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.06; }
        }
        const drift = d[len - 1] - d[0]; for (let i = 0; i < len; i++) d[i] -= drift * i / len; // nối vòng không "tách"
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = kind === 'rain' ? 'bandpass' : 'lowpass'; filt.frequency.value = kind === 'rain' ? 2500 : kind === 'waves' ? 900 : 4000; filt.Q.value = 0.5;
        const amp = ctx.createGain(); amp.gain.value = kind === 'waves' ? 0.6 : 1;
        const master = ctx.createGain(); master.gain.value = 0.0001;
        src.connect(filt).connect(amp).connect(master).connect(ctx.destination);
        let lfo = null;
        if (kind === 'waves') { lfo = ctx.createOscillator(); const depth = ctx.createGain(); lfo.frequency.value = 0.09; depth.gain.value = 0.4; lfo.connect(depth).connect(amp.gain); lfo.start(); }
        src.start();
        master.gain.setTargetAtTime(vol(), ctx.currentTime, 1.2);
        return { ctx, src, master, lfo };
      }
      function play() {
        nodes = build($('#akind', body).value); if (!nodes) { api.toast('Trình duyệt không hỗ trợ âm thanh.'); return; }
        endAt = Date.now() + mins * 60000;
        $('#aplay', body).textContent = '■ Dừng';
        timer = setInterval(() => {
          const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          $('#aleft', body).textContent = `Còn ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
          if (left <= 0) { stop(); $('#aleft', body).innerHTML = 'Hết giờ. <button class="btn primary" data-act="finishExercise">Check-out</button>'; }
        }, 1000);
      }
      function stop() {
        clearInterval(timer);
        if (nodes) {
          const n = nodes; nodes = null;
          n.master.gain.setTargetAtTime(0.0001, n.ctx.currentTime, 0.6);
          setTimeout(() => { try { n.src.stop(); n.lfo && n.lfo.stop(); } catch (e) { /* bỏ qua */ } }, 2500);
        }
        const b = $('#aplay', body); if (b) b.textContent = '▶ Phát';
      }
      $('#aplay', body).addEventListener('click', () => (nodes ? stop() : play()));
      api.lifecycle.onCleanup(stop);
      return stop;
    }
  };

  /* ================= Nghỉ ngắn phục hồi ================= */
  const recovery = {
    render: () => `
      <div class="safety-card"><b>Nếu buồn ngủ hoặc mệt đang ảnh hưởng đến an toàn người bệnh:</b> tạm dừng nhiệm vụ khi có thể, báo người phụ trách và làm theo quy trình an toàn của đơn vị. Bài tập không thay thế cho giấc ngủ.</div>
      <p class="label">Những điều có thể giúp — chọn điều bạn làm được:</p>
      <ul class="checklist">
        ${['💧 Uống vài ngụm nước', '🍞 Ăn nhẹ nếu đang đói', '🚶 Đi lại, vươn vai 1–2 phút', '🪟 Rời màn hình, nhìn ra xa', '🚻 Đi vệ sinh nếu cần', '💬 Nhắn cho đồng nghiệp/người tin cậy', '🙋 Nhờ người phụ trách sắp xếp nghỉ']
          .map((x, i) => `<li><label class="check"><input type="checkbox" id="mr${i}"> <span>${x}</span></label></li>`).join('')}
      </ul>
      <p class="label">Nghỉ không cần làm gì cả</p>
      <div class="chips">${[1, 3, 5, 10].map(m => `<button class="chip" data-rest="${m}">${m} phút</button>`).join('')}</div>
      <div class="rest" id="rest" hidden><div class="progress"><div id="rbar"></div></div><p class="fine" id="rtext">Bạn đang nghỉ. Không cần làm gì cả.</p></div>
      <div class="btn-row"><button class="btn primary" data-act="finishExercise">Xong → Check-out</button><button class="btn soft" data-go="support">Tìm hỗ trợ</button></div>`,
    mount(body, ex, api) {
      let timer = null;
      body.addEventListener('click', e => {
        const c = e.target.closest('[data-rest]');
        if (!c) return;
        clearInterval(timer);
        $$('[data-rest]', body).forEach(x => x.classList.toggle('on', x === c));
        const total = +c.dataset.rest * 60, start = Date.now();
        $('#rest', body).hidden = false;
        timer = setInterval(() => {
          const el = (Date.now() - start) / 1000;
          $('#rbar', body).style.width = Math.min(100, el / total * 100) + '%';
          if (el >= total) { clearInterval(timer); $('#rtext', body).textContent = 'Hết thời gian nghỉ. Bạn có thể nghỉ thêm nếu cần.'; chime(440, 1); }
        }, 500);
      });
      api.lifecycle.onCleanup(() => clearInterval(timer));
      return () => clearInterval(timer);
    }
  };

  /* ================= Hình nhân viên y tế (SVG) ================= */
  const ZONES = {
    head: { label: 'Đầu / thái dương', pts: [[100, 36]] },
    jaw: { label: 'Hàm / cổ', pts: [[100, 82]] },
    shoulders: { label: 'Vai', pts: [[68, 100], [132, 100]] },
    chest: { label: 'Ngực', pts: [[100, 124]] },
    stomach: { label: 'Bụng / dạ dày', pts: [[100, 160]] },
    back: { label: 'Hông / thắt lưng', pts: [[80, 186]] },
    hands: { label: 'Bàn tay / cổ tay', pts: [[47, 184], [153, 184]] },
    legs: { label: 'Chân', pts: [[80, 262], [120, 262]] },
    feet: { label: 'Bàn chân (đứng lâu)', pts: [[76, 326], [124, 326]] }
  };
  function figureSVG(opts = {}) {
    const { marked = [], relaxed = [], active = null, smile = 0 } = opts;
    const mouth = 62 + smile * 7;
    return `
      <svg viewBox="0 0 200 345" class="figure" role="group" aria-label="Hình nhân viên y tế — chạm vào các điểm trên cơ thể">
        <ellipse cx="100" cy="338" rx="60" ry="6" class="shadow"/>
        <path d="M56 188 L144 188 L140 320 L108 320 L100 224 L92 320 L60 320 Z" class="pants"/>
        <rect x="56" y="318" width="38" height="12" rx="6" class="shoe"/><rect x="106" y="318" width="38" height="12" rx="6" class="shoe"/>
        <path d="M62 94 L42 174 L54 180 L74 112 Z" class="scrub"/><path d="M138 94 L158 174 L146 180 L126 112 Z" class="scrub"/>
        <circle cx="47" cy="184" r="8" class="skin"/><circle cx="153" cy="184" r="8" class="skin"/>
        <path d="M60 92 Q100 82 140 92 L146 192 L54 192 Z" class="scrub"/>
        <rect x="92" y="72" width="16" height="16" class="skin"/>
        <path d="M86 88 L100 108 L114 88 Z" class="skin"/>
        <rect x="112" y="130" width="18" height="16" rx="3" class="pocket"/>
        <path d="M86 90 Q78 130 92 146" class="steth"/><circle cx="93" cy="149" r="5" class="steth-head"/>
        <circle cx="100" cy="50" r="26" class="skin"/>
        <path d="M73 46 Q74 20 100 20 Q126 20 127 46 Q116 38 100 38 Q84 38 73 46 Z" class="cap"/>
        <circle cx="91" cy="52" r="2.6" class="eye"/><circle cx="109" cy="52" r="2.6" class="eye"/>
        <path d="M90 62 Q100 ${mouth} 110 62" class="mouth"/>
        ${Object.entries(ZONES).map(([k, z]) => z.pts.map(([x, y]) => `
          <g class="zone ${marked.includes(k) ? 'marked' : ''} ${relaxed.includes(k) ? 'relaxed' : ''} ${active === k ? 'active' : ''}" data-zone="${k}"
             ${opts.interactive ? `tabindex="0" role="button" aria-pressed="${marked.includes(k)}" aria-label="${z.label}"` : 'aria-hidden="true"'}>
            <circle cx="${x}" cy="${y}" r="15" class="hit"/><circle cx="${x}" cy="${y}" r="7" class="dot"/>
          </g>`).join('')).join('')}
      </svg>`;
  }

  /* ================= Hành trình STOP-4P (trò chơi 9 chặng) ================= */
  const S4_STEPS = [
    { key: 'checkin', icon: '📍', title: 'Check-in', sub: 'Mình đang ở đâu lúc này?' },
    { key: 'monkeys', icon: '🐒', title: 'STOP bầy khỉ', sub: 'Ra lệnh cho bầy khỉ suy nghĩ dừng lại' },
    { key: 'dragon', icon: '🐉', title: 'Rồng thổi chong chóng', sub: 'Hít vào – thở ra cùng bé rồng' },
    { key: 'pain', icon: '📌', title: 'Điểm đau', sub: 'Cơ thể đang căng hay mỏi ở đâu?' },
    { key: 'relax', icon: '💆', title: 'Thư giãn', sub: 'Lần lượt thả lỏng từng vùng' },
    { key: 'name', icon: '🏷️', title: 'Gọi tên cảm xúc', sub: 'Gọi tên để có một khoảng cách nhỏ' },
    { key: 'clouds', icon: '☁️', title: 'Đám mây', sub: 'Để suy nghĩ trôi qua như mây' },
    { key: 'connect', icon: '💗', title: 'Kết nối bản thân', sub: 'Nói với mình như nói với một đồng nghiệp thân' },
    { key: 'gratitude', icon: '🌱', title: '3 lời biết ơn', sub: 'Nếu phù hợp lúc này' }
  ];
  const MONKEY_THOUGHTS = ['Còn 3 hồ sơ!', 'Chuông gọi!', 'Người nhà chờ…', 'Quên gì chưa?', 'Ca sau sao đây?', 'Mệt quá…', 'Tin nhắn!', 'Lỡ sai thì…', 'Chưa ăn trưa', 'Giao ban!'];
  const RELAX_SEQ = [
    ['head', 'Thả lỏng trán, hai hàng lông mày và vùng quanh mắt.'],
    ['jaw', 'Thả lỏng hàm, để răng không chạm nhau, lưỡi nghỉ tự nhiên.'],
    ['shoulders', 'Để hai vai hạ xuống, rời xa tai. Lúc này bạn không cần gồng gánh mọi thứ.'],
    ['chest', 'Để hơi thở tự nhiên đi vào lồng ngực — không cần sâu hơn.'],
    ['stomach', 'Bụng mềm ra, thở ra chậm.'],
    ['hands', 'Duỗi nhẹ các ngón tay rồi để bàn tay nghỉ — đôi tay đã làm việc rất nhiều.'],
    ['feet', 'Cảm nhận bàn chân chạm sàn. Mặt đất đang đỡ bạn.']
  ];
  const SELF_PHRASES = ['Mình đã làm hết sức trong điều kiện lúc đó.', 'Mình được phép mệt.', 'Mình không phải một mình.', 'Mình xứng đáng được nghỉ ngơi.', 'Cảm xúc này rồi sẽ qua.'];
  const CLOUD_COLORS = ['#ffffff', '#fdecef', '#fff6d8', '#e6f3ff', '#efe8ff', '#e2f6f1'];

  const journey = {
    render: () => `
      <div class="s4">
        <ol class="s4-map" id="s4map" aria-label="Các chặng của hành trình"></ol>
        <div class="s4-stage" id="s4stage"></div>
      </div>`,
    mount(body, ex, api) {
      const st = api.state;
      if (!st.session.stop4p || st.session.stop4p.finished) {
        st.session.stop4p = { i: 0, done: [], skipped: [], distress0: st.checkin.distress, breaths: 0, pain: [], relaxed: [], named: [...st.checkin.emotions], clouds: 0, selfNote: '', gratitude: [] };
        if (st.checkin.done && st.checkin.distress != null) { st.session.stop4p.done.push('checkin'); st.session.stop4p.i = 1; }
      }
      const g = st.session.stop4p;
      const map = $('#s4map', body), stage = $('#s4stage', body);
      let stepClean = [];
      const sub = {
        later: (fn, ms) => { const id = setTimeout(fn, ms); stepClean.push(() => clearTimeout(id)); },
        loop: fn => {
          let alive = true, last = performance.now();
          const f = now => { if (!alive) return; fn(Math.min(0.25, (now - last) / 1000)); last = now; requestAnimationFrame(f); };
          requestAnimationFrame(f); stepClean.push(() => { alive = false; });
        },
        on: (el, t, fn) => { el.addEventListener(t, fn); stepClean.push(() => el.removeEventListener(t, fn)); }
      };
      const clearStep = () => { stepClean.forEach(f => f()); stepClean = []; };
      api.lifecycle.onCleanup(clearStep);

      const drawMap = () => {
        map.innerHTML = S4_STEPS.map((s, k) => {
          const cls = g.done.includes(s.key) ? 'done' : g.skipped.includes(s.key) ? 'skipped' : '';
          return `<li class="node ${cls} ${k === g.i ? 'current' : ''}">
            <button data-s4="jump" data-i="${k}" aria-label="Chặng ${k + 1}: ${s.title}${cls === 'done' ? ' (đã xong)' : cls === 'skipped' ? ' (đã bỏ qua)' : ''}" ${k === g.i ? 'aria-current="step"' : ''}>${s.icon}</button>
            <span>${s.title}</span></li>`;
        }).join('');
        const cur = map.children[Math.min(g.i, S4_STEPS.length - 1)];
        if (cur) map.scrollTo({ left: cur.offsetLeft - map.clientWidth / 2 + cur.clientWidth / 2, behavior: api.reduceMotion() ? 'auto' : 'smooth' });
      };
      const markDone = key => { if (!g.done.includes(key)) g.done.push(key); g.skipped = g.skipped.filter(k => k !== key); };
      const next = () => { g.i++; show(); };

      const frame = (s, k, inner, nextLabel = 'Tiếp tục') => `
        <div class="s4-head"><p class="s4-count">Chặng ${k + 1}/${S4_STEPS.length}</p><h2>${s.icon} ${s.title}</h2><p>${s.sub}</p></div>
        ${inner}
        <div class="s4-nav">
          <button class="btn ghost" data-s4="skip">Bỏ qua chặng này</button>
          <button class="btn primary" data-s4="next" id="s4next">${nextLabel} ›</button>
        </div>`;

      const STEP = {
        checkin(s, k) {
          let v = g.distress0;
          stage.innerHTML = frame(s, k, `
            <div class="s4-checkin">
              <div class="capy-wrap" id="ccapy">${api.capy(v)}</div>
              <label for="s4d" class="label">Mức khó chịu lúc này <small>(0–10, tự đánh giá, không phải chẩn đoán)</small></label>
              <input type="range" id="s4d" min="0" max="10" value="${v ?? 5}">
              <div class="scale-ends"><span>0 · dễ chịu</span><span>10 · khó chịu nhất</span></div>
              <p id="s4dv" aria-live="polite">${v == null ? 'Kéo thanh trượt nếu muốn — hoặc bỏ qua' : `<b>${v}</b> · ${D.DISTRESS_LABELS[v]}`}</p>
              <p class="gentle">Không có câu trả lời đúng hay sai. Chỉ là nhận biết.</p>
            </div>`);
          const r = $('#s4d', stage);
          r.addEventListener('input', () => {
            v = +r.value; g.distress0 = v; api.ensureCheckinDistress(v);
            $('#ccapy', stage).innerHTML = api.capy(v);
            $('#s4dv', stage).innerHTML = `<b>${v}</b> · ${D.DISTRESS_LABELS[v]}`;
            markDone('checkin');
          });
        },

        monkeys(s, k) {
          const n = 12;
          stage.innerHTML = frame(s, k, `
            <div class="garden ${api.reduceMotion() ? 'still' : ''}" id="garden" aria-hidden="true">
              ${Array.from({ length: n }, (_, j) => {
                const th = j % 2 === 0 ? `<i class="bubble">${MONKEY_THOUGHTS[(j / 2) % MONKEY_THOUGHTS.length]}</i>` : '';
                return `<span class="monkey" style="left:${6 + Math.random() * 80}%;top:${14 + Math.random() * 62}%;animation-duration:${0.6 + Math.random() * 0.8}s;animation-delay:${-Math.random()}s">${['🐒', '🙉', '🐵', '🙊'][j % 4]}${th}</span>`;
              }).join('')}
              <div class="garden-quote" id="gquote"></div>
            </div>
            <p class="s4-inst">Suy nghĩ đang nhảy nhót như một bầy khỉ? Nhấn và giữ chuông 3 giây để nói <b>"DỪNG LẠI"</b>.</p>
            <div class="bell-wrap">
              <button class="bell" id="bell" style="--p:0" aria-describedby="bell-msg">🔔<span class="sr-only">Nhấn giữ 3 giây để dừng</span></button>
            </div>
            <p id="bell-msg" class="center" aria-live="polite">Nhấn giữ chuông</p>
            <button class="link center-block" id="bell-tap">Khó nhấn giữ? Chạm vào đây để dừng</button>`);
          const bell = $('#bell', stage), msg = $('#bell-msg', stage);
          let holding = false, start = 0, doneFlag = g.done.includes('monkeys');
          const finish = () => {
            if (doneFlag && $('#garden', stage).classList.contains('calm')) return;
            doneFlag = true; holding = false; bell.style.setProperty('--p', 1);
            $('#garden', stage).classList.add('calm');
            $('#gquote', stage).textContent = 'Dừng lại. Mình đang ở đây, trong khoảnh khắc này.';
            msg.textContent = 'Bầy khỉ đã ngồi yên. Suy nghĩ vẫn có thể quay lại — và bạn biết cách dừng.';
            vibrate([40, 60, 40]); chime(528, 1.2);
            markDone('monkeys'); drawMap();
          };
          const down = e => { if (e.type === 'keydown' && (e.repeat || !['Enter', ' '].includes(e.key))) return; e.preventDefault(); getCtx(); holding = true; start = performance.now(); msg.textContent = 'Giữ nguyên… thở tự nhiên'; };
          const up = () => { if (!holding) return; holding = false; if (!doneFlag) { bell.style.setProperty('--p', 0); msg.textContent = 'Thử lại — giữ chuông lâu hơn một chút'; } };
          sub.on(bell, 'pointerdown', down); sub.on(bell, 'keydown', down);
          ['pointerup', 'pointerleave', 'pointercancel', 'keyup'].forEach(t => sub.on(bell, t, up));
          sub.on(bell, 'contextmenu', e => e.preventDefault());
          $('#bell-tap', stage).addEventListener('click', finish);
          sub.loop(() => {
            if (!holding) return;
            const p = Math.min(1, (performance.now() - start) / 3000);
            bell.style.setProperty('--p', p);
            if (p >= 1) finish();
          });
          if (doneFlag) finish();
        },

        dragon(s, k) {
          stage.innerHTML = frame(s, k, `
            <div class="dragon-scene">
              <div class="dragon" id="dragon" aria-hidden="true"><span>🐉</span></div>
              <div class="wind" id="wind" aria-hidden="true"><i></i><i></i><i></i></div>
              <div class="pinwheel-wrap" aria-hidden="true">
                <svg viewBox="-50 -50 100 100" class="pinwheel" id="pin">
                  <g id="pinrot">
                    <path d="M0 0 L0 -44 Q22 -30 0 0" fill="#F28B82"/><path d="M0 0 L44 0 Q30 22 0 0" fill="#FBBC04"/>
                    <path d="M0 0 L0 44 Q-22 30 0 0" fill="#34A853"/><path d="M0 0 L-44 0 Q-30 -22 0 0" fill="#4FC3F7"/>
                    <circle r="5" fill="#fff" stroke="#999"/>
                  </g>
                </svg>
                <div class="stick"></div>
              </div>
            </div>
            <div class="energy" aria-hidden="true"><div id="ebar"></div></div>
            <p id="dmsg" class="center" aria-live="polite">Nhấn giữ nút để hít vào (bụng rồng phồng lên), thả ra để thở ra thật chậm.</p>
            <div class="center"><button class="hold-btn" id="hold">Giữ để hít vào</button></div>
            <p class="center fine">Hơi thở: <b id="bc">${g.breaths}</b> · gợi ý 3 hơi, hoặc bao nhiêu bạn thấy thoải mái. Không cần nín thở.</p>`);
          const btn = $('#hold', stage), dragon = $('#dragon', stage), rot = $('#pinrot', stage), ebar = $('#ebar', stage), dmsg = $('#dmsg', stage), wind = $('#wind', stage);
          let holding = false, energy = 0, wind0 = 0, angle = 0;
          const down = e => { if (e.type === 'keydown' && (e.repeat || !['Enter', ' '].includes(e.key))) return; e.preventDefault(); holding = true; dmsg.textContent = 'Hít vào nhẹ nhàng… bụng rồng phồng lên'; btn.classList.add('on'); };
          const up = () => {
            if (!holding) return;
            holding = false; btn.classList.remove('on');
            if (energy >= 20) {
              wind0 = energy; g.breaths++; $('#bc', stage).textContent = g.breaths;
              dmsg.textContent = 'Thở ra thật chậm… chong chóng quay';
              if (!api.reduceMotion()) { wind.classList.remove('blow'); void wind.offsetWidth; wind.classList.add('blow'); }
              if (g.breaths >= 3) { markDone('dragon'); drawMap(); }
            } else dmsg.textContent = 'Giữ lâu hơn một chút khi hít vào nhé';
          };
          sub.on(btn, 'pointerdown', down); sub.on(btn, 'keydown', down);
          ['pointerup', 'pointerleave', 'pointercancel', 'keyup'].forEach(t => sub.on(btn, t, up));
          sub.on(btn, 'contextmenu', e => e.preventDefault());
          sub.loop(dt => {
            if (holding) {
              energy = Math.min(100, energy + dt * 25);
              if (energy >= 100) dmsg.textContent = 'Đủ rồi — thả ra, thở ra từ từ nhé';
            } else {
              energy = Math.max(0, energy - dt * 16);
              if (wind0 > 0 && energy === 0) { wind0 = 0; dmsg.textContent = g.breaths >= 3 ? 'Tuyệt. Bạn có thể tiếp tục, hoặc thở thêm vài hơi.' : 'Sẵn sàng cho hơi thở tiếp theo'; }
            }
            dragon.style.transform = `scale(${1 + energy / 280})`;
            ebar.style.width = energy + '%';
            const speed = holding ? 20 : (wind0 ? energy * 7 : 10);
            angle = (angle + speed * dt) % 360;
            rot.setAttribute('transform', `rotate(${angle})`);
          });
        },

        pain(s, k) {
          stage.innerHTML = frame(s, k, `
            <p class="s4-inst">Chạm vào những nơi đang căng, mỏi hay khó chịu. Chỉ nhận biết, không phán xét.</p>
            <div class="fig-wrap" id="fig">${figureSVG({ marked: g.pain, interactive: true })}</div>
            <div class="chips" id="zchips">${Object.entries(ZONES).map(([key, z]) => `<button class="chip ${g.pain.includes(key) ? 'on' : ''}" aria-pressed="${g.pain.includes(key)}" data-z="${key}">${z.label}</button>`).join('')}</div>
            <p class="fine">Nếu đau nhiều, đau ngực, khó thở hoặc triệu chứng bất thường — hãy ưu tiên tìm hỗ trợ y tế.</p>`);
          const toggle = key => {
            const i = g.pain.indexOf(key);
            if (i >= 0) g.pain.splice(i, 1); else g.pain.push(key);
            $('#fig', stage).innerHTML = figureSVG({ marked: g.pain, interactive: true });
            $$('#zchips [data-z]', stage).forEach(c => { const on = g.pain.includes(c.dataset.z); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
            vibrate(15); markDone('pain'); drawMap();
          };
          sub.on(stage, 'click', e => { const z = e.target.closest('[data-zone], [data-z]'); if (z) toggle(z.dataset.zone || z.dataset.z); });
          sub.on(stage, 'keydown', e => { const z = e.target.closest('[data-zone]'); if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(z.dataset.zone); $(`#fig [data-zone="${z.dataset.zone}"]`, stage)?.focus(); } });
        },

        relax(s, k) {
          const seq = RELAX_SEQ;
          const renderRelax = () => {
            const idx = seq.findIndex(([z]) => !g.relaxed.includes(z));
            const frac = g.relaxed.length / seq.length;
            const active = idx >= 0 ? seq[idx][0] : null;
            const painNote = active && (g.pain.includes(active) || (active === 'feet' && g.pain.includes('legs')))
              ? '<p class="gentle">Đây là vùng bạn đã đánh dấu — chỉ thả lỏng thật nhẹ, không xoa bóp mạnh; bỏ qua nếu đau.</p>' : '';
            $('#relax-body', stage).innerHTML = `
              <div class="fig-wrap small">${figureSVG({ relaxed: g.relaxed, active, smile: frac * 2 - 1, marked: g.pain })}</div>
              <div class="relax-text" aria-live="polite">
                ${active ? `<p class="label">${ZONES[active].label} · ${g.relaxed.length + 1}/${seq.length}</p><p class="relax-say">${seq[idx][1]}</p>${painNote}
                  <div class="btn-row"><button class="btn primary" data-s4="relaxed">Đã thả lỏng ✓</button><button class="btn soft" data-s4="relaxskip">Bỏ qua vùng này</button></div>`
                : '<p class="relax-say">Cả cơ thể đã được chú ý và thả lỏng. Bạn đã chăm sóc mình.</p>'}
              </div>`;
            if (!active) { markDone('relax'); drawMap(); }
          };
          stage.innerHTML = frame(s, k, `<p class="s4-inst">Làm theo từng lời gợi ý, rồi chạm "Đã thả lỏng". Thả lỏng thay cho gồng.</p><div id="relax-body" class="relax-body"></div>`);
          sub.on(stage, 'click', e => {
            const b = e.target.closest('[data-s4="relaxed"], [data-s4="relaxskip"], .zone.active');
            if (!b) return;
            const idx = seq.findIndex(([z]) => !g.relaxed.includes(z));
            if (idx < 0) return;
            g.relaxed.push(seq[idx][0]); vibrate(20);
            renderRelax();
          });
          renderRelax();
        },

        name(s, k) {
          const ASSET = window.STOP4P_CONFIG.ASSET_BASE;
          stage.innerHTML = frame(s, k, `
            <p class="s4-inst">Bạn capybara đang giữ vài tấm thẻ. Tấm nào giống bạn lúc này? (chọn một hoặc nhiều)</p>
            <div class="emo-grid">${D.EMOTIONS.map(e => `
              <button class="emo ${g.named.includes(e.code) ? 'on' : ''}" aria-pressed="${g.named.includes(e.code)}" data-emo="${e.code}">
                ${e.img ? `<img class="emo-img" src="${ASSET + e.img}" alt="" data-fallback="${e.emoji}">` : `<span class="emoji-fallback emo-img">${e.emoji}</span>`}
                <span>${e.label}</span></button>`).join('')}
            </div>
            <p class="name-say" id="nsay" aria-live="polite"></p>`);
          const say = () => {
            $('#nsay', stage).innerHTML = g.named.length
              ? `"Mình đang cảm thấy <b>${g.named.map(c => D.EMOTIONS.find(e => e.code === c).label.toLowerCase()).join(', ')}</b>." Điều đó dễ hiểu. Cảm xúc không đúng cũng không sai — nó chỉ đang báo cho mình biết điều gì đó.`
              : '';
          };
          sub.on(stage, 'click', e => {
            const b = e.target.closest('[data-emo]'); if (!b) return;
            const i = g.named.indexOf(b.dataset.emo);
            if (i >= 0) g.named.splice(i, 1); else g.named.push(b.dataset.emo);
            b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', i < 0);
            say(); if (g.named.length) { markDone('name'); drawMap(); }
          });
          say();
        },

        clouds(s, k) {
          stage.innerHTML = frame(s, k, `
            <div class="sky ${api.reduceMotion() ? 'still' : ''}" id="sky" aria-hidden="true"><div class="sun">☀️</div></div>
            <p class="s4-inst">Suy nghĩ nào đang lởn vởn? Viết ngắn gọn rồi thả nó thành một đám mây. Bạn là bầu trời — mây đến rồi đi.</p>
            <div class="cloud-input">
              <label for="cth" class="sr-only">Suy nghĩ</label>
              <input id="cth" maxlength="80" placeholder="Ví dụ: Lỡ mình đã bỏ sót điều gì…">
              <button class="btn teal" id="cgo">Thả mây ☁️</button>
            </div>
            <p class="fine">Nội dung đám mây không được lưu. Không ghi tên hay thông tin người bệnh.</p>
            <p class="center" id="ccount" aria-live="polite">${g.clouds ? `Đã thả ${g.clouds} đám mây` : ''}</p>`);
          const sky = $('#sky', stage), inp = $('#cth', stage);
          const release = () => {
            const txt = inp.value.trim(); if (!txt) { inp.focus(); return; }
            const c = document.createElement('div');
            c.className = 'cloud'; c.textContent = txt;
            c.style.top = (8 + Math.random() * 55) + '%';
            c.style.background = CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)];
            c.addEventListener('animationend', () => c.remove());
            sky.appendChild(c);
            inp.value = ''; g.clouds++; $('#ccount', stage).textContent = `Đã thả ${g.clouds} đám mây. Thở ra và nhìn mây trôi.`;
            markDone('clouds'); drawMap();
          };
          $('#cgo', stage).addEventListener('click', release);
          inp.addEventListener('keydown', e => { if (e.key === 'Enter') release(); });
        },

        connect(s, k) {
          stage.innerHTML = frame(s, k, `
            <p class="s4-inst">Đặt một tay lên ngực hoặc lên cánh tay mình. Nếu một đồng nghiệp thân thiết đang trải qua đúng điều này, bạn sẽ nói gì với họ? Hãy nói điều đó với chính mình.</p>
            <div class="chips">${SELF_PHRASES.map(p => `<button class="chip" data-phrase="${p}">${p}</button>`).join('')}</div>
            <label for="self" class="sr-only">Lời nhắn cho bản thân</label>
            <textarea id="self" rows="3" maxlength="400" placeholder="Viết vài dòng cho chính mình…">${api.esc(g.selfNote)}</textarea>
            <div class="jar-scene" aria-hidden="true"><div class="heart" id="heart">💗</div><div class="jar">🫙<span id="jarcount">${g.selfNote ? '💗' : ''}</span></div></div>
            <div class="center"><button class="btn teal" id="tojar">Gửi vào hũ bình an</button></div>
            <p class="fine">${api.state.mode === 'member' && api.hasConsent('store_narrative') ? 'Lời nhắn được lưu vào hành trình của bạn.' : 'Lời nhắn không được lưu.'}</p>`);
          sub.on(stage, 'click', e => { const p = e.target.closest('[data-phrase]'); if (p) { const t = $('#self', stage); t.value = (t.value ? t.value.trim() + ' ' : '') + p.dataset.phrase; } });
          $('#tojar', stage).addEventListener('click', () => {
            const t = $('#self', stage).value.trim();
            if (!t) { $('#self', stage).focus(); return; }
            g.selfNote = t;
            const h = $('#heart', stage);
            h.classList.remove('drop'); void h.offsetWidth; h.classList.add('drop');
            vibrate([50, 100, 50]);
            sub.later(() => { $('#jarcount', stage).textContent = '💗'; api.toast('Đã gửi vào hũ bình an 💗'); }, api.reduceMotion() ? 0 : 1300);
            markDone('connect'); drawMap();
          });
        },

        gratitude(s, k) {
          const sad = g.named.some(c => ['sad', 'irritated'].includes(c)) || ['sad', 'irritated'].some(c => st.checkin.emotions.includes(c));
          stage.innerHTML = frame(s, k, gratitudeBlock(g.gratitude, sad), 'Hoàn tất');
          bindGratitude(stage, vals => { g.gratitude = vals; if (vals.some(Boolean)) { markDone('gratitude'); drawMap(); } });
        },

        end() {
          g.finished = true;
          const doneN = g.done.length;
          stage.innerHTML = `
            <div class="s4-end">
              ${api.capy(3, 'capy big')}
              <h2>Bạn đã đi hết hành trình</h2>
              <p>Bạn đã dành thời gian cho chính mình — điều đó đáng quý, dù bạn làm đủ hay bỏ qua chặng nào.</p>
              <ul class="plain s4-sum">
                <li>🧭 ${doneN}/${S4_STEPS.length} chặng đã thực hiện</li>
                ${g.breaths ? `<li>🐉 ${g.breaths} hơi thở cùng bé rồng</li>` : ''}
                ${g.relaxed.length ? `<li>💆 ${g.relaxed.length} vùng cơ thể được thả lỏng</li>` : ''}
                ${g.clouds ? `<li>☁️ ${g.clouds} đám mây đã trôi đi</li>` : ''}
                ${g.named.length ? `<li>🏷️ Cảm xúc đã gọi tên: ${g.named.map(c => D.EMOTIONS.find(e => e.code === c).label.toLowerCase()).join(', ')}</li>` : ''}
              </ul>
              <button class="btn primary" data-act="finishExercise">Check-out ›</button>
            </div>`;
          map.querySelectorAll('.node').forEach(n => n.classList.remove('current'));
        }
      };

      function show() {
        clearStep();
        drawMap();
        if (g.i >= S4_STEPS.length) { STEP.end(); return; }
        const s = S4_STEPS[g.i];
        STEP[s.key](s, g.i);
        if (!firstShow) {
          const h = $('.s4-head h2', stage);
          if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
          map.scrollIntoView({ block: 'start', behavior: api.reduceMotion() ? 'auto' : 'smooth' });
        }
        firstShow = false;
      }
      let firstShow = true;

      api.lifecycle.on(body, 'click', e => {
        const b = e.target.closest('[data-s4]');
        if (!b) return;
        const a = b.dataset.s4;
        if (a === 'jump') { g.i = +b.dataset.i; g.finished = false; show(); }
        else if (a === 'skip') { const key = S4_STEPS[g.i].key; if (!g.done.includes(key) && !g.skipped.includes(key)) g.skipped.push(key); next(); }
        else if (a === 'next') { const key = S4_STEPS[g.i].key; if (!g.done.includes(key) && !g.skipped.includes(key)) g.skipped.push(key); next(); }
      });
      show();
      return () => {};
    }
  };

  window.STOP4P_PLAYERS = { breath, steps, grounding, pmr, journal, gratitude, audio, recovery, journey };
})();
