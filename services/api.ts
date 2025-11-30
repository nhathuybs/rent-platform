import { AuthResponse, User, Product, Order } from '../types';

// --- CẤU HÌNH ĐỊA CHỈ SERVER ---
// Mặc định là localhost. Khi deploy, bạn sẽ sửa dòng này thành URL của Backend trên Render.
export const API_BASE = "https://rent-platform-1.onrender.com"; 
// Ví dụ sau khi deploy backend xong: 
// export const API_BASE = "https://rent-app-backend.onrender.com";

// -------------------------------------------

// Helper to get token
const getToken = () => localStorage.getItem("token");

// Generic fetch wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.hash = "#/login"; // Redirect using hash router pattern
    throw new Error("Unauthorized");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "API Error");
  }

  return data;
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