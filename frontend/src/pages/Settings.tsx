import { useState } from 'react';
import { Key, Save } from 'lucide-react';
import api from '../api';

export default function Settings() {
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少6位' });
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      setMessage({ type: 'success', text: '密码修改成功' });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || '密码修改失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>

      <div className="grid gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">修改密码</h2>
          </div>

          {message.text && (
            <div className={`mb-4 px-4 py-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">当前密码</label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">新密码</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">确认新密码</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? '保存中...' : '保存修改'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
