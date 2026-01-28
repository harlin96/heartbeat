import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem('token', res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      {/* Apple风格顶部导航 */}
      <nav className="bg-[rgba(255,255,255,0.8)] backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center">
          <span className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
            心跳验证系统
          </span>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
              登录
            </h1>
            <p className="text-[17px] text-[#86868b] mt-2">
              使用您的账户继续
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-4 py-3 rounded-xl text-[14px] text-center">
                {error}
              </div>
            )}

            <div className="bg-white rounded-xl border border-[#d2d2d7] overflow-hidden shadow-sm">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 text-[17px] text-[#1d1d1f] placeholder-[#86868b] border-b border-[#d2d2d7] focus:outline-none focus:bg-[#fafafa] transition-colors"
                placeholder="用户名"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-[#fafafa] transition-colors"
                placeholder="密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-medium py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#86868b]">
              心跳验证系统 · 安全可靠的设备验证服务
            </p>
          </div>
        </div>
      </div>

      {/* Apple风格底部 */}
      <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7] py-4">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[12px] text-[#86868b] text-center">
            © 2024 Heartbeat Verification System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
