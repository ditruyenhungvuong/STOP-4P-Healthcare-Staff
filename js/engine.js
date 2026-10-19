/*
 * Bộ luật gợi ý + kiểm tra an toàn + phát hiện thông tin nhạy cảm.
 * Nguyên tắc (đặc tả mục 5–6): kiểm tra an toàn bằng luật TRƯỚC; chỉ gợi ý ID trong danh mục; tối đa 2 bài;
 * không chẩn đoán; risk "none_detected" không có nghĩa là đã chứng minh an toàn.
 */
window.STOP4P_ENGINE = (() => {
  const { EXERCISES, KEYWORDS, EMOTIONS, CONTEXTS } = window.STOP4P_DATA;
  const C = window.STOP4P_CONFIG;

  const stripMarks = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const tokens = s => ' ' + s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';

  function hasAny(text, list, loose = true) {
    const t = tokens(loose ? stripMarks(text) : String(text || '').toLowerCase().normalize('NFC'));
    return list.some(k => t.includes(' ' + (loose ? stripMarks(k) : k.normalize('NFC')) + ' '));
  }

  /* ---------- Thông tin nhạy cảm (không thể phát hiện hết) ---------- */
  const PII_PATTERNS = [
    { re: /(?:\+?84|\b0)(?:[\s.-]?\d){9,10}\b/g, why: 'số điện thoại' },
    { re: /\b\d{6,}\b/g, why: 'dãy số dài (mã hồ sơ, CCCD…)' },
    { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, why: 'email' },
    { re: /\b(?:giường|phòng|buồng)\s*(?:số\s*)?\d+[a-z]?\b/giu, why: 'số giường/phòng' },
    { re: /(?:mã\s*(?:bệnh án|hồ sơ|bn)|pid|số nhập viện)[:\s#]*\S+/giu, why: 'mã hồ sơ' }
  ];
  const TITLES = new Set(['bn', 'bệnh nhân', 'sản phụ', 'người bệnh', 'bé', 'chị', 'anh', 'cô', 'chú', 'bác', 'bs', 'bác sĩ', 'đd', 'điều dưỡng',
    'hộ sinh', 'ông', 'bà', 'em', 'mẹ', 'người nhà', 'bạn', 'trưởng khoa', 'sếp']);
  // Danh xưng + Từ Viết Hoa → có thể là tên người
  const NAME_RE = /((?:\p{L}+\s+)?\p{L}+)\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)*)/gu;

  function detectPII(text) {
    const hits = [];
    if (!text) return hits;
    for (const p of PII_PATTERNS) {
      for (const m of String(text).matchAll(p.re)) hits.push({ text: m[0].trim(), why: p.why });
    }
    for (const m of String(text).matchAll(NAME_RE)) {
      const words = m[1].toLowerCase().split(/\s+/);
      const title = TITLES.has(words.join(' ')) ? words.join(' ') : TITLES.has(words[words.length - 1]) ? words[words.length - 1] : null;
      if (title) hits.push({ text: m[0].slice(m[0].toLowerCase().lastIndexOf(title)).trim(), why: 'có thể là tên người' });
    }
    const seen = new Set();
    return hits.filter(h => (seen.has(h.text) ? false : seen.add(h.text)));
  }

  /* ---------- Kiểm tra an toàn (luồng vận hành, không phải sàng lọc) ---------- */
  function safetyCheck(input) {
    const text = input.narrative || '';
    const urgent = hasAny(text, KEYWORDS.urgent.strict, false) || hasAny(text, KEYWORDS.urgent.loose, true);
    const human = hasAny(text, KEYWORDS.human) || (input.distress ?? 0) >= 9 || (input.emotions || []).includes('empty') && (input.distress ?? 0) >= 7;
    const physical = hasAny(text, KEYWORDS.physical);
    return {
      support_mode: urgent ? 'urgent_or_uncertain' : human ? 'needs_human_support' : 'routine',
      physical_symptoms: physical
    };
  }

  /* ---------- Suy luận nhãn tình huống từ văn bản (người dùng có thể sửa) ---------- */
  function inferContexts(input) {
    const set = new Set(input.contexts || []);
    if (input.labelsEdited) return [...set]; // người dùng đã tự sửa nhãn → tôn trọng lựa chọn đó
    const t = input.narrative || '';
    if (hasAny(t, KEYWORDS.sleep)) set.add('sleep');
    if (hasAny(t, KEYWORDS.task)) set.add('before_difficult_task');
    if (hasAny(t, KEYWORDS.fatigue)) set.add('after_shift');
    if (hasAny(t, KEYWORDS.conflict)) set.add('conflict');
    if (hasAny(t, KEYWORDS.severe)) set.add('severe_case');
    return [...set];
  }

  const fits = (id, minutes) => !minutes || EXERCISES[id].min <= minutes;

  /* ---------- Gợi ý theo luật (bảng mục 5 của đặc tả) ---------- */
  function recommend(input, attempt = 0) {
    const safety = safetyCheck(input);
    const contexts = inferContexts(input);
    const emo = new Set(input.emotions || []);
    const text = input.narrative || '';
    const minutes = input.minutes || null;
    const d = input.distress ?? null;
    const fatigueRisk = (!input.labelsEdited && hasAny(text, KEYWORDS.fatigue)) || (contexts.includes('after_shift') && emo.has('tired'));
    const avoidHold = safety.physical_symptoms || (d !== null && d >= 7);

    let need, reasonMap, candidates, summary, notes = [];

    if (input.focusTask) {
      need = 'Ưu tiên an toàn khi đang làm việc cần tập trung';
      candidates = ['STOP_PAUSE'];
      summary = 'Bạn đang ở giữa một nhiệm vụ cần tập trung. Lúc này chỉ nên dừng thật ngắn nếu an toàn; các bài dài hơn để dành cho lúc nghỉ.';
      notes.push('Nếu mệt mỏi hay cảm xúc đang ảnh hưởng đến an toàn người bệnh: tạm ngừng khi có thể, báo người phụ trách và làm theo quy trình an toàn của đơn vị.');
    } else if (fatigueRisk) {
      need = 'Phục hồi và an toàn người bệnh';
      candidates = ['MICRO_RECOVERY', 'STOP_PAUSE'];
      summary = 'Có vẻ bạn đang rất mệt sau một thời gian làm việc dài. Điều cơ thể cần có thể là nghỉ thật sự, không phải cố gắng thêm.';
      notes.push('Bài thở không dùng để "cho tỉnh để trực tiếp". Nếu buồn ngủ ảnh hưởng an toàn, hãy báo người phụ trách khi có thể.');
    } else if (contexts.includes('severe_case')) {
      need = 'Kết nối và tự trắc ẩn';
      candidates = ['JOURNAL', 'GROUND_54321', 'BREATHE_46'];
      summary = 'Những ca bệnh nặng có thể để lại nhiều day dứt. Cảm xúc của bạn là phản ứng dễ hiểu của một người quan tâm.';
      notes.push('Ứng dụng không đánh giá ca bệnh hay kết luận ai có lỗi. Trò chuyện với đồng nghiệp tin cậy hoặc kênh hỗ trợ có thể giúp ích.');
      safety.ask_human = true;
    } else if (contexts.includes('sleep')) {
      need = 'Chuẩn bị cho giấc nghỉ';
      candidates = ['PMR_SHORT', 'RELAX_4STATIONS', 'JOURNAL', 'AUDIO_CALM', 'BREATHE_46'];
      summary = 'Đầu óc còn "chạy" sau ca làm việc khiến việc ngủ khó hơn. Mình thử giúp cơ thể và suy nghĩ chậm lại nhé.';
      notes.push('Các bài tập không phải là cách điều trị mất ngủ. Nếu khó ngủ kéo dài, hãy tìm hỗ trợ chuyên môn.');
    } else if (contexts.includes('before_difficult_task')) {
      need = 'Ổn định ngắn trước nhiệm vụ';
      candidates = ['STOP_PAUSE', 'BREATHE_46', 'BOX_4444'];
      summary = 'Bạn đang chuẩn bị cho một tình huống nhiều áp lực. Một khoảng dừng ngắn có thể giúp bạn vào việc vững vàng hơn.';
    } else if (contexts.includes('conflict') || emo.has('irritated')) {
      need = 'Nhận diện và trì hoãn phản ứng bốc đồng';
      candidates = ['STOP_PAUSE', 'GROUND_54321', 'JOURNAL'];
      summary = 'Sau một va chạm, cảm giác bực bội là điều tự nhiên. Tạo một khoảng cách nhỏ trước khi phản hồi có thể giúp bạn chọn điều mình thật sự muốn.';
    } else if (emo.has('empty') || safety.support_mode === 'needs_human_support') {
      need = 'Nghỉ ngơi và kết nối với người hỗ trợ';
      candidates = ['MICRO_RECOVERY', 'JOURNAL'];
      summary = 'Cảm giác trống rỗng hoặc kiệt quệ kéo dài đáng được lắng nghe nghiêm túc — bạn không cần tự mình vượt qua.';
      safety.ask_human = true;
    } else if (emo.has('tired') && (emo.has('worried') || emo.has('irritated'))) {
      need = 'Giảm căng thẳng khi mệt';
      candidates = ['BREATHE_46', 'RELAX_4STATIONS', 'PMR_SHORT', 'MICRO_RECOVERY'];
      summary = 'Bạn vừa mệt vừa căng. Một bài dịu nhẹ có thể giúp, nhưng nghỉ thật sự khi có thể vẫn quan trọng nhất.';
    } else {
      need = 'Dành một chút thời gian cho mình';
      candidates = minutes && minutes >= 8 ? ['STOP4P_FULL', 'RELAX_4STATIONS', 'BREATHE_46', 'GROUND_54321'] : ['BREATHE_46', 'GROUND_54321', 'STOP_PAUSE', 'GRATITUDE_3'];
      summary = emo.has('calm') ? 'Bạn đang khá bình ổn — một khoảnh khắc chăm sóc mình để giữ nhịp.' : 'Cảm ơn bạn đã dừng lại lắng nghe bản thân.';
    }

    if (avoidHold) candidates = candidates.filter(id => !EXERCISES[id].holdsBreath);
    if (safety.physical_symptoms) notes.push('Nếu có chóng mặt, khó thở, đau ngực hay triệu chứng bất thường, hãy ưu tiên kiểm tra sức khỏe và tìm hỗ trợ y tế.');

    // Lọc theo thời gian, xoay vòng khi người dùng bấm "đổi gợi ý"
    let pool = candidates.filter(id => fits(id, minutes));
    if (!pool.length) pool = ['STOP_PAUSE'];
    const extras = ['BREATHE_46', 'GROUND_54321', 'STOP_PAUSE', 'HUM', 'MICRO_RECOVERY', 'PMR_SHORT', 'RELAX_4STATIONS', 'STOP4P_FULL']
      .filter(id => !pool.includes(id) && fits(id, minutes) && !(avoidHold && EXERCISES[id].holdsBreath) && !(input.focusTask && id !== 'STOP_PAUSE'));
    const full = [...pool, ...extras];
    const start = (attempt * 2) % Math.max(full.length, 1);
    const ids = [full[start], full[(start + 1) % full.length]].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 2);

    return {
      support_mode: safety.support_mode,
      ask_human_support: !!safety.ask_human || safety.support_mode !== 'routine',
      summary, need, notes,
      interpreted_emotions: [...emo],
      interpreted_contexts: contexts,
      suggestions: validate(ids.map(id => ({ exercise_id: id, reason: reasonFor(id, need) }))),
      source: 'rules',
      rules_version: '0.1'
    };
  }

  function reasonFor(id, need) {
    const r = {
      STOP_PAUSE: 'Dừng ngắn, thả lỏng vai và hàm', BREATHE_46: 'Thở ra dài giúp dịu lại khi có thể nghỉ an toàn',
      BOX_4444: 'Nhịp đều giúp tập trung (có nín thở — tùy chọn)', BREATHE_478: 'Thở chậm trước khi nghỉ (tùy chọn)',
      HUM: 'Ngân khẽ khi ở nơi riêng tư', GROUND_54321: 'Trở về hiện tại qua giác quan', PMR_SHORT: 'Thả lỏng cơ thể sau ca dài',
      JOURNAL: 'Viết ra để thấy rõ mình cần gì', GRATITUDE_3: 'Nhận ra điều nhỏ nâng đỡ mình', AUDIO_CALM: 'Âm nền dịu để nghỉ',
      MICRO_RECOVERY: 'Nghỉ thật: nước, ăn nhẹ, vận động, hỗ trợ', STOP4P_FULL: 'Hành trình đầy đủ khi bạn có 8–10 phút',
      RELAX_4STATIONS: 'Thả lỏng lần lượt hơi thở, vai gáy, mặt – hàm và tâm trí'
    };
    return r[id] || need;
  }

  // Chỉ giữ ID có trong danh mục và (nếu không cho phép bản nháp) đã được duyệt. Tối đa 2.
  function validate(list) {
    return (list || []).filter(s => s && EXERCISES[s.exercise_id] && (C.ALLOW_DRAFT_CONTENT || EXERCISES[s.exercise_id].status === 'approved')).slice(0, 2);
  }

  /* ---------- Adapter AI phía server (tùy chọn) ---------- */
  async function recommendWithAI(input) {
    const local = recommend(input);
    if (!C.AI_RECOMMEND_ENDPOINT || local.support_mode === 'urgent_or_uncertain') return local;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), C.AI_TIMEOUT_MS);
      const res = await fetch(C.AI_RECOMMEND_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', signal: ctrl.signal,
        body: JSON.stringify({
          emotion_codes: input.emotions, distress_0_10: input.distress, narrative: input.narrative,
          context_codes: input.contexts, available_minutes: input.minutes, currently_safety_critical_task: !!input.focusTask
        })
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('http');
      const ai = await res.json();
      const suggestions = validate(ai.suggestions);
      if (!suggestions.length) return { ...local, ai_note: 'AI không trả về gợi ý hợp lệ; đang dùng gợi ý theo luật.' };
      // Luật an toàn cục bộ luôn được ưu tiên: không hạ mức hỗ trợ mà luật đã nâng.
      return {
        ...local, source: 'ai', summary: String(ai.summary || local.summary).slice(0, 300), suggestions,
        support_mode: ai.support_mode === 'urgent_or_uncertain' ? ai.support_mode : local.support_mode,
        ask_human_support: local.ask_human_support || !!ai.ask_human_support
      };
    } catch (e) {
      return { ...local, ai_note: 'Phần AI hiện không khả dụng; đang dùng gợi ý theo luật an toàn.' };
    }
  }

  const labelOf = (list, code) => (list.find(x => x.code === code) || {}).label || code;

  return {
    detectPII, safetyCheck, recommend, recommendWithAI, stripMarks,
    emotionLabel: c => labelOf(EMOTIONS, c), contextLabel: c => labelOf(CONTEXTS, c)
  };
})();
