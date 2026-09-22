/*
 * Danh mục nội dung (thư viện hoạt động, cảm xúc, tình huống) và từ khóa cho bộ luật an toàn.
 * Nội dung chuyên môn cần chủ sở hữu, nguồn, ngày rà soát và phiên bản trước khi phát hành.
 */
window.STOP4P_DATA = (() => {
  const REVIEW = { version: '0.1-draft', owner: 'Nhóm STOP-4P', reviewedBy: 'Chờ hội đồng chuyên môn duyệt', reviewedAt: null, status: 'draft' };

  const EXERCISES = {
    STOP4P_FULL: {
      title: 'Hành trình STOP-4P', icon: '🗺️', min: 8, max: 10, type: 'journey',
      goal: 'Chuỗi 9 chặng: check-in → bầy khỉ → rồng thổi chong chóng → điểm đau → thư giãn → gọi tên cảm xúc → đám mây → kết nối bản thân → 3 lời biết ơn.',
      safety: 'Có thể bỏ qua bất kỳ chặng nào. Lời biết ơn không bắt buộc, nhất là khi đang buồn hay giận.'
    },
    STOP_PAUSE: {
      title: 'Dừng 5 giây', icon: '✋', min: 0.5, max: 1, type: 'steps',
      goal: 'Dừng lại, thả lỏng vai và hàm, rồi chọn bước tiếp theo.',
      safety: 'Chỉ thực hiện khi có thể dừng an toàn.'
    },
    BREATHE_46: {
      title: 'Thở 4 vào – 6 ra', icon: '🌬️', min: 2, max: 5, type: 'breath',
      goal: 'Thở ra dài hơn hít vào giúp cơ thể dịu lại.',
      safety: 'Nhịp chỉ là gợi ý, không gắng sức. Bạn luôn có thể chọn thở tự nhiên.'
    },
    BOX_4444: {
      title: 'Thở hộp 4–4–4–4', icon: '⬜', min: 1, max: 3, type: 'breath', holdsBreath: true,
      goal: 'Nhịp đều giúp tập trung lại trước nhiệm vụ.',
      safety: 'Có nín thở. Chỉ chọn nếu thoải mái; không thực hành khi chóng mặt, khó thở.'
    },
    BREATHE_478: {
      title: 'Thở 4–7–8', icon: '🌙', min: 2, max: 4, type: 'breath', holdsBreath: true,
      goal: 'Nhịp thở chậm, có thể dùng lúc thư giãn trước khi nghỉ.',
      safety: 'Có nín thở; tùy chọn và không phải là cách điều trị mất ngủ. Có thể bỏ qua bất cứ lúc nào.'
    },
    HUM: {
      title: 'Ngân nga HUM', icon: '🎵', min: 1, max: 3, type: 'breath',
      goal: 'Ngân khẽ "hừmmm" theo hơi thở ra để làm chậm nhịp thở.',
      safety: 'Chỉ nên làm ở nơi riêng tư, không ảnh hưởng giao tiếp hay chăm sóc người bệnh.'
    },
    GROUND_54321: {
      title: 'Grounding 5-4-3-2-1', icon: '🌿', min: 2, max: 5, type: 'grounding',
      goal: 'Đưa sự chú ý trở về hiện tại qua các giác quan.',
      safety: 'Không cần tìm mùi/vị bằng mọi giá; có thể thay bằng nhận biết một cảm giác trong cơ thể.'
    },
    PMR_SHORT: {
      title: 'Thư giãn cơ tiến triển (ngắn)', icon: '💆', min: 5, max: 8, type: 'pmr',
      goal: 'Lần lượt siết nhẹ rồi thả lỏng từng nhóm cơ.',
      safety: 'Bỏ qua vùng đau hoặc chấn thương; có thể chỉ thả lỏng thay cho gồng.'
    },
    JOURNAL: {
      title: 'Nhật ký ngắn', icon: '📝', min: 3, max: 7, type: 'journal',
      goal: 'Chuyện gì đã xảy ra – mình cảm thấy gì – mình cần gì.',
      safety: 'Không ghi tên, số hồ sơ hay chi tiết nhận diện người bệnh/đồng nghiệp. Chế độ ẩn danh không lưu.'
    },
    GRATITUDE_3: {
      title: 'Ba điều biết ơn', icon: '🌱', min: 2, max: 3, type: 'gratitude',
      goal: 'Nhận ra ba điều nhỏ đã nâng đỡ mình, nếu thấy phù hợp.',
      safety: 'Luôn có thể bỏ qua. Không cần phải tích cực.'
    },
    AUDIO_CALM: {
      title: 'Âm thanh thư giãn', icon: '🎧', min: 5, max: 15, type: 'audio',
      goal: 'Âm nền dịu đều, không lời, để nghỉ ngơi.',
      safety: 'Không dùng khi đang làm nhiệm vụ cần nghe tín hiệu hay cảnh báo.'
    },
    MICRO_RECOVERY: {
      title: 'Nghỉ ngắn phục hồi', icon: '☕', min: 1, max: 10, type: 'recovery',
      goal: 'Nghỉ thật: nước, ăn nhẹ, vận động nhẹ, liên hệ hỗ trợ khi cần.',
      safety: 'Bài tập không thay thế cho giấc ngủ. Nếu mệt ảnh hưởng an toàn người bệnh, hãy báo người phụ trách.'
    }
  };
  Object.keys(EXERCISES).forEach(id => Object.assign(EXERCISES[id], { id }, REVIEW));

  // Ảnh từ repo nhatkymebau; emoji dùng khi không tải được ảnh.
  const EMOTIONS = [
    { code: 'worried', label: 'Lo lắng', img: 'hoang_hot.jpg', emoji: '😟' },
    { code: 'sad', label: 'Buồn', img: 'buon.jpg', emoji: '😢' },
    { code: 'irritated', label: 'Bực bội', img: 'tuc.jpg', emoji: '😠' },
    { code: 'tired', label: 'Mệt mỏi', img: 'kho_chiu.jpg', emoji: '😩' },
    { code: 'empty', label: 'Trống rỗng', img: null, emoji: '😶' },
    { code: 'calm', label: 'Bình ổn', img: 'vui.jpg', emoji: '🙂' },
    { code: 'other', label: 'Khác', img: null, emoji: '💭' }
  ];

  const CONTEXTS = [
    { code: 'sleep', label: 'Khó ngủ' },
    { code: 'before_difficult_task', label: 'Trước tình huống khó' },
    { code: 'after_shift', label: 'Sau trực' },
    { code: 'conflict', label: 'Xung đột' },
    { code: 'severe_case', label: 'Sau ca bệnh nặng' },
    { code: 'work_family', label: 'Công việc / gia đình' },
    { code: 'other', label: 'Khác' }
  ];

  const MINUTES = [1, 3, 5, 10, 15];

  // Mức khó chịu 0–10 → ảnh capybara (0 = dễ chịu nhất → level 10).
  const DISTRESS_LABELS = [
    'Rất dễ chịu', 'Dễ chịu', 'Khá ổn', 'Hơi căng', 'Hơi khó chịu', 'Khó chịu vừa',
    'Khá khó chịu', 'Khó chịu nhiều', 'Rất khó chịu', 'Cực kỳ khó chịu', 'Khó chịu nhất'
  ];

  // Từ khóa minh họa cho bộ luật. Mọi bộ lọc đều có thể sai: luôn cho người dùng sửa/từ chối.
  // "strict" so khớp có dấu (vì "tự tử" bỏ dấu trùng "từ từ"); "loose" so khớp sau khi bỏ dấu.
  const KEYWORDS = {
    urgent: {
      strict: ['tự tử', 'tự sát', 'muốn chết', 'không muốn sống', 'kết thúc cuộc đời', 'kết liễu', 'tự hại', 'tự làm hại', 'làm hại bản thân',
        'rạch tay', 'cắt tay', 'nhảy lầu', 'chết cho xong', 'không còn lý do để sống', 'biến mất mãi mãi', 'làm hại người khác', 'uống thuốc để chết'],
      loose: ['tu sat', 'muon chet', 'khong muon song', 'ket thuc cuoc doi', 'tu hai', 'lam hai ban than', 'rach tay', 'nhay lau', 'chet cho xong', 'khong con ly do de song']
    },
    human: ['kiet suc', 'suy sup', 'mat hung thu', 'khong chiu noi', 'khong thiet', 'tuyet vong', 'vo vong', 'keo dai', 'nhieu tuan', 'may tuan', 'hang thang',
      'bao hanh', 'bi danh', 'quay roi', 'de doa', 'khong ai hieu', 'mot minh qua', 'bat luc'],
    fatigue: ['buon ngu', 'ngu gat', 'thieu ngu', 'truc dem', 'truc 24', 'thuc trang', 'diu mat', 'lo mo', 'kiet suc', 'khong tinh tao', 'mat tap trung'],
    sleep: ['kho ngu', 'mat ngu', 'tran troc', 'khong ngu duoc', 'nam mai khong ngu', 'thuc giac'],
    task: ['ca mo', 'vao mo', 'phong mo', 'mo lay thai', 'phau thuat', 'tu van', 'bao tin xau', 'thuyet trinh', 'bao cao', 'trinh benh', 'hoi chan',
      'thu thuat', 'do sanh', 'do de', 'sanh kho', 'ca kho', 'phong van', 'di thi', 'kiem tra tay nghe'],
    conflict: ['cai nhau', 'cai lai', 'xung dot', 'bi mang', 'mang chui', 'bi la', 'khieu nai', 'nguoi nha', 'to tieng', 'bat cong', 'uc che', 'buc minh'],
    severe: ['tu vong', 'mat be', 'mat con', 'ca nang', 'bien chung', 'loi cua minh', 'tu trach', 'day dut', 'bang huyet', 'khong cuu duoc', 'sai sot', 'ay nay'],
    physical: ['chong mat', 'kho tho', 'tuc nguc', 'dau nguc', 'hoi hop', 'tim dap nhanh', 'ngat xiu', 'choang vang']
  };

  return { EXERCISES, EMOTIONS, CONTEXTS, MINUTES, DISTRESS_LABELS, KEYWORDS };
})();
