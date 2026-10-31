# Kimi Sushi Bar

Ứng dụng xếp lịch, chấm công theo tháng. Source kế thừa Lemontaste.

- 5 nhân viên: Hiep Hoang 180h; 4 Minijob mỗi người 43,4h/tháng.
- Chủ luôn có mặt, không tính vào giờ hợp đồng/lương nhân viên. Không chia bồi/bếp.
- Minijob ưu tiên 18–20h; ngày đông thứ 5–7, thứ 6–7 trọng số gấp đôi ngày thường.
- Thứ 2 nghỉ; thứ 3–CN 10–14h và 16–21:30; thứ 6–7 tới 22h.
- Ngày lễ theo giờ thứ tương ứng. Giáng sinh nhập ngoại lệ theo từng năm.
- Cài đặt nhân viên: Giờ/tháng là nguồn định mức. Lương là thông tin riêng.
- Lưu local mặc định; Supabase cần cấu hình riêng qua biến môi trường.

```sh
npm ci
npm run dev
npm run build
```

Kiểm tra: `npm test` — 40 tests, gồm đủ giờ chính xác cả 12 tháng năm 2026. Ca lưới 30 phút; phần lẻ 24 phút được bổ sung nếu không vi phạm giờ mở cửa, hợp đồng, giới hạn ca và nghỉ.
