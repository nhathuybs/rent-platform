export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  // Removed is_active as it is not present in the backend UserResponse schema
}

export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  duration: string;
  // Removed account_info as the public product list endpoint does not return it for security
}

export interface Order {
  id: number;
  product_name: string;
  price: number;
  account_info: string;
  password_info: string;
  otp_info: string | null;
  purchase_time: string;
  user_email?: string; // Thêm trường này để Admin biết ai mua
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User; // Optional as login endpoint doesn't return user, but we might hydrate it later
}

export interface ApiError {
  detail: string;
}