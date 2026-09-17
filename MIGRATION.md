# Chuyển từ V1 sang V2

V1 và V2 dùng mô hình dữ liệu khác nhau. Không chạy lệnh xóa bảng V1.

Quy trình an toàn:

1. Mở V1, dùng **Export data → toàn bộ dữ liệu** và lưu file backup.
2. Cài `V2/schema.sql` trên project Supabase thử nghiệm trước.
3. Kiểm thử V2 bằng chế độ demo, sau đó bằng một tài khoản thử.
4. Chỉ chuyển dữ liệu thật sau khi xác nhận cách hiểu các trường ngày cũ:
   - `flow_sub_tasks.dueDate` cũ được giữ làm deadline và dùng để suy ra `planned_week`.
   - `flow_check_items.dueDate` cũ được giữ làm deadline, đồng thời sao chép sang `planned_date` với `planned_period = anytime`.
   - `flow_check_items.done` được đổi thành trạng thái `done` hoặc `todo`.
5. Đối chiếu số KPI, Sub-task, Task, lịch cá nhân và bảng lương giữa hai phiên bản.
6. Giữ V1 và bản backup ít nhất một tháng sau khi chuyển sang V2.

Không import trực tiếp JSON/SQL của V1 vào các bảng V2 vì tên bảng, kiểu ID và ý nghĩa trường ngày đã thay đổi. Script chuyển dữ liệu thật nên được tạo sau khi có bản export gần nhất để có thể kiểm tra chính xác trước khi chạy.
