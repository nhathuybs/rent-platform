export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  balance: number;
  orders?: Order[]; // Used for admin user details view
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  duration: string;
}

export interface Order {
  id: number;
  product_name: string;
  price: number;
  account_info: string;
  password_info: string;
  otp_info?: string;
  purchase_time: string;
  user_email?: string;
  expires_at?: string;
  is_expired: boolean;
}

export interface PromoCode {
  id: number;
  code: string;
  amount: number;
  is_active: boolean;
  created_at: string;
}