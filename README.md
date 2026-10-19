# STOP-4P Healthcare Staff — DỪNG 5

Web app mobile-first (HTML/CSS/JS thuần, không cần build) dành cho nhân viên y tế, xây dựng theo đặc tả
*DUNG5_Dac_ta_ung_dung_cho_lap_trinh_v1* và kế thừa cơ chế trò chơi của repo
[`ditruyenhungvuong/nhatkymebau`](https://github.com/ditruyenhungvuong/nhatkymebau) (bầy khỉ + chuông, rồng thổi chong chóng,
bản đồ điểm đau, thư giãn, capybara gọi tên cảm xúc, đám mây, hũ bình an), đã chuyển sang bối cảnh nhân viên y tế.

> Bản demo, **không phải** công cụ chẩn đoán hay điều trị. Nội dung bài tập chưa được hội đồng chuyên môn phê duyệt.

## Chạy thử

- **Windows, không cần cài gì:** `powershell -ExecutionPolicy Bypass -File tools\serve.ps1` rồi mở http://localhost:8765
- Hoặc đưa cả thư mục lên GitHub Pages / bất kỳ web server tĩnh nào.
- Mở trực tiếp `index.html` bằng file:// cũng chạy được trên hầu hết trình duyệt.

## Có gì trong bản này

| Đặc tả | Đã làm |
|---|---|
| S01 Chào mừng | Hai lựa chọn ngang cấp: ẩn danh / số điện thoại; liên kết thư viện, quyền riêng tư, hỗ trợ |
| S02 OTP | Chuẩn hóa +84, che số, OTP hết hạn 5 phút, tối đa 5 lần nhập, gửi lại sau 60 giây, không cho biết số đã có tài khoản chưa. **Chế độ `dev-mock`**: mã hiện trên màn hình |
| S03 Hồ sơ | Hùng Vương / Khác (bắt buộc chọn một); khoa/phòng tùy chọn, "Không muốn cung cấp", xóa được; không gửi cho AI |
| S04 DỪNG 5 | Vòng tròn 5 giây, nút Bỏ qua, tôn trọng `prefers-reduced-motion` |
| S05 Check-in | Nhiều cảm xúc (ảnh capybara), thang 0–10, văn bản tự do ≤ 2.000 ký tự, tình huống, thời gian, "đang làm việc cần tập trung", **cảnh báo thông tin nhận diện** (SĐT, dãy số dài, số giường, mã bệnh án, danh xưng + tên) |
| S06 Gợi ý | Kiểm tra an toàn bằng luật trước; tối đa 2 bài trong danh mục; sửa nhãn; đổi gợi ý; "Tôi cần người hỗ trợ" |
| S07 Trình phát | 12 hoạt động của mục 4 — thở 4-6 / hộp / 4-7-8 (có cổng xác nhận nín thở), HUM, grounding 5-4-3-2-1, PMR, nhật ký, biết ơn, âm thanh (tự tạo bằng WebAudio, không tự phát), nghỉ ngắn phục hồi; nút "Trở về thở tự nhiên" |
| **4 trạm – 1 phút bình an** | Module thả lỏng thân – tâm 8–10 phút: khởi động (tự chấm căng thẳng 0–10) → 4 trạm **hơi thở → vai gáy → mặt và hàm → tâm trí**, mỗi trạm đi qua 4 nhịp **Nhận biết → Trải nghiệm → Buông lỏng → Cảm nhận** có hẹn giờ nhẹ (90 giây, riêng trạm tâm trí 2 phút), tạm dừng / "Tiếp" / bỏ qua trạm; người chơi tự bấm "Tôi đã…" để mở khóa trạm, đếm 0/4. Kết thúc: chấm lại 0–10, chọn vùng thả lỏng rõ nhất, ghi chú tùy chọn và thông điệp kết thúc |
| **Hành trình STOP-4P** | Trò chơi 9 chặng: check-in → STOP bầy khỉ (giữ chuông 3 giây) → rồng thổi chong chóng (giữ = hít vào, thả = thở ra) → điểm đau (hình NVYT mặc scrubs) → thư giãn từng vùng → gọi tên cảm xúc → thả mây → hũ bình an → 3 lời biết ơn (cây ra lá). Chặng nào cũng bỏ qua được, nhảy tự do trên bản đồ; không điểm số, không streak |
| **Giọng đọc người quản trò** | Giọng máy của thiết bị (Web Speech API) đọc lời dẫn cho **mọi bài tập và cả hai trò chơi**: nút bật/tắt, chọn **giọng nữ / giọng nam**, chế độ "chậm hơn", nút "Đọc lại". Mặc định tắt; chỉ phát sau khi người dùng bấm; tự dừng khi đổi màn hình hoặc mở "Trở về thở tự nhiên". Lời dẫn chia thành từng câu với **khoảng dừng 5–10 giây** để người nghe kịp cảm nhận |
| S08 Check-out | Thang 0–10 (có "không muốn trả lời"), Phù hợp / Không phù hợp / Khó chịu hơn / Chưa chắc; "khó chịu hơn" → dừng, thở tự nhiên, tìm hỗ trợ |
| S09 Hành trình | Chỉ member: dòng thời gian, biểu đồ trước/sau, bài hữu ích, xóa từng mục (bấm 2 lần), xuất JSON/CSV, xóa toàn bộ, xóa tài khoản |
| S10 Hỗ trợ | Truy cập từ mọi màn hình; 115; người tin cậy; kênh của cơ sở (cấu hình); mệt mỏi ảnh hưởng người bệnh |
| Guest → member | Chỉ lưu phiên vừa làm khi người dùng chọn "Có" (mặc định Không) |

### Bộ luật an toàn (`js/engine.js`)
- Ý nghĩ tự hại / nguy hiểm → trang hỗ trợ khẩn **trước**, không chỉ đưa bài thở. Vì tiếng Việt hay nói cường điệu ("mệt muốn chết"), trang này có nút "Tôi đang an toàn — tiếp tục", sau đó vẫn hiện thẻ hỗ trợ con người.
- Thiếu ngủ / sau trực + mệt → `MICRO_RECOVERY`, nhắc báo người phụ trách; không bao giờ gợi ý "thở cho tỉnh để trực tiếp".
- Đang làm nhiệm vụ cần tập trung → chỉ `STOP_PAUSE`.
- Chóng mặt, khó thở, đau ngực hoặc mức khó chịu ≥ 7 → loại bài có nín thở, khuyên kiểm tra sức khỏe.
- Ca nặng / tự trách, trống rỗng, kiệt sức kéo dài → luôn hiện thẻ hỗ trợ con người.

## Quyền riêng tư trong bản demo
- **Ẩn danh:** không ghi check-in, nhật ký hay bất kỳ nội dung nào vào localStorage, cookie hay máy chủ; đóng/tải lại trang là mất. Ngoại lệ duy nhất là tùy chọn giọng đọc (`stop4p_voice`: bật/tắt, nữ/nam, tốc độ) — thiết lập hiển thị, không phải dữ liệu sức khỏe.
- **Giọng đọc:** chạy hoàn toàn trong trình duyệt bằng giọng có sẵn của thiết bị, không gọi dịch vụ ngoài, không đọc nội dung người dùng tự viết. Nếu máy chưa cài giọng tiếng Việt, app báo rõ và hướng dẫn cách cài; lúc đó giọng mặc định sẽ phát âm sai.

### Giọng tiếng Việt trên từng nền tảng
App tự dò giọng `vi-*` của thiết bị, ưu tiên giọng "Natural/Neural", và ghi rõ đang dùng giọng nào.

| Nền tảng | Giọng tiếng Việt thường có | Kết quả trong app |
|---|---|---|
| Windows + Chrome | `Microsoft An` (nam, cài qua Cài đặt › Giọng nói) | Giọng nam thật; giọng nữ là **mô phỏng** (dùng An, nâng cao độ) |
| Microsoft Edge | `Microsoft HoaiMy` (nữ) và `NamMinh` (nam), giọng tự nhiên | Có đủ hai giọng thật — nên dùng Edge nếu cần giọng nữ |
| Android | `vi-vn-x-vif` (nữ), `vi-vn-x-vim` (nam) | Đủ hai giọng thật |
| iPhone/iPad | `Linh` (nữ) | Giọng nữ thật; giọng nam mô phỏng |

Lưu ý: trình duyệt chỉ nạp danh sách giọng **lúc khởi động**. Vừa cài giọng xong thì phải đóng hẳn trình duyệt rồi mở lại, sau đó bấm "↻ Làm mới giọng" trong app.
- **Member (demo):** dữ liệu nằm trong localStorage **của thiết bị này**, khóa bằng SHA-256 (có salt) của số điện thoại; không lưu số nguyên văn. Lưu hành trình, lưu nội dung tự viết và đồng ý nghiên cứu là ba đồng ý riêng (hai mục sau mặc định tắt).
- Không có trang quản trị, không thống kê theo khoa, không xếp hạng.

## Cấu hình — `js/config.js`
- `SUPPORT_CHANNELS`: kênh hỗ trợ của bệnh viện — **chỉ điền sau khi đơn vị xác nhận**; hiện để trống.
- `DEPARTMENTS_HV`: danh mục khoa/phòng **mẫu**, cần danh sách chính thức.
- `ASSET_BASE`: ảnh capybara đang lấy trực tiếp từ repo nhatkymebau trên GitHub; muốn chạy offline thì chép ảnh vào `assets/` và đổi thành `'assets/'`. Không tải được ảnh thì app tự hiện emoji.
- `OTP_MODE`, `OTP_ENDPOINTS`, `AI_RECOMMEND_ENDPOINT`: đã có adapter sẵn để nối máy chủ.

## Chưa làm / cần làm trước khi dùng thật
1. Backend (đặc tả mục 8–10): OTP qua SMS thật, phiên bằng cookie HttpOnly, PostgreSQL, mã hóa, API `/api/me/*`. **Chưa làm thì không được dùng OTP giả khi phát hành.**
2. AI phía server (nếu dùng): prompt JSON, allowlist, retention của nhà cung cấp. App đã lọc lại kết quả AI bằng danh mục và không để AI hạ mức hỗ trợ.
3. Hội đồng chuyên môn duyệt nội dung (đổi `status` thành `approved`, đặt `ALLOW_DRAFT_CONTENT: false`) và rà lại danh sách từ khóa an toàn.
4. S11 (biên tập nội dung, số liệu tổng hợp có ngưỡng ≥ 10) — thuộc P2, cần backend.
5. Các quyết định ở mục 15 của đặc tả.

## Cấu trúc
```
index.html · styles.css
js/config.js   cấu hình của đơn vị triển khai
js/data.js     danh mục bài tập, cảm xúc, tình huống, từ khóa
js/engine.js   an toàn + gợi ý + phát hiện thông tin nhận diện + adapter AI
js/store.js    lưu trữ member (demo, localStorage)
js/voice.js    giọng đọc người quản trò (Web Speech API, nữ/nam, khoảng dừng)
js/players.js  trình phát bài tập + trò chơi STOP-4P
js/app.js      điều hướng và các màn hình S01–S10
tools/serve.ps1  web server tĩnh cho Windows
```
