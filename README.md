# Flow KPI V2

V2 được xây mới theo kiến trúc module, giữ V1 nguyên trạng trong thư mục `../V1`.

## Cài đặt

1. Mở lại project Supabase đang dùng cho V1.
2. Chạy toàn bộ `schema.sql` trong SQL Editor. Khi Supabase hỏi, chọn **Run without RLS** vì file đã tự bật và cấu hình RLS.
3. Giữ nguyên các user hiện có trong Authentication; không cần tạo tài khoản lại.
4. `config.js` của V2 dùng cùng Project URL và publishable key với V1.
5. Phục vụ thư mục V2 bằng web server hoặc đưa toàn bộ thư mục lên GitHub Pages.

Các bảng V2 đều có tiền tố `flow_v2_`, vì vậy có thể nằm chung project với các bảng `flow_*` của V1 mà không ghi đè dữ liệu cũ.

Không dùng service-role key trong trình duyệt.

## Module

- Dashboard
- KPI → Sub-task → Task
- Kế hoạch tháng theo tuần
- Kế hoạch tuần theo ngày/buổi
- Lịch tháng, note ngày, nghỉ phép/công tác
- Việc gấp
- Bảng lương
- Báo cáo tháng và năm

App có chế độ demo độc lập để kiểm thử giao diện mà không cần Supabase.

Xem `MIGRATION.md` trước khi chuyển dữ liệu V1. Không xóa database cũ trong giai đoạn kiểm thử.
