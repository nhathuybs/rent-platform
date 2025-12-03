import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { api } from './services/api';
import { User, ProductListItem } from './types';
import { Navbar, Button, Input, Modal } from './components/Layout';

// --- UTILITY & FORMATTER ---
const formatVND = (price: number) => price.toLocaleString('vi-VN') + ' VND';
const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleString('vi-VN') : 'N/A';

// --- CONTEXT ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType>(null!);
const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };
  
  const updateUser = (updatedUserData: Partial<User>) => {
    setUser(currentUser => currentUser ? { ...currentUser, ...updatedUserData } : null);
  };

  useEffect(() => {
    const fetchUserOnMount = async () => {
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        try {
          const u = await api.getMe();
          setUser(u);
          setToken(existingToken);
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };
    fetchUserOnMount();
  }, [logout]);

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- PAGES ---
const AuthPage: React.FC<{ mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset' }> = ({ mode }) => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '', confirm: '', code: '' });
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (mode === 'verify') setFormData(prev => ({ ...prev, email: localStorage.getItem("register_email") || '' }));
        if (mode === 'reset') setFormData(prev => ({ ...prev, email: localStorage.getItem("reset_email") || '' }));
    }, [mode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setMsg(''); setIsLoading(true);
        try {
            if (mode === 'login') {
                const res = await api.login({ email: formData.email, password: formData.password });
                login(res.access_token, res.user);
                navigate('/dashboard');
            } else if (mode === 'register') {
                if (formData.password !== formData.confirm) throw new Error("Mật khẩu không khớp");
                await api.register({ email: formData.email, password: formData.password });
                localStorage.setItem("register_email", formData.email);
                setMsg("Đăng ký thành công! Vui lòng kiểm tra Email (hoặc log server) để lấy mã.");
                navigate('/verify');
            } else if (mode === 'verify') {
                await api.verify({ email: formData.email, code: formData.code });
                alert("Xác thực thành công! Hãy đăng nhập.");
                navigate('/login');
            } else if (mode === 'forgot') {
                const res: any = await api.forgotPassword(formData.email);
                localStorage.setItem("reset_email", formData.email);
                setMsg(res.message || "Đã gửi mã. Vui lòng kiểm tra Email.");
                setTimeout(() => navigate('/reset'), 2000);
            } else if (mode === 'reset') {
                await api.resetPassword({ email: formData.email, reset_code: formData.code, new_password: formData.password });
                alert("Đổi mật khẩu thành công!");
                navigate('/login');
            }
        } catch (err: any) {
            setError(err.message || "Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border">
                <h2 className="text-2xl font-bold text-center mb-6">{ { login: 'Đăng Nhập', register: 'Tạo Tài Khoản', verify: 'Xác Thực Email', forgot: 'Quên Mật Khẩu', reset: 'Đặt Lại Mật Khẩu' }[mode] }</h2>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}
                {msg && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{msg}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {['login', 'register', 'forgot', 'verify', 'reset'].includes(mode) && <Input id="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />}
                    {['verify', 'reset'].includes(mode) && <Input id="code" label="Mã xác thực" value={formData.code} onChange={handleChange} required />}
                    {['login', 'register', 'reset'].includes(mode) && <Input id="password" type="password" label={mode === 'reset' ? "Mật khẩu mới" : "Mật khẩu"} value={formData.password} onChange={handleChange} required />}
                    {mode === 'register' && <Input id="confirm" type="password" label="Nhập lại mật khẩu" value={formData.confirm} onChange={handleChange} required />}
                    <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Đang xử lý..." : "Xác Nhận"}</Button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-600">
                    {mode !== 'login' ? <Link to="/login" className="text-brand-600 hover:underline">Quay lại Đăng nhập</Link> :
                        <span className="space-x-2">
                            <Link to="/register" className="text-brand-600 hover:underline">Đăng ký mới</Link>
                            <span>|</span>
                            <Link to="/forgot-password" className="text-brand-600 hover:underline">Quên mật khẩu?</Link>
                        </span>
                    }
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => { /* ... Omitted ... */ return <div>Dashboard Page</div>; };
const History: React.FC = () => { /* ... Omitted ... */ return <div>History Page</div>; };
const Profile: React.FC = () => { /* ... Omitted ... */ return <div>Profile Page</div>; };

// --- ADMIN PAGES ---
const AdminProductManagement: React.FC = () => { /* ... Omitted ... */ return <div>Product Management</div>; };
const AdminProductForm: React.FC<{ mode: 'new' | 'edit' }> = ({ mode }) => { /* ... Omitted ... */ return <div>Product Form</div>; };
const AdminUserManagement: React.FC = () => { /* ... Omitted ... */ return <div>User Management</div>; };
const AdminPromoManagement: React.FC = () => { /* ... Omitted ... */ return <div>Promo Management</div>; };


// --- LAYOUT & ROUTING ---
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={logout} />
      <main>{children}</main>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

const AppRoutes: React.FC = () => {
    const { token } = useAuth();
    const routes = !token ? (
        <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/verify" element={<AuthPage mode="verify" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
            <Route path="/reset" element={<AuthPage mode="reset" />} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    ) : (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/history" element={<ProtectedLayout><History /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
            
            <Route path="/admin/products" element={<ProtectedLayout><AdminRoute><AdminProductManagement /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/products/new" element={<ProtectedLayout><AdminRoute><AdminProductForm mode="new" /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/products/edit/:id" element={<ProtectedLayout><AdminRoute><AdminProductForm mode="edit" /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/users" element={<ProtectedLayout><AdminRoute><AdminUserManagement /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/promos" element={<ProtectedLayout><AdminRoute><AdminPromoManagement /></AdminRoute></ProtectedLayout>} />

            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );

    return <HashRouter>{routes}</HashRouter>;
};

export default App;