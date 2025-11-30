# Hướng dẫn Deploy Frontend lên Vercel

## ⚠️ Lưu ý quan trọng

**Vercel KHÔNG phù hợp để deploy FastAPI backend trực tiếp.**

Kiến trúc được khuyến nghị:
- **Frontend (React)**: Deploy trên **Vercel** ✅
- **Backend (FastAPI)**: Deploy trên **Render** hoặc **Railway** ✅

## Cấu trúc Project

Project này có cả frontend và backend trong cùng một repository:
- **Frontend**: React + Vite (files: `App.tsx`, `index.tsx`, `package.json`, etc.)
- **Backend**: FastAPI (files: `main.py`, `app/`, `requirements.txt`)

## Giải pháp: Tách Frontend và Backend

### Option 1: Deploy Frontend trên Vercel (Khuyến nghị)

1. **File `vercel.json` đã được tạo** để chỉ build frontend

2. **Cấu hình Vercel**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (tự động detect từ `vercel.json`)
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables trên Vercel** (nếu cần):
   - Không cần thiết cho frontend build
   - API URL đã được hardcode trong `services/api.ts`

4. **Deploy**:
   - Connect GitHub repository
   - Vercel sẽ tự động detect và build frontend
   - Backend files sẽ bị ignore (không ảnh hưởng)

### Option 2: Tách Repository (Tùy chọn)

Nếu muốn tách hoàn toàn:

1. **Tạo 2 repositories riêng**:
   - `rent-platform-frontend` (chỉ frontend code)
   - `rent-platform-backend` (chỉ backend code)

2. **Frontend repository**:
   - Copy: `App.tsx`, `index.tsx`, `package.json`, `vite.config.ts`, `components/`, `services/`, `types.ts`, etc.
   - Xóa: `main.py`, `app/`, `requirements.txt`, `create_admin.py`

3. **Backend repository**:
   - Copy: `main.py`, `app/`, `requirements.txt`, `create_admin.py`, `render.yaml`
   - Xóa: Frontend files

## Cấu hình API URL

File `services/api.ts` đã được cấu hình:
```typescript
export const API_BASE = "https://rent-platform-1.onrender.com/";
```

Đảm bảo backend đã được deploy trên Render và URL này đúng.

## Troubleshooting

### Lỗi "Python dependencies"
- Vercel đang cố build Python backend
- **Giải pháp**: File `vercel.json` đã được tạo để chỉ build frontend
- Đảm bảo Vercel detect framework là "Vite" không phải "Python"

### Lỗi "Build failed"
- Kiểm tra `package.json` có đầy đủ dependencies
- Kiểm tra build logs trên Vercel dashboard

### Lỗi CORS khi gọi API
- Backend trên Render cần cấu hình CORS đúng
- Kiểm tra `main.py` có `allow_origins=["*"]` hoặc domain Vercel cụ thể

### Frontend không kết nối được Backend
- Kiểm tra URL trong `services/api.ts` đúng chưa
- Kiểm tra backend trên Render đang chạy
- Kiểm tra CORS settings trên backend

## Kiểm tra sau khi deploy

1. **Frontend URL**: `https://your-app.vercel.app`
2. **Backend URL**: `https://rent-platform-1.onrender.com`
3. **Test API**: `https://rent-platform-1.onrender.com/docs`

## Lưu ý

- Vercel free tier có giới hạn build time
- Frontend build thường nhanh (< 2 phút)
- Backend nên deploy trên Render (free tier tốt hơn cho Python)

