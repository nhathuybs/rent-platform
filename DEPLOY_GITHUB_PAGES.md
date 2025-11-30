# Hướng dẫn Deploy lên GitHub Pages

## Bước 1: Kích hoạt GitHub Pages

1. Vào repository trên GitHub: https://github.com/nhathuybs/rent-platform
2. Vào **Settings** → **Pages**
3. Trong phần **Source**, chọn:
   - **Source**: `GitHub Actions`
4. Click **Save**

## Bước 2: Push code lên GitHub

GitHub Actions workflow đã được tạo sẵn trong file `.github/workflows/deploy.yml`.

Chạy các lệnh sau:

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

## Bước 3: Kiểm tra Deployment

1. Vào tab **Actions** trên GitHub repository
2. Xem workflow "Deploy to GitHub Pages" đang chạy
3. Đợi build hoàn tất (thường 2-5 phút)
4. Sau khi thành công, vào **Settings** → **Pages** để xem URL

## URL của bạn

Sau khi deploy thành công, ứng dụng sẽ có URL:
```
https://nhathuybs.github.io/rent-platform/
```

## Lưu ý quan trọng

### 1. HashRouter đã được sử dụng
Project đã dùng `HashRouter` trong `App.tsx`, nên URL sẽ có dạng:
- `https://nhathuybs.github.io/rent-platform/#/login`
- `https://nhathuybs.github.io/rent-platform/#/`

Điều này giúp routing hoạt động tốt trên GitHub Pages.

### 2. API Backend
Đảm bảo file `services/api.ts` có URL backend đúng:
```typescript
export const API_BASE = "https://rent-platform-1.onrender.com";
```

### 3. CORS trên Backend
Đảm bảo backend trên Render cho phép domain GitHub Pages:
- Vào `main.py` và kiểm tra CORS settings
- Có thể cần thêm `"https://nhathuybs.github.io"` vào `allow_origins`

### 4. Re-deploy
Mỗi khi push code lên `main` branch, GitHub Actions sẽ tự động:
- Build lại frontend
- Deploy lên GitHub Pages

## Troubleshooting

### Build fails
- Kiểm tra logs trong tab **Actions**
- Đảm bảo `package.json` có đầy đủ dependencies
- Kiểm tra TypeScript errors

### 404 Not Found sau khi deploy
- Đảm bảo GitHub Pages đã được kích hoạt
- Kiểm tra workflow đã chạy thành công chưa
- Đợi vài phút để GitHub Pages cập nhật

### API không kết nối được
- Kiểm tra CORS settings trên backend
- Kiểm tra URL trong `services/api.ts`
- Test API trực tiếp: `https://rent-platform-1.onrender.com/docs`

## So sánh với Vercel

### GitHub Pages:
- ✅ Miễn phí
- ✅ Tích hợp với GitHub
- ⚠️ Build có thể chậm hơn
- ⚠️ Không có preview deployments

### Vercel:
- ✅ Build nhanh
- ✅ Preview deployments
- ✅ Auto SSL và CDN
- ⚠️ Free tier có giới hạn

Bạn có thể chọn một trong hai hoặc dùng cả hai tùy nhu cầu!

