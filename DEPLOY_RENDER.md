# Hướng dẫn Deploy lên Render

## Vấn đề đã fix

✅ **Đã sửa lỗi `UnicodeDecodeError`**: 
- Xóa tất cả conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) từ các file Python
- Đảm bảo tất cả file Python đều có encoding UTF-8 đúng

## Các bước deploy trên Render

### 1. Tạo Web Service trên Render

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect repository: `https://github.com/nhathuybs/rent-platform`
4. Chọn branch: `main`

### 2. Cấu hình Build & Start Commands

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 3. Cấu hình Environment Variables

Thêm các biến môi trường sau trong Render Dashboard:

**Bắt buộc:**
- `SECRET_KEY`: Một chuỗi ngẫu nhiên dài (ví dụ: generate từ Render hoặc tạo thủ công)
  - Render có thể tự generate: Click "Generate" bên cạnh field

**Tùy chọn (cho database):**
- `DATABASE_URL`: Nếu dùng PostgreSQL trên Render
  - Tạo PostgreSQL database trên Render
  - Copy connection string vào đây
  - Format: `postgresql://user:password@host:port/dbname`

**Tùy chọn (cho email):**
- `SMTP_SERVER`: SMTP server (ví dụ: `smtp.gmail.com`)
- `SMTP_PORT`: `587`
- `SMTP_USER`: Email của bạn
- `SMTP_PASSWORD`: App password (không phải mật khẩu thường)
- `SMTP_FROM`: Email gửi đi

**Lưu ý:** Nếu không cấu hình email, verification codes sẽ được in ra console/logs của Render.

### 4. Deploy

1. Click "Create Web Service"
2. Render sẽ tự động build và deploy
3. Đợi quá trình hoàn tất (thường 2-5 phút)

### 5. Kiểm tra

Sau khi deploy thành công:
- URL sẽ có dạng: `https://rent-platform-backend-xxxx.onrender.com`
- Test API: `https://your-app.onrender.com/docs` (Swagger UI)
- Test health: `https://your-app.onrender.com/health`

### 6. Cập nhật Frontend API URL

Sau khi có URL backend, cập nhật file `services/api.ts`:

```typescript
export const API_BASE = "https://your-app-name.onrender.com";
```

## Troubleshooting

### Lỗi "UnicodeDecodeError"
✅ **Đã fix** - Tất cả conflict markers đã được xóa

### Lỗi "Module not found"
- Kiểm tra `requirements.txt` có đầy đủ dependencies
- Kiểm tra build logs trên Render

### Lỗi "Database connection failed"
- Kiểm tra `DATABASE_URL` đúng chưa
- Đảm bảo PostgreSQL database đã được tạo và running

### Lỗi "Port already in use"
- Đảm bảo start command sử dụng `$PORT` (Render tự động set)

### Kiểm tra logs
- Vào Render Dashboard → Service → Logs
- Xem real-time logs để debug

## Tạo Admin User sau khi deploy

Sau khi deploy, bạn cần tạo admin user. Có 2 cách:

### Cách 1: Sử dụng Render Shell
1. Vào Render Dashboard → Service → Shell
2. Chạy:
```bash
python create_admin.py
```

### Cách 2: Tạo qua API (nếu có endpoint)
Hoặc tạo trực tiếp trong database nếu có quyền truy cập.

## Lưu ý quan trọng

1. **Free tier**: Render sẽ sleep service sau 15 phút không dùng. Request đầu tiên sẽ mất ~30s để wake up.

2. **Database**: Nếu dùng PostgreSQL trên Render free tier, database sẽ bị xóa sau 90 ngày không dùng.

3. **Environment Variables**: Không commit `.env` file lên git. Dùng Render Environment Variables thay thế.

4. **CORS**: Backend đã cấu hình CORS cho phép tất cả origins (`*`). Trong production, nên thay bằng domain cụ thể của frontend.

