import { AuthResponse, User, ProductListItem, ProductDetails, Order, PromoCode } from '../types';

// --- CONFIG ---
export const API_BASE = import.meta.env.VITE_API_BASE || "https://rent-platform-1.onrender.com"; 

// --- HELPERS ---
const getToken = () => localStorage.getItem("token");

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers({ "Content-Type": "application/json", ...options.headers });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || 'An unknown error occurred');
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") return {} as T;
  return response.json() as Promise<T>;
}

// --- API DEFINITION ---
export const api = {
  // Health Check
  healthCheck: () => request("/health"),

  // Auth & User
  register: (data: any) => request("/users/register", { method: "POST", body: JSON.stringify(data) }),
  verify: (data: any) => request("/users/verify", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => request<AuthResponse>("/users/login", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (email: string) => request("/users/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (data: any) => request("/users/reset-password", { method: "POST", body: JSON.stringify(data) }),
  changePassword: (data: any) => request("/users/change-password", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request<User>("/users/me"),
  redeemCode: (code: string) => request("/users/redeem-code", { method: "POST", body: JSON.stringify({ code }) }),

  // Products (Public)
  getProducts: () => request<ProductListItem[]>("/products/list"),
  
  // Orders (User)
  buyProduct: (id: number) => request(`/orders/buy/${id}`, { method: "POST" }),
  getHistory: () => request<Order[]>("/orders/history"),
  renewOrder: (orderId: number) => request(`/orders/renew/${orderId}`, { method: "POST" }),
  
  // Admin
  admin: {
    getUsers: () => request<User[]>("/admin/users"),
    setBalance: (email: string, amount: number) => request("/admin/users/balance", { method: "PUT", body: JSON.stringify({ email, amount }) }),
    
    getPromos: () => request<PromoCode[]>("/admin/promo-codes"),
    createPromo: (data: { code: string, amount: number }) => request("/admin/promo-codes", { method: "POST", body: JSON.stringify(data) }),
    deletePromo: (id: number) => request(`/admin/promo-codes/${id}`, { method: "DELETE" }),

    addProduct: (data: any) => request("/products/add", { method: "POST", body: JSON.stringify(data) }),
    getProductDetails: (id: number) => request<ProductDetails>(`/products/${id}`),
    updateProduct: (id: number, data: Partial<ProductDetails>) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    
    getAllOrders: () => request<Order[]>("/orders/all"),
    assignProduct: (user_email: string, product_id: number) => request(`/orders/admin/assign?user_email=${user_email}&product_id=${product_id}`, { method: "POST" }),
    updateOrder: (order_id: number, data: { expires_at: string }) => request(`/orders/admin/${order_id}`, { method: "PUT", body: JSON.stringify(data) }),
    revokeOrder: (order_id: number) => request(`/orders/admin/revoke/${order_id}`, { method: "DELETE" }),
  }
};