/*
 * STOP-4P Healthcare Staff — cấu hình do ĐƠN VỊ TRIỂN KHAI chỉnh sửa.
 * Không đặt khóa bí mật (API key, token SMS…) trong file này: mọi thứ ở đây đều công khai với trình duyệt.
 */
window.STOP4P_CONFIG = {
  APP_NAME: 'STOP-4P Healthcare Staff',
  VERSION: '0.1.0-demo',

  // Ảnh capybara / cảm xúc lấy từ repo nhatkymebau. Nếu chép ảnh vào thư mục assets/ thì đổi thành 'assets/'.
  // Không tải được ảnh → tự dùng emoji thay thế.
  ASSET_BASE: 'https://raw.githubusercontent.com/ditruyenhungvuong/nhatkymebau/main/',

  // OTP: 'dev-mock' = mã giả lập hiển thị trên màn hình, dữ liệu chỉ lưu trên thiết bị này.
  // Production PHẢI thay bằng 'server' + endpoint thật (SMS provider gọi phía server). Không dùng OTP giả khi phát hành.
  OTP_MODE: 'dev-mock',
  OTP_ENDPOINTS: { request: '/api/auth/otp/request', verify: '/api/auth/otp/verify' },
  OTP_TTL_SEC: 300,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_SEC: 60,

  // AI gợi ý: để null → chỉ dùng bộ luật an toàn trong trình duyệt.
  // Nếu có API phía server (không lộ key), đặt ví dụ '/api/checkins/recommend'. Kết quả luôn được lọc lại bằng allowlist bài tập.
  AI_RECOMMEND_ENDPOINT: null,
  AI_TIMEOUT_MS: 8000,

  // Bản demo: nội dung bài tập chưa qua hội đồng chuyên môn phê duyệt → vẫn cho hiển thị nhưng có nhãn cảnh báo.
  ALLOW_DRAFT_CONTENT: true,

  // Kênh hỗ trợ của cơ sở — ĐƠN VỊ PHẢI XÁC NHẬN rồi mới điền. Không tự bịa số hotline.
  // Ví dụ: { name: 'Phòng Công tác xã hội', detail: 'Giờ hành chính, tầng …', phone: '' }
  SUPPORT_CHANNELS: [],

  // Danh mục khoa/phòng MẪU — cần Bệnh viện Hùng Vương cung cấp danh sách chính thức.
  DEPARTMENTS_HV: [
    'Khoa Khám bệnh', 'Khoa Sanh', 'Khoa Hậu sản', 'Khoa Sản bệnh', 'Khoa Hậu phẫu',
    'Khoa Gây mê hồi sức', 'Khoa Hồi sức tích cực', 'Khoa Sơ sinh', 'Khoa Phụ', 'Khoa Hiếm muộn',
    'Khoa Cấp cứu', 'Khoa Xét nghiệm', 'Khoa Chẩn đoán hình ảnh', 'Khoa Di truyền', 'Khoa Dược',
    'Phòng Điều dưỡng', 'Phòng Kế hoạch tổng hợp', 'Phòng Hành chính – Quản trị', 'Phòng ban khác'
  ]
};
