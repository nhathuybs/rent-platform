# Backend Setup and Configuration

## Overview

This is a FastAPI backend for the Rent Platform application. It provides RESTful APIs for user authentication, product management, and order processing.

## Features

- User authentication (register, login, email verification)
- Password management (forgot password, reset password, change password)
- Product management (list, add products - admin only)
- Order management (buy products, view history)
- OTP generation for 2FA-enabled products
- Admin dashboard functionality

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Database Configuration

The application uses SQLite by default for development. To use PostgreSQL:

1. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost/dbname"
   ```

2. For SQLite (default):
   ```bash
   export DATABASE_URL="sqlite:///./rent_platform.db"
   ```

The database will be automatically initialized when you run the application.

### 3. Environment Variables

Create a `.env` file in the root directory (optional, defaults will be used):

```env
# JWT Secret Key (REQUIRED in production)
SECRET_KEY=your-very-long-random-secret-key-here-change-in-production

# Database URL (optional, defaults to SQLite)
DATABASE_URL=sqlite:///./rent_platform.db

# Email Configuration (optional, will log to console if not set)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Note**: If email is not configured, verification and reset codes will be printed to the console.

### 4. Create Admin User

Run the admin creation script:

```bash
python create_admin.py
```

This will prompt you for an email and password to create the first admin user.

### 5. Run the Server

```bash
# Development server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python main.py
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI) will be available at `http://localhost:8000/docs`

## API Endpoints

### Authentication (`/users`)

- `POST /users/register` - Register a new user
- `POST /users/verify` - Verify email with code
- `POST /users/resend-verification` - Resend verification code
- `POST /users/login` - Login user
- `GET /users/me` - Get current user info (requires auth)
- `POST /users/forgot-password` - Request password reset code
- `POST /users/reset-password` - Reset password with code
- `POST /users/change-password` - Change password (requires auth)

### Products (`/products`)

- `GET /products/list` - List all products (public)
- `POST /products/add` - Add new product (admin only, requires auth)
- `GET /products/calc-otp?secret=...` - Calculate OTP from secret

### Orders (`/orders`)

- `POST /orders/buy/{product_id}` - Buy/rent a product (requires auth)
- `GET /orders/history` - Get order history (requires auth)
- `GET /orders/all` - Get all orders (admin only, requires auth)

## Security Notes

1. **SECRET_KEY**: Always change the default SECRET_KEY in production. Use a long, random string.

2. **CORS**: The current setup allows all origins (`allow_origins=["*"]`). In production, replace this with your frontend URL:
   ```python
   allow_origins=["https://your-frontend-domain.com"]
   ```

3. **Database**: Use PostgreSQL in production for better performance and security.

4. **HTTPS**: Always use HTTPS in production.

## Troubleshooting

### Database Issues

If you encounter database errors:
1. Delete the SQLite database file (`rent_platform.db`) and restart the server
2. Check that the `DATABASE_URL` is correctly set

### Email Issues

If emails are not being sent:
- Check the console output - codes are logged there if email is not configured
- Verify SMTP settings in environment variables
- For Gmail, you may need to use an "App Password" instead of your regular password

### Authentication Issues

- Ensure the SECRET_KEY is set consistently across server restarts
- Check that JWT tokens are being sent in the Authorization header as `Bearer <token>`

## Development

### Project Structure

```
app/
├── __init__.py
├── models.py          # SQLAlchemy database models
├── schemas.py         # Pydantic schemas for request/response
├── database.py        # Database connection and session management
├── auth.py            # Authentication utilities (JWT, password hashing)
├── email_utils.py     # Email sending utilities
└── routers/
    ├── __init__.py
    ├── users.py       # User authentication endpoints
    ├── products.py    # Product management endpoints
    └── orders.py      # Order management endpoints
main.py                # FastAPI application entry point
create_admin.py        # Script to create admin user
```

## Testing

You can test the API using:
- Swagger UI at `/docs`
- ReDoc at `/redoc`
- Any HTTP client (curl, Postman, etc.)

Example curl command:

```bash
# Register a user
curl -X POST "http://localhost:8000/users/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST "http://localhost:8000/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

