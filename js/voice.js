/*
 * Giọng đọc của "người quản trò" — dùng giọng máy sẵn có trên thiết bị (Web Speech API).
 * Nguyên tắc: MẶC ĐỊNH TẮT, chỉ đọc sau khi người dùng chủ động bật; luôn có nút tắt và dừng ngay khi đổi màn hình.
 * Không gửi bất kỳ dữ liệu nào ra ngoài: nội dung đọc là lời dẫn có sẵn trong ứng dụng, không đọc nội dung người dùng tự viết.
 */
window.STOP4P_VOICE = (() => {
  const KEY = 'stop4p_voice';
  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';

  const prefs = (() => {
    const def = { on: false, gender: 'female', slow: false };
    try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return def; }
  })();
  const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* bỏ qua */ } };

  /* ---------- Nhận diện giọng trên thiết bị ---------- */
  // Bỏ chữ "vietnam/việt nam" trước khi dò từ khóa, vì nó chứa sẵn chữ "nam".
  const clean = v => (v.name + ' ' + v.voiceURI).toLowerCase()
    .replace(/vi[eệ]t\s*nam/g, ' ').replace(/vietnam(ese)?/g, ' ');
  // Tên giọng tiếng Việt thường gặp: Windows "Microsoft An" (nam); Edge/Azure "HoaiMy" (nữ), "NamMinh" (nam);
  // iOS "Linh" (nữ); Android "vi-vn-x-vif" (nữ) / "vi-vn-x-vim" (nam); Chrome "Google Tiếng Việt" (nữ).
  const FEMALE = ['hoaimy', 'hoai my', 'female', 'woman', 'nữ', 'linh', 'mai', 'ngọc', 'ngoc', 'thao', 'thảo', 'trang', 'lan', 'vif', 'f-local', 'google'];
  const MALE = ['namminh', 'nam minh', 'male', 'man', 'nam', 'minh', 'an', 'long', 'tuấn', 'tuan', 'vim', 'm-local'];
  const hit = (s, list) => list.some(k => new RegExp('(^|[^a-z])' + k + '([^a-z]|$)', 'i').test(s));
  const genderOf = v => { const s = clean(v); return hit(s, FEMALE) ? 'female' : hit(s, MALE) ? 'male' : null; };

  let viVoices = [];
  const listeners = [];
  function loadVoices() {
    if (!supported) return;
    viVoices = (synth.getVoices() || []).filter(v => /^vi([-_]|$)/i.test(v.lang || ''));
    listeners.forEach(fn => { try { fn(); } catch (e) { /* bỏ qua */ } });
  }
  if (supported) {
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    setTimeout(loadVoices, 400); // một số trình duyệt nạp giọng trễ
  }

  const quality = v => (/natural|neural|enhanced|premium/i.test(v.name) ? 0 : 1); // ưu tiên giọng tự nhiên
  function pick() {
    if (!viVoices.length) return null; // dùng giọng mặc định của thiết bị
    const same = viVoices.filter(v => genderOf(v) === prefs.gender).sort((a, b) => quality(a) - quality(b));
    return same[0] || viVoices.find(v => genderOf(v) === null) || viVoices[0];
  }
  // Thiết bị có sẵn giọng tiếng Việt đúng giới tính này không?
  const has = g => viVoices.some(v => genderOf(v) === g);
  // Không có giọng đúng giới tính (hoặc không có giọng tiếng Việt) → mô phỏng bằng cao độ.
  const simulated = () => !viVoices.length || !has(prefs.gender);
  const pitchFor = () => (simulated() ? (prefs.gender === 'female' ? 1.18 : 0.78) : (prefs.gender === 'female' ? 1.04 : 0.94));
  const rateFor = () => (prefs.slow ? 0.68 : 0.82);

  /* ---------- Hàng đợi lời dẫn, có khoảng dừng ---------- */
  let token = 0, timer = null, keepAlive = null, lastSegs = null;
  const norm = segs => (Array.isArray(segs) ? segs : [segs])
    .map(s => (typeof s === 'string' ? { t: s, pause: 3 } : { t: s.t, pause: s.pause ?? 3 }))
    .filter(s => s.t && s.t.trim());

  function stop() {
    token++;
    clearTimeout(timer); timer = null;
    clearInterval(keepAlive); keepAlive = null;
    if (supported) { try { synth.cancel(); } catch (e) { /* bỏ qua */ } }
  }

  function run(segs) {
    if (!supported || !prefs.on) return;
    stop();
    const t = token, list = norm(segs);
    if (!list.length) return;
    lastSegs = list;
    // Chrome cắt tiếng sau ~15 giây: giữ nhịp bằng pause/resume.
    keepAlive = setInterval(() => { if (synth.speaking && !synth.paused) { try { synth.pause(); synth.resume(); } catch (e) { /* bỏ qua */ } } }, 9000);
    let i = 0;
    const next = () => {
      if (t !== token) return;
      if (i >= list.length) { clearInterval(keepAlive); keepAlive = null; return; }
      const seg = list[i++];
      const u = new SpeechSynthesisUtterance(seg.t);
      const v = pick();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'vi-VN';
      u.rate = rateFor(); u.pitch = pitchFor(); u.volume = 1;
      u.onend = () => { if (t === token) timer = setTimeout(next, Math.max(0, seg.pause) * 1000); };
      u.onerror = u.onend;
      try { synth.speak(u); } catch (e) { u.onend(); }
    };
    next();
  }

  /* ---------- Thanh điều khiển ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function statusNote() {
    if (!viVoices.length) {
      return '⚠️ Trình duyệt chưa thấy giọng tiếng Việt nào nên máy sẽ đọc bằng giọng mặc định và phát âm sai. '
        + 'Nếu bạn vừa cài giọng tiếng Việt, hãy <b>đóng hẳn trình duyệt rồi mở lại</b> (danh sách giọng chỉ nạp lúc khởi động), sau đó bấm “Làm mới giọng”. '
        + 'Cách cài: Windows — Cài đặt › Thời gian &amp; ngôn ngữ › Giọng nói › Quản lý giọng nói › Thêm giọng nói › Tiếng Việt; '
        + 'Android — Cài đặt › Ngôn ngữ &amp; nhập liệu › Chuyển văn bản thành giọng nói; iPhone — Cài đặt › Trợ năng › Nội dung đọc › Giọng nói › Tiếng Việt. '
        + 'Microsoft Edge thường có sẵn hai giọng tiếng Việt tự nhiên (HoaiMy — nữ, NamMinh — nam) mà không cần cài thêm.';
    }
    const v = pick();
    const want = prefs.gender === 'female' ? 'nữ' : 'nam';
    if (simulated()) {
      return `Máy này chỉ có giọng tiếng Việt: <b>${esc(v.name)}</b>. Chưa có giọng ${want} riêng nên ứng dụng đang mô phỏng bằng cách đổi cao độ. `
        + 'Muốn có đủ cả giọng nữ và nam tiếng Việt, bạn có thể mở ứng dụng bằng Microsoft Edge (có HoaiMy — nữ và NamMinh — nam).';
    }
    return `Đang dùng giọng <b>${esc(v.name)}</b> (${esc(v.lang)}), đọc chậm và có khoảng dừng để bạn kịp cảm nhận.`;
  }

  function barHTML() {
    if (!supported) return '<p class="fine voice-note">Trình duyệt này chưa hỗ trợ giọng đọc máy.</p>';
    return `
      <div class="voice-bar ${prefs.on ? 'on' : ''}" data-voice-bar>
        <button type="button" class="btn-voice" data-voice="toggle" aria-pressed="${prefs.on}">
          ${prefs.on ? '🔈 Tắt giọng đọc' : '🔊 Bật giọng đọc'}
        </button>
        ${prefs.on ? `
          <div class="chips voice-opts">
            <button type="button" class="chip ${prefs.gender === 'female' ? 'on' : ''}" aria-pressed="${prefs.gender === 'female'}" data-voice-g="female">👩 Giọng nữ${has('female') ? '' : ' <i>(mô phỏng)</i>'}</button>
            <button type="button" class="chip ${prefs.gender === 'male' ? 'on' : ''}" aria-pressed="${prefs.gender === 'male'}" data-voice-g="male">👨 Giọng nam${has('male') ? '' : ' <i>(mô phỏng)</i>'}</button>
            <button type="button" class="chip ${prefs.slow ? 'on' : ''}" aria-pressed="${prefs.slow}" data-voice="slow">🐢 Chậm hơn</button>
            <button type="button" class="chip" data-voice="repeat">🔁 Đọc lại</button>
            <button type="button" class="chip" data-voice="refresh">↻ Làm mới giọng</button>
          </div>` : ''}
        <p class="fine voice-note">${prefs.on || !viVoices.length ? statusNote() : 'Có thể bật giọng đọc dẫn dắt (dùng giọng máy sẵn có của thiết bị).'}</p>
      </div>`;
  }

  function redraw(root, focusToggle) {
    root.querySelectorAll('[data-voice-bar]').forEach(b => { b.outerHTML = barHTML(); });
    if (focusToggle) root.querySelector('[data-voice="toggle"]')?.focus();
  }

  /* Xử lý một cú bấm trong thanh giọng đọc. Trả về true nếu cú bấm thuộc về thanh này.
   * Màn hình gọi hàm này từ MỘT trình nghe duy nhất (do lifecycle quản lý) để tránh gắn chồng sự kiện. */
  function onBarClick(e, root, onChange) {
    const b = e.target.closest('[data-voice], [data-voice-g]');
    if (!b) return false;
    e.preventDefault();
    const replay = () => { if (onChange) onChange(); else if (lastSegs) run(lastSegs); };
    if (b.dataset.voiceG) { prefs.gender = b.dataset.voiceG; savePrefs(); redraw(root); replay(); return true; }
    const a = b.dataset.voice;
    if (a === 'toggle') {
      prefs.on = !prefs.on; savePrefs(); stop(); redraw(root, true);
      if (prefs.on) replay();
    } else if (a === 'slow') { prefs.slow = !prefs.slow; savePrefs(); redraw(root); replay(); }
    else if (a === 'repeat') replay();
    else if (a === 'refresh') { stop(); loadVoices(); redraw(root); }
    return true;
  }

  // Giọng của thiết bị nạp trễ → vẽ lại thanh khi có danh sách giọng. Trả về hàm hủy đăng ký.
  function watchVoices(root) {
    const refresh = () => { if (document.body.contains(root)) redraw(root); };
    listeners.push(refresh);
    return () => { const i = listeners.indexOf(refresh); if (i >= 0) listeners.splice(i, 1); };
  }

  return {
    supported, isOn: () => prefs.on && supported,
    say: segs => run(segs),            // đọc theo hàng đợi, có khoảng dừng
    cue: text => { if (prefs.on) run([{ t: text, pause: 0 }]); }, // nhắc ngắn (ví dụ "Hít vào")
    stop, barHTML, onBarClick, watchVoices
  };
})();
