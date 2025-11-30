# Hướng dẫn Push Code lên GitHub

## Các bước đã thực hiện:

1. ✅ Đã cập nhật `.gitignore` để loại trừ các file nhạy cảm và Python
2. ✅ Đã khởi tạo git repository
3. ✅ Đã thêm tất cả files vào staging
4. ✅ Đã tạo commit đầu tiên
5. ✅ Đã thêm remote repository: https://github.com/nhathuybs/rent-platform.git
6. ✅ Đã đổi branch sang `main`
7. ✅ Đã thử push lên GitHub

## Nếu push chưa thành công (yêu cầu xác thực):

### Cách 1: Sử dụng Personal Access Token (Khuyến nghị)

1. Tạo Personal Access Token trên GitHub:
   - Vào: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Chọn quyền: `repo` (full control)
   - Copy token

2. Push với token:
   ```bash
   git push -u origin main
   ```
   - Username: `nhathuybs`
   - Password: `[paste your token here]`

### Cách 2: Sử dụng SSH (Nếu đã setup SSH key)

1. Đổi remote URL sang SSH:
   ```bash
   git remote set-url origin git@github.com:nhathuybs/rent-platform.git
   ```

2. Push:
   ```bash
   git push -u origin main
   ```

### Cách 3: Sử dụng GitHub CLI (gh)

```bash
gh auth login
git push -u origin main
```

## Các lệnh đã chạy:

```bash
# Khởi tạo git repository
git init

# Thêm tất cả files
git add -A

# Tạo commit
git commit -m "Initial commit: Complete backend implementation with FastAPI, authentication, products, and orders management"

# Thêm remote
git remote add origin https://github.com/nhathuybs/rent-platform.git

# Đổi branch sang main
git branch -M main

# Push lên GitHub
git push -u origin main
```

## Kiểm tra trạng thái:

```bash
# Xem trạng thái
git status

# Xem remote repositories
git remote -v

# Xem lịch sử commits
git log --oneline
```

## Lưu ý:

- **KHÔNG** commit các file nhạy cảm:
  - `.env` files
  - Database files (`*.db`, `*.sqlite`)
  - Python cache (`__pycache__/`)
  
- File `.gitignore` đã được cập nhật để tự động loại trừ các file này.

- Nếu repository trên GitHub đã có code (từ commit trước), bạn có thể cần pull trước:
  ```bash
  git pull origin main --allow-unrelated-histories
  git push -u origin main
  ```

