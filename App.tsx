import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { api } from './services/api';
import { User, Product, Order, PromoCode } from './types';
import { Navbar, Button, Input } from './components/Layout';

// --- UTILITY & FORMATTER ---
const formatVND = (price: number) => price.toLocaleString('vi-VN') + ' VND';
const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleString('vi-VN') : 'N/A';

// --- CONTEXT ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void; // For updating balance etc.
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
          logout(); // Use logout to clear everything if token is invalid
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


// --- PAGES ---

// 1. Auth Page
const AuthPage: React.FC<{ mode: 'login' | 'register' | 'verify' | 'forgot' | 'reset' }> = ({ mode }) => {
  // ... (This component remains largely the same, no major changes needed here)
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
        alert("Đăng ký thành công! Vui lòng kiểm tra Email (hoặc log server) để lấy mã xác thực.");
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
      if (err.message?.includes("not verified")) {
        setError("Email chưa xác thực. Chuyển hướng đến trang xác thực...");
        localStorage.setItem("register_email", formData.email);
        setTimeout(() => navigate('/verify'), 2000);
      } else {
        setError(err.message || "Đã có lỗi xảy ra");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{
          { login: 'Đăng Nhập', register: 'Tạo Tài Khoản', verify: 'Xác Thực Email', forgot: 'Quên Mật Khẩu', reset: 'Đặt Lại Mật Khẩu' }[mode]
        }</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {msg && <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm">{msg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {['login', 'register', 'forgot'].includes(mode) && <Input id="email" type="email" label="Email" value={formData.email} onChange={handleChange} required />}
          {['verify', 'reset'].includes(mode) && <Input id="code" label="Mã xác thực" value={formData.code} onChange={handleChange} required />}
          {['login', 'register', 'reset'].includes(mode) && <Input id="password" type="password" label={mode === 'reset' ? "Mật khẩu mới" : "Mật khẩu"} value={formData.password} onChange={handleChange} required />}
          {mode === 'register' && <Input id="confirm" type="password" label="Nhập lại mật khẩu" value={formData.confirm} onChange={handleChange} required />}
          <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Đang xử lý..." : "Xác Nhận"}</Button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-600">
          {mode !== 'login' ? <Link to="/login" className="text-brand-600 hover:underline">Quay lại Đăng nhập</Link> :
            <>
              <Link to="/register" className="text-brand-600 hover:underline">Đăng ký mới</Link> | <Link to="/forgot-password" className="text-brand-600 hover:underline">Quên mật khẩu?</Link>
            </>
          }
        </div>
      </div>
    </div>
  );
};

// 2. Dashboard (Product List) - No major changes
const Dashboard: React.FC = () => {
    // ... (This component remains largely the same, no major changes needed here)
    const [products, setProducts] = useState<Product[]>([]);
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

    const handleBuy = async (p: Product) => {
        if (!window.confirm(`Thuê gói ${p.name} giá ${formatVND(p.price)}?`)) return;
        try {
            await api.buyProduct(p.id);
            alert("Thuê thành công! Kiểm tra lịch sử để lấy thông tin.");
            // Refresh user balance and product stock
            const me = await api.getMe();
            updateUser({ balance: me.balance });
            fetchProducts();
        } catch (e: any) { alert(e.message || "Lỗi mua hàng"); }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải sản phẩm...</div>;
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Danh Sách Gói Cước</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.length === 0 ? <p className="col-span-full text-center">Chưa có sản phẩm nào.</p> : products.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border flex flex-col">
                        <div className="p-6 flex-1">
                            <h3 className="text-lg font-bold">{p.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{p.duration}</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">{formatVND(p.price)}</p>
                            <p className={`text-sm ${p.quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {p.quantity <= 0 ? 'Hết hàng' : `Còn lại: ${p.quantity}`}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t">
                            <Button disabled={p.quantity <= 0} onClick={() => handleBuy(p)} className="w-full">
                                {p.quantity <= 0 ? "Hết Hàng" : "Thuê Ngay"}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 3. History Page - Updated to show expiration and Renew button
const History: React.FC = () => {
    // ... (This component is updated to handle new order properties)
    const { user, updateUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getHistory(user.role);
            setOrders(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);
    
    const handleRenew = async (order: Order) => {
        if (!window.confirm(`Gia hạn "${order.product_name}" với giá ${formatVND(order.price)}?`)) return;
        try {
            await api.renewOrder(order.id);
            alert("Gia hạn thành công!");
            const me = await api.getMe();
            updateUser({ balance: me.balance });
            fetchHistory();
        } catch (e: any) { alert(e.message || "Lỗi gia hạn"); }
    };
    
    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải lịch sử...</div>;
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Lịch sử đơn hàng</h1>
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Sản phẩm</th>
                            {user?.role === 'admin' && <th className="px-6 py-3 text-left text-xs font-medium uppercase">Khách hàng</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tài khoản</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Hết hạn</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {orders.length === 0 ? <tr><td colSpan={6} className="text-center py-8">Chưa có đơn hàng nào</td></tr> :
                            orders.map(o => (
                                <tr key={o.id}>
                                    <td className="px-6 py-4 font-medium">{o.product_name}</td>
                                    {user?.role === 'admin' && <td className="px-6 py-4 text-sm text-gray-600">{o.user_email}</td>}
                                    <td className="px-6 py-4 text-sm font-mono">{o.account_info}</td>
                                    <td className="px-6 py-4 text-sm">{formatDate(o.expires_at)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${o.is_expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {o.is_expired ? 'Đã hết hạn' : 'Đang hoạt động'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button variant="secondary" disabled={o.is_expired} onClick={() => alert(o.otp_info || 'Không có OTP')}>Lấy OTP</Button>
                                        <Button onClick={() => handleRenew(o)}>Gia hạn</Button>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 4. Admin Pages (New)
const AdminAddProduct: React.FC = () => {
    // ... (This is the original Admin page, renamed)
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', price: 0, quantity: 1, duration: '', account: '', password: '', otp_secret: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        setFormData({ ...formData, [e.target.id]: val });
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.admin.addProduct({ ...formData, duration: formData.duration + " Ngày" });
            alert("Thêm sản phẩm thành công!");
            navigate('/dashboard');
        } catch (e: any) { alert(e.message || "Lỗi thêm sản phẩm"); }
    };
    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Thêm sản phẩm mới</h1>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
                <Input id="name" label="Tên sản phẩm" value={formData.name} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input id="price" type="number" label="Giá (VND)" value={formData.price} onChange={handleChange} required />
                    <Input id="quantity" type="number" label="Số lượng" value={formData.quantity} onChange={handleChange} required />
                </div>
                <Input id="duration" type="number" label="Thời hạn (Ngày)" value={formData.duration} onChange={handleChange} required />
                <Input id="account" label="Tài khoản" value={formData.account} onChange={handleChange} required />
                <Input id="password" label="Mật khẩu" value={formData.password} onChange={handleChange} required />
                <Input id="otp_secret" label="Mã bí mật 2FA (Optional)" value={formData.otp_secret} onChange={handleChange} />
                <Button type="submit" className="w-full">Thêm Sản Phẩm</Button>
            </form>
        </div>
    );
};

const AdminUserManagement: React.FC = () => {
    // ... (New component for managing users)
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.admin.getUsers();
            setUsers(data);
        } catch(e) { console.error(e) }
        finally { setLoading(false) }
    }, []);

    useEffect(() => { fetchUsers() }, [fetchUsers]);

    const handleSetBalance = async (email: string) => {
        const newBalanceStr = prompt(`Nhập số dư mới cho ${email}:`);
        if (newBalanceStr) {
            const newBalance = parseFloat(newBalanceStr);
            if (!isNaN(newBalance) && newBalance >= 0) {
                try {
                    await api.admin.setBalance(email, newBalance);
                    alert("Cập nhật thành công!");
                    fetchUsers();
                } catch (e: any) { alert(e.message); }
            } else {
                alert("Số dư không hợp lệ.");
            }
        }
    };
    
    if (loading) return <div className="p-8 text-center">Đang tải danh sách người dùng...</div>;
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Quản lý người dùng</h1>
             <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Vai trò</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Số dư</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Lịch sử mua</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(u => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 font-medium">{u.email}</td>
                                <td className="px-6 py-4 text-sm">{u.role}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatVND(u.balance)}</td>
                                <td className="px-6 py-4 text-sm">{u.orders?.length || 0} đơn hàng</td>
                                <td className="px-6 py-4 text-right">
                                    <Button onClick={() => handleSetBalance(u.email)}>Sửa số dư</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminPromoManagement: React.FC = () => {
    // ... (New component for managing promo codes)
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPromos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.admin.getPromos();
            setPromos(data);
        } catch(e) { console.error(e) }
        finally { setLoading(false) }
    }, []);

    useEffect(() => { fetchPromos() }, [fetchPromos]);
    
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const code = (form.elements.namedItem('code') as HTMLInputElement).value;
        const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
        if (code && amount > 0) {
            try {
                await api.admin.createPromo({ code, amount });
                alert("Tạo mã thành công!");
                form.reset();
                fetchPromos();
            } catch (e: any) { alert(e.message); }
        }
    };
    
    if (loading) return <div className="p-8 text-center">Đang tải mã khuyến mãi...</div>;
    return (
         <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-xl font-bold mb-4">Tạo mã mới</h2>
                <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow border space-y-4">
                    <Input name="code" label="Mã khuyến mãi" placeholder="VD: MUNGNAMMOI" required />
                    <Input name="amount" type="number" label="Số tiền (VND)" required />
                    <Button type="submit" className="w-full">Tạo mã</Button>
                </form>
            </div>
            <div className="md:col-span-2">
                 <h2 className="text-xl font-bold mb-4">Danh sách mã đã tạo</h2>
                 <div className="bg-white rounded-lg shadow overflow-x-auto border">
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mã</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Số tiền</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Trạng thái</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y">
                            {promos.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 font-mono font-bold">{p.code}</td>
                                    <td className="px-6 py-4 text-green-600 font-semibold">{formatVND(p.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {p.is_active ? 'Còn hiệu lực' : 'Đã sử dụng/Vô hiệu'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                 </div>
            </div>
         </div>
    );
};


// 5. User Profile - Updated to include Redeem Code
const Profile: React.FC = () => {
    // ... (This component is updated)
    const { user, logout, updateUser } = useAuth();
    const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
    const [promoCode, setPromoCode] = useState('');

    const handlePassChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passData.new !== passData.confirm) return alert("Mật khẩu mới không khớp");
        try {
            await api.changePassword({ old_password: passData.old, new_password: passData.new });
            alert("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
            logout();
        } catch (e: any) { alert(e.message || "Lỗi đổi mật khẩu"); }
    };
    
    const handleRedeemCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCode) return;
        try {
            await api.redeemCode(promoCode);
            alert("Nạp mã thành công!");
            const me = await api.getMe(); // Fetch updated user data
            updateUser({ balance: me.balance }); // Update context
            setPromoCode('');
        } catch (e: any) { alert(e.message || "Lỗi nạp mã"); }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg grid gap-6">
             <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold mb-4">Thông tin tài khoản</h2>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Vai trò:</strong> {user?.role}</p>
                <p className="font-bold text-green-600"><strong>Số dư:</strong> {formatVND(user?.balance || 0)}</p>
             </div>
             
             <div className="bg-white rounded-xl shadow p-6">
                 <h2 className="text-xl font-bold mb-4">Nạp mã khuyến mãi</h2>
                 <form onSubmit={handleRedeemCode} className="flex gap-2">
                    <Input placeholder="Nhập mã..." value={promoCode} onChange={e => setPromoCode(e.target.value)} className="mb-0 flex-1" />
                    <Button type="submit" className="h-10">Nạp</Button>
                 </form>
             </div>

             <div className="bg-white rounded-xl shadow p-6">
                 <h2 className="text-xl font-bold mb-4">Đổi mật khẩu</h2>
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

// --- LAYOUT & ROUTING ---
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
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
  const { token } = useAuth();

  if (!token) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/verify" element={<AuthPage mode="verify" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset" element={<AuthPage mode="reset" />} />
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
        <Route path="/admin/products" element={<ProtectedLayout><AdminRoute><AdminAddProduct /></AdminRoute></ProtectedLayout>} />
        <Route path="/admin/users" element={<ProtectedLayout><AdminRoute><AdminUserManagement /></AdminRoute></ProtectedLayout>} />
        <Route path="/admin/promos" element={<ProtectedLayout><AdminRoute><AdminPromoManagement /></AdminRoute></ProtectedLayout>} />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;