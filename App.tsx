import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link, useParams } from 'react-router-dom';
import { api } from './services/api';
import { User, ProductListItem, ProductDetails } from './types';
import { Navbar, Button, Input } from './components/Layout';

// --- UTILITY & FORMATTER ---
const formatVND = (price: number) => price.toLocaleString('vi-VN') + ' VND';

// --- CONTEXT ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

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

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center text-2xl font-semibold">Đang tải...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- PAGES (Auth, Dashboard, History, Profile remain mostly the same) ---

const AuthPage: React.FC<{ mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset' }> = ({ mode }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '', confirm: '', code: '' });
  const [error, setError] = useState('');
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
    setError(''); setIsLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ email: formData.email, password: formData.password });
        login(res.access_token, res.user);
        navigate('/dashboard');
      } else if (mode === 'register') {
        if (formData.password !== formData.confirm) throw new Error("Mật khẩu không khớp");
        await api.register({ email: formData.email, password: formData.password });
        localStorage.setItem("register_email", formData.email);
        alert("Đăng ký thành công! Vui lòng kiểm tra Email (hoặc log server) để lấy mã xác thực.");
        navigate('/verify');
      } else {
        // ... other modes
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
        <h2 className="text-2xl font-bold text-center mb-6">{
          { login: 'Đăng Nhập', register: 'Tạo Tài Khoản', verify: 'Xác Thực Email', forgot: 'Quên Mật Khẩu', reset: 'Đặt Lại Mật Khẩu' }[mode]
        }</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
            {['login', 'register', 'forgot'].includes(mode) && <Input id="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />}
            {['verify', 'reset'].includes(mode) && <Input id="code" label="Mã xác thực" value={formData.code} onChange={handleChange} required />}
            {['login', 'register', 'reset'].includes(mode) && <Input id="password" type="password" label="Mật khẩu" value={formData.password} onChange={handleChange} required />}
            {mode === 'register' && <Input id="confirm" type="password" label="Nhập lại mật khẩu" value={formData.confirm} onChange={handleChange} required />}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Đang xử lý..." : "Xác Nhận"}</Button>
        </form>
        <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-brand-600 hover:underline">Quay lại Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { updateUser } = useAuth();
    const fetchProducts = useCallback(async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    const handleBuy = async (p: ProductListItem) => {
        if (!window.confirm(`Thuê gói ${p.name} giá ${formatVND(p.price)}?`)) return;
        try {
            await api.buyProduct(p.id);
            alert("Thuê thành công!");
            const me = await api.getMe();
            updateUser({ balance: me.balance });
            fetchProducts();
        } catch (e: any) { alert(e.message); }
    };
    if (loading) return <div className="p-8 text-center">Đang tải...</div>;
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Danh Sách Gói Cước</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm border flex flex-col">
                        <div className="p-6 flex-1">
                            <h3 className="text-lg font-bold">{p.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{p.duration}</p>
                            <p className="text-3xl font-bold mb-2">{formatVND(p.price)}</p>
                            <p className={`text-sm ${p.quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {p.quantity <= 0 ? 'Hết hàng' : `Còn lại: ${p.quantity}`}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t">
                            <Button disabled={p.quantity <= 0} onClick={() => handleBuy(p)} className="w-full">
                                Thuê Ngay
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const History: React.FC = () => {
    /* ... Omitted for brevity, this component is unchanged ... */
    return <div>History Page</div>
};

const Profile: React.FC = () => {
    /* ... Omitted for brevity, this component is unchanged ... */
    return <div>Profile Page</div>
};


// --- ADMIN PAGES ---

const AdminProductManagement: React.FC = () => {
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    if (loading) return <div className="p-8 text-center">Đang tải sản phẩm...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
                <Button onClick={() => navigate('/admin/products/new')}>Thêm sản phẩm mới</Button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tên sản phẩm</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Giá</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Số lượng</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-medium">{p.name}</td>
                                <td className="px-6 py-4">{formatVND(p.price)}</td>
                                <td className="px-6 py-4">{p.quantity}</td>
                                <td className="px-6 py-4 text-right">
                                    <Button variant="secondary" onClick={() => navigate(`/admin/products/edit/${p.id}`)}>Sửa</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminProductForm: React.FC<{ mode: 'new' | 'edit' }> = ({ mode }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [formData, setFormData] = useState<Partial<ProductDetails>>({
        name: '', price: 0, quantity: 1, duration: '', 
        account_info: '', password_info: '', otp_secret: ''
    });

    useEffect(() => {
        if (mode === 'edit' && id) {
            api.admin.getProductDetails(parseInt(id)).then(product => {
                setFormData({
                    ...product,
                    duration: product.duration.replace(/\D/g, ''), // Extract numbers from "30 Ngày"
                });
            });
        }
    }, [mode, id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData(prev => ({ ...prev, [id]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            duration: `${formData.duration} Ngày`,
        };
        
        try {
            if (mode === 'new') {
                await api.admin.addProduct(payload);
                alert("Thêm sản phẩm thành công!");
            } else {
                await api.admin.updateProduct(parseInt(id!), payload);
                alert("Cập nhật sản phẩm thành công!");
            }
            navigate('/admin/products');
        } catch (err: any) {
            alert(err.message || "Đã có lỗi xảy ra");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">{mode === 'new' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}</h1>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
                <Input id="name" label="Tên sản phẩm" value={formData.name} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input id="price" type="number" label="Giá (VND)" value={formData.price} onChange={handleChange} required />
                    <Input id="quantity" type="number" label="Số lượng" value={formData.quantity} onChange={handleChange} required />
                </div>
                <Input id="duration" type="number" label="Thời hạn (Ngày)" value={formData.duration} onChange={handleChange} required />
                <Input id="account_info" label="Tài khoản" value={formData.account_info} onChange={handleChange} />
                <Input id="password_info" label="Mật khẩu" value={formData.password_info} onChange={handleChange} />
                <Input id="otp_secret" label="Mã bí mật 2FA (Optional)" value={formData.otp_secret} onChange={handleChange} />
                <Button type="submit" className="w-full">{mode === 'new' ? 'Thêm Sản Phẩm' : 'Cập nhật Sản Phẩm'}</Button>
            </form>
        </div>
    );
};

const AdminUserManagement: React.FC = () => {
    /* ... Omitted for brevity, this component is unchanged ... */
    return <div>User Management</div>
};
const AdminPromoManagement: React.FC = () => {
    /* ... Omitted for brevity, this component is unchanged ... */
    return <div>Promo Management</div>
};


// --- LAYOUT & ROUTING ---
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} onLogout={logout} />
      <main className="flex-1">{children}</main>
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

    if (!token) {
        return (
          <HashRouter>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              {/* Other public routes */}
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </HashRouter>
        );
    }

    return (
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/history" element={<ProtectedLayout><History /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
            
            {/* Admin Routes */}
            <Route path="/admin/products" element={<ProtectedLayout><AdminRoute><AdminProductManagement /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/products/new" element={<ProtectedLayout><AdminRoute><AdminProductForm mode="new" /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/products/edit/:id" element={<ProtectedLayout><AdminRoute><AdminProductForm mode="edit" /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/users" element={<ProtectedLayout><AdminRoute><AdminUserManagement /></AdminRoute></ProtectedLayout>} />
            <Route path="/admin/promos" element={<ProtectedLayout><AdminRoute><AdminPromoManagement /></AdminRoute></ProtectedLayout>} />

            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </HashRouter>
    );
}

export default App;