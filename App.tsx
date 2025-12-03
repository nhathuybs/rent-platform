import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link, useParams } from 'react-router-dom';
import { api } from './services/api';
import { User, ProductListItem, Order, PromoCode } from './types';
import { Navbar, Button, Input } from './components/Layout';

// --- UTILITY & FORMATTER ---
const formatVND = (price: number) => price.toLocaleString('vi-VN') + ' VND';
const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleString('vi-VN') : 'N/A';

const formatRemaining = (expiresAt?: string) => {
    if (!expiresAt) return 'N/A';
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return 'Đã hết hạn';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let parts: string[] = [];
    if (diffDays > 0) parts.push(`${diffDays} ngày`);
    if (diffHours > 0) parts.push(`${diffHours} giờ`);
    if (diffDays === 0 && diffHours === 0) parts.push(`${diffMins} phút`);
    return parts.join(' ');
}

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
  const [apiReady, setApiReady] = useState(false);

  const checkApiStatus = useCallback(async () => {
    try {
      await api.healthCheck();
      setApiReady(true);
      return true;
    } catch (e) {
      setApiReady(false);
      return false;
    }
  }, []);

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
      if (!await checkApiStatus()) {
        setLoading(false);
        return;
      }
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
  }, [logout, checkApiStatus]);

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl font-semibold">Đang tải...</div>;

  if (!apiReady) {
    return (
        <div className="flex flex-col h-screen items-center justify-center text-center">
            <h2 className="text-2xl font-semibold mb-4">Lỗi kết nối Server</h2>
            <p className="mb-6 text-gray-600">Không thể kết nối tới máy chủ. Vui lòng thử lại sau.</p>
            <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
        </div>
    );
  }
  
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

const Dashboard: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    
    useEffect(() => {
        api.getProducts().then(setProducts).catch(e => console.error(e));
        api.getActiveAnnouncements().then(setAnnouncements).catch(e => console.error(e));
    }, []);

    const handleBuy = async (product: ProductListItem) => {
        if (!window.confirm(`Mua "${product.name}" với giá ${formatVND(product.price)}?`)) return;
        try {
            await api.buyProduct(product.id);
            alert("Mua hàng thành công! Kiểm tra trang Lịch sử để xem chi tiết.");
            const me = await api.getMe();
            updateUser({ balance: me.balance });
        } catch (e: any) {
            alert(e.message);
        }
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Announcement Banner */}
            {announcements.length > 0 && (
                <div className="mb-6 space-y-3">
                    {announcements.map(a => (
                        <div key={a.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                            <h3 className="font-bold text-yellow-800">{a.title}</h3>
                            <p className="text-yellow-700 text-sm whitespace-pre-wrap">{a.content}</p>
                        </div>
                    ))}
                </div>
            )}
            
            <h1 className="text-2xl font-bold mb-6">Sản phẩm có sẵn</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow border flex flex-col">
                        <div className="p-6 flex-grow">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-xl font-bold">{p.name}</h2>
                                {p.is_rented ? (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">Đã thuê</span>
                                ) : p.quantity > 0 ? (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">Còn hàng</span>
                                ) : (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Hết hàng</span>
                                )}
                            </div>
                            <p className="text-gray-600 text-sm mb-4">Số lượng: {p.quantity}</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-b-xl flex justify-between items-center">
                            <div>
                                <p className="text-lg font-semibold text-brand-600">{formatVND(p.price)}</p>
                                <p className="text-sm text-gray-500">/ {p.duration}</p>
                            </div>
                            <Button onClick={() => handleBuy(p)} disabled={(user?.balance || 0) < p.price || p.quantity <= 0 || p.is_rented}>
                                {p.is_rented ? 'Đã thuê' : p.quantity <= 0 ? 'Hết hàng' : 'Mua'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const History: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // Removed modal UI state — using in-cell OTP display instead
    const [otpCache, setOtpCache] = useState<Record<number, string>>({});
    const [otpLoading, setOtpLoading] = useState<Record<number, boolean>>({});
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = user.role === 'admin' ? await api.admin.getAllOrders() : await api.getHistory();
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
        } catch (e: any) { alert(e.message); }
    };
    
    // openRevealModal removed — no modal-based reveal needed

    const handleAdminEdit = async (order: Order) => {
        const newDateStr = prompt("Nhập ngày hết hạn mới (YYYY-MM-DD HH:MM:SS):", new Date(order.expires_at || Date.now()).toISOString().slice(0, 19).replace('T', ' '));
        if (newDateStr) {
            try {
                await api.admin.updateOrder(order.id, { expires_at: new Date(newDateStr).toISOString() });
                alert("Cập nhật thành công!");
                fetchHistory();
            } catch (e: any) { alert(e.message); }
        }
    };
    
    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Lịch sử đơn hàng</h1>
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Sản phẩm</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Tài khoản</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Mật khẩu</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Mã OTP</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Ngày mua</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Thời hạn còn lại</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Trạng thái</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase">Gia hạn</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {orders.map(o => (
                            <tr key={o.id}>
                                <td className="px-4 py-4 font-medium">{o.product_name}</td>
                                <td className="px-4 py-4 font-mono text-sm">{o.account_info}</td>
                                <td className="px-4 py-4 font-mono text-sm">
                                    {showPassword[o.id] ? (
                                        <span className="cursor-pointer" onClick={() => setShowPassword(p => ({...p, [o.id]: false}))} title="Click để ẩn">{o.password_info}</span>
                                    ) : (
                                        <span className="cursor-pointer text-gray-400" onClick={() => setShowPassword(p => ({...p, [o.id]: true}))} title="Click để xem">••••••</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                        {o.otp_info ? (
                                            otpCache[o.id] ? (
                                                otpCache[o.id] === 'INVALID' ? (
                                                    <span className="text-red-500 text-xs">Secret không hợp lệ</span>
                                                ) : (
                                                    <span className="font-mono">{otpCache[o.id]}</span>
                                                )
                                            ) : (
                                                <Button size="sm" variant="secondary" onClick={async () => {
                                                    // Fetch OTP, copy to clipboard, and show in-cell
                                                    try {
                                                        setOtpLoading(prev => ({ ...prev, [o.id]: true }));
                                                        const res = await api.calcOtp(o.otp_info || '');
                                                        const otp = res?.otp ?? '';
                                                        if (otp) {
                                                            setOtpCache(prev => ({ ...prev, [o.id]: otp }));
                                                            try {
                                                                await navigator.clipboard.writeText(otp);
                                                            } catch (_) {
                                                                // ignore clipboard failures
                                                            }
                                                        }
                                                    } catch (e: any) {
                                                        console.error('Failed to fetch OTP', e);
                                                        // Mark as invalid so user knows
                                                        setOtpCache(prev => ({ ...prev, [o.id]: 'INVALID' }));
                                                    } finally {
                                                        setOtpLoading(prev => ({ ...prev, [o.id]: false }));
                                                    }
                                                }}>
                                                    {otpLoading[o.id] ? 'Đang...' : 'Lấy mã'}
                                                </Button>
                                            )
                                        ) : 'N/A'}
                                </td>
                                <td className="px-4 py-4 text-sm">{formatDate(o.purchase_time)}</td>
                                <td className="px-4 py-4 text-sm">{formatRemaining(o.expires_at)}</td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${o.is_expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {o.is_expired ? 'Hết hạn' : 'Hoạt động'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <Button size="sm" onClick={() => handleRenew(o)} disabled={o.is_expired}>Gia hạn</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Profile: React.FC = () => {
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
        } catch (e: any) { alert(e.message); }
    };
    
    const handleRedeemCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCode) return;
        try {
            await api.redeemCode(promoCode);
            alert("Nạp mã thành công!");
            const me = await api.getMe();
            updateUser({ balance: me.balance });
            setPromoCode('');
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg grid gap-8">
             <div className="bg-white rounded-xl shadow p-6 border">
                <h2 className="text-xl font-bold mb-4">Thông tin tài khoản</h2>
                <div className="space-y-2">
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Vai trò:</strong> {user?.role}</p>
                    <p className="font-bold text-green-600"><strong>Số dư:</strong> {formatVND(user?.balance || 0)}</p>
                </div>
             </div>
             <div className="bg-white rounded-xl shadow p-6 border">
                 <h2 className="text-xl font-bold mb-4">Nạp mã khuyến mãi</h2>
                 <form onSubmit={handleRedeemCode} className="flex gap-2">
                    <Input placeholder="Nhập mã..." value={promoCode} onChange={e => setPromoCode(e.target.value)} className="mb-0 flex-1" />
                    <Button type="submit" className="h-10">Nạp</Button>
                 </form>
             </div>
             <div className="bg-white rounded-xl shadow p-6 border">
                 <h2 className="text-xl font-bold mb-4">Đổi mật khẩu</h2>
                 <form onSubmit={handlePassChange} className="space-y-4">
                    <Input type="password" id="old" placeholder="Mật khẩu cũ" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} required />
                    <Input type="password" id="new" placeholder="Mật khẩu mới" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} required />
                    <Input type="password" id="confirm" placeholder="Xác nhận mới" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} required />
                    <Button variant="secondary" type="submit" className="w-full">Cập nhật mật khẩu</Button>
                 </form>
             </div>
        </div>
    );
};

// --- ADMIN PAGES ---
const AdminProductManagement: React.FC = () => {
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Admin should see all products including soft-deleted ones
                const data = await api.getAdminProducts();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
                alert("Failed to fetch products");
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Product Management</h1>
                <Button onClick={() => navigate('/admin/products/new')}>Add New Product</Button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Duration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Stock</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(p => (
                            <tr key={p.id} className={p.is_deleted ? 'bg-red-50' : ''}>
                                <td className="px-4 py-4">{p.id}</td>
                                <td className="px-4 py-4 font-medium">{p.name}</td>
                                <td className="px-4 py-4">{formatVND(p.price)}</td>
                                <td className="px-4 py-4">{p.duration}</td>
                                <td className="px-4 py-4">{p.quantity}</td>
                                <td className="px-4 py-4">
                                    {p.is_deleted ? (
                                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">Đã xóa</span>
                                    ) : p.quantity > 0 ? (
                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded">Còn hàng</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-600 rounded">Hết hàng</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" onClick={() => navigate(`/admin/products/edit/${p.id}`)}>Edit</Button>
                                        <Button size="sm" variant="secondary" disabled={p.is_deleted} onClick={async () => {
                                            const email = prompt(`Nhập email user để gán sản phẩm #${p.id} - ${p.name}:`);
                                            if (!email) return;
                                            try {
                                                await api.admin.assignProduct(email.trim(), p.id);
                                                alert(`Đã gán sản phẩm cho ${email}`);
                                            } catch (err) {
                                                console.error(err);
                                                alert('Gán sản phẩm thất bại');
                                            }
                                        }}>Assign</Button>
                                        <Button size="sm" variant="danger" onClick={async () => {
                                            if (!confirm(`Xóa vĩnh viễn sản phẩm #${p.id} - ${p.name}? Hành động này không thể hoàn tác!`)) return;
                                            try {
                                                await api.admin.deleteProduct(p.id);
                                                // refresh products
                                                const refreshed = await api.getAdminProducts();
                                                setProducts(refreshed);
                                                alert('Sản phẩm đã được xóa vĩnh viễn!');
                                            } catch (err) {
                                                console.error(err);
                                                alert('Failed to delete product');
                                            }
                                        }}>Delete</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const AdminProductForm: React.FC<{ mode: 'new' | 'edit' }> = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const mode = id ? 'edit' : 'new';
    const [product, setProduct] = useState({
        name: '',
        price: 0,
        duration: '',
        quantity: 0,
        account_info: '',
        password_info: '',
        otp_secret: ''
    });

    useEffect(() => {
        if (mode === 'edit' && id) {
            const fetchProduct = async () => {
                try {
                    const data = await api.admin.getProductDetails(parseInt(id));
                    setProduct({
                        name: data.name,
                        price: data.price,
                        duration: data.duration,
                        quantity: data.quantity,
                        account_info: data.account_info,
                        password_info: data.password_info,
                        otp_secret: data.otp_secret || ''
                    });
                } catch (error) {
                    alert('Failed to fetch product details');
                }
            };
            fetchProduct();
        }
    }, [id, mode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = name === 'price' || name === 'quantity';
        const parsed = isNumber ? (value === '' ? 0 : Number(value)) : value;
        setProduct(prev => ({ ...prev, [name]: parsed }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (mode === 'new') {
                // Map frontend field names to backend expected names for create
                const payload = {
                    name: product.name,
                    price: Number(product.price || 0),
                    duration: product.duration,
                    quantity: Number(product.quantity || 0),
                    account: product.account_info,
                    password: product.password_info,
                    otp_secret: product.otp_secret || null,
                };
                await api.admin.addProduct(payload);
                alert('Product created successfully');
            } else if (id) {
                await api.admin.updateProduct(parseInt(id), product);
                alert('Product updated successfully');
            }
            navigate('/admin/products');
        } catch (error) {
            alert('An error occurred');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">{mode === 'new' ? 'Create New Product' : 'Edit Product'}</h1>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border space-y-4">
                <Input name="name" label="Product Name" value={product.name} onChange={handleChange} required />
                <Input name="price" type="number" label="Price (VND)" value={product.price.toString()} onChange={handleChange} required />
                <Input name="duration" label="Duration" value={product.duration} onChange={handleChange} required />
                <Input name="quantity" type="number" label="Quantity" value={product.quantity.toString()} onChange={handleChange} required />
                <Input name="account_info" label="Account Info" value={product.account_info} onChange={handleChange} required />
                <Input name="password_info" label="Password Info" value={product.password_info} onChange={handleChange} required />
                <Input name="otp_secret" label="OTP Secret" value={product.otp_secret} onChange={handleChange} />
                <div className="flex gap-4">
                    <Button type="submit">Save Product</Button>
                    <Button variant="secondary" onClick={() => navigate('/admin/products')}>Cancel</Button>
                </div>
            </form>
        </div>
    );
};
const AdminUserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await api.admin.getUsers();
            setUsers(data);
        } catch (error) {
            alert('Failed to fetch users');
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleSetBalance = async (user: User) => {
        const newBalanceStr = prompt(`Set new balance for ${user.email}:`, user.balance.toString());
        if (newBalanceStr) {
            const newBalance = parseInt(newBalanceStr);
            if (!isNaN(newBalance)) {
                try {
                    await api.admin.setBalance(user.email, newBalance);
                    alert('Balance updated!');
                    fetchUsers();
                } catch (e: any) { alert(e.message); }
            }
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!window.confirm(`Xóa user ${user.email}? Tất cả lịch sử đơn hàng của user này cũng sẽ bị xóa!`)) return;
        try {
            await api.admin.deleteUser(user.id);
            alert('User đã được xóa!');
            fetchUsers();
        } catch (e: any) { alert(e.message); }
    };

    const handleDeleteOrder = async (orderId: number) => {
        if (!window.confirm(`Xóa đơn hàng #${orderId} khỏi lịch sử?`)) return;
        try {
            await api.admin.deleteOrder(orderId);
            alert('Đơn hàng đã được xóa!');
            fetchUsers();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>
            <div className="space-y-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white rounded-lg shadow border p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <span className="font-bold">{u.email}</span>
                                <span className={`ml-2 text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {u.role}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-600 font-semibold">{formatVND(u.balance)}</span>
                                <Button size="sm" onClick={() => handleSetBalance(u)}>Set Balance</Button>
                                {u.role !== 'admin' && (
                                    <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u)}>Xóa User</Button>
                                )}
                            </div>
                        </div>
                        {u.orders && u.orders.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                                <p className="text-sm font-semibold text-gray-600 mb-2">Lịch sử đơn hàng:</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {u.orders.map((o: any) => (
                                        <div key={o.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                            <div>
                                                <span className="font-medium">{o.product_name}</span>
                                                <span className="text-gray-500 ml-2">{formatVND(o.price)}</span>
                                            </div>
                                            <Button size="sm" variant="danger" onClick={() => handleDeleteOrder(o.id)}>Xóa</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
const AdminPromoManagement: React.FC = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [newPromo, setNewPromo] = useState({ code: '', amount: 10000 });
    
    const fetchPromos = useCallback(async () => {
        try {
            const data = await api.admin.getPromos();
            setPromos(data);
        } catch (e) { alert('Failed to fetch promo codes'); }
    }, []);

    useEffect(() => {
        fetchPromos();
    }, [fetchPromos]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.admin.createPromo(newPromo);
            alert('Promo code created!');
            setNewPromo({ code: '', amount: 10000 });
            fetchPromos();
        } catch (e: any) { alert(e.message); }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this promo code?')) {
            try {
                await api.admin.deletePromo(id);
                alert('Promo code deleted!');
                fetchPromos();
            } catch (e: any) { alert(e.message); }
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Promo Code Management</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-lg font-semibold mb-4">Create New Code</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input 
                            label="Code" 
                            value={newPromo.code} 
                            onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} 
                            required 
                        />
                        <Input 
                            label="Amount (VND)" 
                            type="number"
                            value={newPromo.amount.toString()} 
                            onChange={e => setNewPromo(p => ({ ...p, amount: parseInt(e.target.value) }))} 
                            required 
                        />
                        <Button type="submit">Create</Button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-lg font-semibold mb-4">Existing Codes</h2>
                    <div className="overflow-y-auto max-h-96">
                        <table className="min-w-full divide-y">
                           <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Code</th>
                                    <th className="px-4 py-2 text-left">Amount</th>
                                    <th className="px-4 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {promos.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2 font-mono">{p.code}</td>
                                        <td className="px-4 py-2">{formatVND(p.amount)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ADMIN ANNOUNCEMENT MANAGEMENT ---
interface Announcement {
    id: number;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
}

const AdminAnnouncementManagement: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
    
    const fetchAnnouncements = useCallback(async () => {
        try {
            const data = await api.admin.getAnnouncements();
            setAnnouncements(data);
        } catch (e) { alert('Failed to fetch announcements'); }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
            alert('Vui lòng nhập tiêu đề và nội dung');
            return;
        }
        try {
            await api.admin.createAnnouncement(newAnnouncement);
            alert('Thông báo đã được tạo!');
            setNewAnnouncement({ title: '', content: '' });
            fetchAnnouncements();
        } catch (e: any) { alert(e.message); }
    };
    
    const handleToggle = async (id: number) => {
        try {
            await api.admin.toggleAnnouncement(id);
            fetchAnnouncements();
        } catch (e: any) { alert(e.message); }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
            try {
                await api.admin.deleteAnnouncement(id);
                alert('Đã xóa thông báo!');
                fetchAnnouncements();
            } catch (e: any) { alert(e.message); }
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Quản lý thông báo</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-lg font-semibold mb-4">Tạo thông báo mới</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input 
                            label="Tiêu đề" 
                            value={newAnnouncement.title} 
                            onChange={e => setNewAnnouncement(p => ({ ...p, title: e.target.value }))} 
                            required 
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                rows={4}
                                value={newAnnouncement.content}
                                onChange={e => setNewAnnouncement(p => ({ ...p, content: e.target.value }))}
                                required
                            />
                        </div>
                        <Button type="submit">Tạo thông báo</Button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h2 className="text-lg font-semibold mb-4">Danh sách thông báo</h2>
                    <div className="overflow-y-auto max-h-96 space-y-4">
                        {announcements.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Chưa có thông báo nào</p>
                        ) : (
                            announcements.map(a => (
                                <div key={a.id} className={`p-4 border rounded-lg ${a.is_active ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold">{a.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded ${a.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                                            {a.is_active ? 'Đang hiện' : 'Đã ẩn'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{a.content}</p>
                                    <p className="text-xs text-gray-400 mb-3">{formatDate(a.created_at)}</p>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant={a.is_active ? 'secondary' : 'primary'} onClick={() => handleToggle(a.id)}>
                                            {a.is_active ? 'Ẩn' : 'Hiện'}
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}>Xóa</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

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
            <Route path="/admin/announcements" element={<ProtectedLayout><AdminRoute><AdminAnnouncementManagement /></AdminRoute></ProtectedLayout>} />

            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );

    return <HashRouter>{routes}</HashRouter>;
};

export default App;
