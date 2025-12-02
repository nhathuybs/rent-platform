import { AuthResponse, User, Product, Order } from '../types';

// --- CẤU HÌNH ĐỊA CHỈ SERVER ---
// URL của backend sẽ được lấy từ biến môi trường VITE_API_BASE.
// Khi deploy, bạn sẽ đặt biến này trong cài đặt của Cloudflare Pages.
// Khi chạy local, bạn có thể tạo file .env và đặt VITE_API_BASE=http://localhost:8000
export const API_BASE = import.meta.env.VITE_API_BASE || "https://rent-platform-1.onrender.com"; 
// Ví dụ sau khi deploy backend xong: 
// export const API_BASE = "https://rent-app-backend.onrender.com";

// -------------------------------------------

// Helper to get token
const getToken = () => localStorage.getItem("token");

// Generic fetch wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...options.headers,
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // If the response is not successful, try to parse the error body
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || 'An unknown error occurred');
  }

  // If the response has no content, return a default value or handle as needed
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (data: any) => request("/users/register", { method: "POST", body: JSON.stringify(data) }),
  verify: (data: any) => request("/users/verify", { method: "POST", body: JSON.stringify(data) }),
  resendVerifyCode: (email: string) => request("/users/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
  login: (data: any) => request<AuthResponse>("/users/login", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (email: string) => request("/users/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (data: any) => request("/users/reset-password", { method: "POST", body: JSON.stringify(data) }),
  changePassword: (data: any) => request("/users/change-password", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request<User>("/users/me"),

  // Products
  getProducts: () => request<Product[]>("/products/list"),
  addProduct: (data: any) => request("/products/add", { method: "POST", body: JSON.stringify(data) }),
  
  // Orders
  buyProduct: (id: number) => request(`/orders/buy/${id}`, { method: "POST" }),
  getHistory: (role: string) => request<Order[]>(role === 'admin' ? "/orders/all" : "/orders/history"),
  
  // OTP
  calcOtp: (secret: string) => request<{ otp: string }>(`/products/calc-otp?secret=${encodeURIComponent(secret)}`),
};