import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { api } from './services/api';
import { User, Product, Order } from './types';
import { Navbar, Button, Input, Icons, Modal } from './components/Layout';

// --- CONTEXT ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData?: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType>(null!);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const login = (newToken: string, userData?: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    if (userData) setUser(userData);
    else fetchUser();
  };

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// --- PAGES ---

// 1. Auth Page (Handles Login, Register, Forgot, Verify)
const AuthPage: React.FC<{ mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset' }> = ({ mode }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '', confirm: '', code: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Prefill email for verify/reset
  useEffect(() => {
    if (mode === 'verify') {
        setFormData(prev => ({ ...prev, email: localStorage.getItem("register_email") || '' }));
    }
    if (mode === 'reset') {
        setFormData(prev => ({ ...prev, email: localStorage.getItem("reset_email") || '' }));
    }
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleResendCode = async () => {
    if (!formData.email) return setError("Vui lòng nhập Email");
    setIsLoading(true);
    try {
        await api.resendVerifyCode(formData.email);
        setMsg("Đã gửi lại mã! Vui lòng kiểm tra Email (hoặc Console Server nếu chưa cấu hình Mail).");
    } catch (err: any) {
        setError(err.message || "Lỗi gửi lại mã");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg(''); setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email: formData.email, password: formData.password });
        login(res.access_token, res.user);
        navigate('/');
      } else if (mode === 'register') {
        if (formData.password !== formData.confirm) throw new Error("Mật khẩu không khớp");
        await api.register({ email: formData.email, password: formData.password });
        localStorage.setItem("register_email", formData.email);
        alert("Đăng ký thành công! Vui lòng kiểm tra Email để lấy mã xác thực.");
        navigate('/verify');
      } else if (mode === 'verify') {
        await api.verify({ email: formData.email, code: formData.code });
        alert("Xác thực thành công! Hãy đăng nhập.");
        navigate('/login');
      } else if (mode === 'forgot') {
        const res: any = await api.forgotPassword(formData.email);
        localStorage.setItem("reset_email", formData.email);
        setMsg(res.message || "Đã gửi mã xác nhận về Email.");
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
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {mode === 'login' && 'Đăng Nhập'}
          {mode === 'register' && 'Tạo Tài Khoản'}
          {mode === 'verify' && 'Xác Thực Email'}
          {mode === 'forgot' && 'Quên Mật Khẩu'}
          {mode === 'reset' && 'Đặt Lại Mật Khẩu'}
        </h2>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {msg && <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <Input id="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />
          )}
          
          {(mode === 'verify' || mode === 'reset') && (
            <>
                <Input id="email" type="email" label="Email" value={formData.email} readOnly className="bg-gray-100" />
                <div className="mb-4 text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác thực</label>
                    <p className="text-xs text-gray-500 mb-2">Vui lòng kiểm tra hộp thư đến hoặc Spam</p>
                    <input
                        id="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        placeholder="XXXXXX"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm tracking-widest text-center font-bold"
                    />
                </div>
            </>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <Input id="password" type="password" label={mode === 'reset' ? "Mật khẩu mới" : "Mật khẩu"} value={formData.password} onChange={handleChange} required />
          )}

          {mode === 'register' && (
            <Input id="confirm" type="password" label="Nhập lại mật khẩu" value={formData.confirm} onChange={handleChange} required />
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác Nhận"}
          </Button>

          {mode === 'verify' && (
              <div className="text-center mt-2">
                  <button type="button" onClick={handleResendCode} className="text-sm text-brand-600 hover:underline disabled:opacity-50" disabled={isLoading}>
                      Chưa nhận được mã? Gửi lại
                  </button>
              </div>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 space-x-2">
            {mode === 'login' && (
                <>
                    <Link to="/register" className="text-brand-600 hover:underline">Đăng ký mới</Link>
                    <span>|</span>
                    <Link to="/forgot-password" className="text-brand-600 hover:underline">Quên mật khẩu?</Link>
                </>
            )}
            {mode !== 'login' && (
                <Link to="/login" className="text-brand-600 hover:underline">Quay lại Đăng nhập</Link>
            )}
        </div>
      </div>
    </div>
  );
};

// 2. Dashboard (Product List)
const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleBuy = async (p: Product) => {
    if (!window.confirm(`Thuê gói ${p.name} giá $${p.price}?`)) return;
    try {
      await api.buyProduct(p.id);
      alert("Thuê thành công! Kiểm tra lịch sử để lấy thông tin.");
      fetchProducts(); // Refresh stock
    } catch (e: any) {
      alert(e.message || "Lỗi mua hàng");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải sản phẩm...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Danh Sách Gói Cước</h1>
        <p className="text-gray-500 mt-2">Chọn gói dịch vụ phù hợp nhất với nhu cầu của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length === 0 ? <p className="col-span-full text-center text-gray-500">Chưa có sản phẩm nào.</p> : products.map(p => {
          const isOut = p.quantity <= 0;
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{p.name}</h3>
                  <span className="bg-blue-100 text-brand-700 text-xs font-semibold px-2.5 py-0.5 rounded">{p.duration}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">${p.price}</div>
                <div className={`text-sm ${isOut ? 'text-red-500 font-semibold' : 'text-green-600'}`}>
                    {isOut ? 'Hết hàng' : `Còn lại: ${p.quantity}`}
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                <Button disabled={isOut} onClick={() => handleBuy(p)} className="w-full">
                  {isOut ? "Hết Hàng" : "Thuê Ngay"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => alert("Vui lòng mua hàng để lấy mã OTP")}>
                   OTP
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. History Page
const History: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpStates, setOtpStates] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!user) return;
    api.getHistory(user.role).then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const handleGetOtp = async (orderId: number, secret: string) => {
    setOtpStates(prev => ({ ...prev, [orderId]: "..." }));
    try {
      const res = await api.calcOtp(secret);
      if (res.otp) {
        navigator.clipboard.writeText(res.otp);
        setOtpStates(prev => ({ ...prev, [orderId]: `Đã copy: ${res.otp}` }));
        setTimeout(() => setOtpStates(prev => ({ ...prev, [orderId]: "" })), 10000);
      }
    } catch (e) {
      alert("Không thể lấy OTP");
      setOtpStates(prev => ({ ...prev, [orderId]: "" }));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải lịch sử...</div>;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <Icons.History /> {isAdmin ? "Quản lý đơn hàng toàn hệ thống" : "Lịch sử đơn hàng"}
      </h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài khoản</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mật khẩu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA / OTP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có đơn hàng nào</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.product_name}</td>
                {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {order.user_email || <span className="text-gray-400 italic">Không rõ</span>}
                    </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">${order.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.account_info}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono bg-gray-50 rounded px-2">{order.password_info}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {order.otp_info ? (
                    <button 
                        onClick={() => handleGetOtp(order.id, order.otp_info!)}
                        className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded shadow-sm focus:outline-none transition-colors ${
                            otpStates[order.id]?.includes("copy") 
                            ? "border-green-300 text-green-700 bg-green-50"
                            : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        }`}
                    >
                      {otpStates[order.id]?.includes("copy") ? <Icons.Check /> : <Icons.Key />}
                      <span className="ml-1">{otpStates[order.id] || "Lấy OTP"}</span>
                    </button>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.purchase_time).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 4. Admin Page
const Admin: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', price: 0, quantity: 1, duration: '', account: '', password: '', otp_secret: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        setFormData({...formData, [e.target.id]: val});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.addProduct({ ...formData, duration: formData.duration + " Ngày" }); // Append unit as per original code
            alert("Thêm sản phẩm thành công!");
            setFormData({ name: '', price: 0, quantity: 1, duration: '', account: '', password: '', otp_secret: '' });
            navigate('/');
        } catch (e: any) {
            alert(e.message || "Lỗi thêm sản phẩm");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Quản lý sản phẩm</h1>
            <div className="bg-white rounded-xl shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input id="name" label="Tên sản phẩm" value={formData.name} onChange={handleChange} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="price" type="number" step="0.01" label="Giá ($)" value={formData.price} onChange={handleChange} required />
                        <Input id="quantity" type="number" label="Số lượng" value={formData.quantity} onChange={handleChange} required />
                    </div>
                    <Input id="duration" type="number" label="Thời hạn (Ngày)" value={formData.duration} onChange={handleChange} required />
                    <Input id="account" label="Tài khoản" value={formData.account} onChange={handleChange} required />
                    <Input id="password" label="Mật khẩu" value={formData.password} onChange={handleChange} required />
                    <Input id="otp_secret" label="Mã bí mật 2FA (Optional)" value={formData.otp_secret} onChange={handleChange} />
                    <Button type="submit" className="w-full">Thêm Sản Phẩm</Button>
                </form>
            </div>
        </div>
    );
};

// 5. User Profile
const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });

    const handlePassChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passData.new !== passData.confirm) return alert("Mật khẩu mới không khớp");
        try {
            await api.changePassword({ old_password: passData.old, new_password: passData.new });
            alert("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
            logout();
        } catch (e: any) {
            alert(e.message || "Lỗi đổi mật khẩu");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
             <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icons.User /> Thông tin tài khoản</h2>
                <div className="p-4 bg-gray-50 rounded border border-gray-100 mb-4">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded border border-gray-100">
                    <p className="text-sm text-gray-500">Vai trò</p>
                    <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow p-6">
                 <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icons.Key /> Đổi mật khẩu</h2>
                 <form onSubmit={handlePassChange} className="space-y-4">
                    <Input type="password" placeholder="Mật khẩu cũ" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} required />
                    <Input type="password" placeholder="Mật khẩu mới" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} required />
                    <Input type="password" placeholder="Xác nhận mới" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} required />
                    <Button variant="secondary" type="submit" className="w-full">Cập nhật mật khẩu</Button>
                 </form>
             </div>
        </div>
    );
}

// --- MAIN LAYOUT WRAPPER ---
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar userEmail={user.email} isAdmin={user.role === 'admin'} onLogout={logout} />
      <div className="flex-1">{children}</div>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/verify" element={<AuthPage mode="verify" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset" element={<AuthPage mode="reset" />} />
          
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout><History /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
          
          <Route path="/admin" element={
            <ProtectedLayout>
                <AdminRoute><Admin /></AdminRoute>
            </ProtectedLayout>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;