# Hướng dẫn tạo Super Admin cho Challenge 100 ngày

## Tổng quan
Hệ thống có 4 level phân quyền:
- **👑 Super Admin**: Toàn quyền quản lý hệ thống, phân quyền user khác
- **🛡️ Admin**: Quản lý user, duyệt đăng ký, xem báo cáo
- **👮 Moderator**: Điều phối viên, hỗ trợ admin
- **👤 User**: Người chơi challenge

## Cách tạo Super Admin

### Bước 1: Tạo tài khoản Firebase Authentication
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project "challenge-100days-deepseek"
3. Vào **Authentication > Users**
4. Click **Add user**
5. Nhập email: `superadmin@challenge.com`
6. Nhập password (tối thiểu 6 ký tự)
7. **LƯU LẠI UID** của user vừa tạo (sẽ cần dùng trong bước 2)

### Bước 2: Chạy script setup Super Admin
1. Mở terminal trong project
2. Thay `YOUR_SUPER_ADMIN_UID` bằng UID từ bước 1:
   ```bash
   # Chỉnh sửa file setup-admin.js
   nano setup-admin.js
   # Thay YOUR_SUPER_ADMIN_UID bằng UID thực tế
   ```
3. Chạy script:
   ```bash
   node setup-admin.js
   ```

### Bước 3: Đăng nhập và kiểm tra
1. Truy cập app và đăng nhập với `superadmin@challenge.com`
2. Vào Admin Dashboard
3. Trong modal chi tiết user, bạn sẽ thấy phần "Quản lý phân quyền" màu tím
4. Có thể thay đổi role của user khác

## Lưu ý quan trọng
- **Chỉ Super Admin mới thấy phần phân quyền**
- **Cẩn thận khi thay đổi role** - có thể ảnh hưởng đến quyền truy cập
- **Super Admin có thể phân quyền cho admin khác**
- **Admin thông thường không thể phân quyền**

## Khôi phục Super Admin (nếu quên password)
1. Vào Firebase Console > Authentication
2. Reset password cho `superadmin@challenge.com`
3. Hoặc tạo user mới và chạy lại script setup

## Các quyền của Super Admin
- ✅ Quản lý tất cả user
- ✅ Phân quyền cho user khác
- ✅ Duyệt/từ chối đăng ký
- ✅ Xem tất cả báo cáo KPI
- ✅ Quản lý cấu hình hệ thống
- ✅ Export dữ liệu
- ✅ Quản lý tracklog và KPI exception