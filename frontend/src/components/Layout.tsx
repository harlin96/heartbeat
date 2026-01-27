import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, AppWindow, CreditCard, Users, LogOut, Heart } from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/applications', icon: AppWindow, label: '应用管理' },
  { path: '/cards', icon: CreditCard, label: '卡密管理' },
  { path: '/agents', icon: Users, label: '代理管理' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">心跳验证系统</span>
          </div>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 w-full mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span>退出登录</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
