# Flow KPI V3

V3 là ứng dụng độc lập theo `KPI_Management_App_Codex_Spec.md`. V1/V2 không được ứng dụng V3 import hay phụ thuộc.

## Cài Supabase

1. Backup dữ liệu cũ nếu còn cần.
2. Mở SQL Editor của Supabase project hiện tại.
3. Chạy toàn bộ `schema.sql`. Script này **xóa các bảng ứng dụng V1/V2**, nhưng giữ nguyên Authentication users.
4. Giữ `config.js` với Project URL và publishable/anon key. Không dùng service-role key ở trình duyệt.
5. Phục vụ thư mục V3 qua web server hoặc GitHub Pages.

## Chạy local

```sh
python3 -m http.server 8080 --directory V3
```

Mở `http://localhost:8080`. Có thể dùng “Xem bản demo” mà không cần Supabase.

## Dữ liệu

Các bảng mới có tiền tố `flow_v3_`. Calendar chỉ đọc từ `flow_v3_tasks.date/start_time/end_time`; không có bảng CalendarTask riêng.
