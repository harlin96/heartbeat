import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Loader2 } from 'lucide-react';
import { appAPI } from '../api';

interface Application {
  id: number;
  name: string;
  app_key: string;
  app_secret: string;
  description: string;
  max_devices: number;
  heartbeat_interval: number;
  is_active: boolean;
}

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', max_devices: 1, heartbeat_interval: 60 });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await appAPI.list();
      setApps(res.data);
    } catch (err: any) {
      console.error('加载应用列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('请输入应用名称');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await appAPI.create(form);
      setShowModal(false);
      setForm({ name: '', description: '', max_devices: 1, heartbeat_interval: 60 });
      loadApps();
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败，请重试');
      console.error('创建应用失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除此应用？')) {
      await appAPI.delete(id);
      loadApps();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">应用管理</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600">
          <Plus className="w-5 h-5" /> 创建应用
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>暂无应用，点击"创建应用"添加</p>
        </div>
      ) : (
      <div className="grid gap-6">
        {apps.map(app => (
          <div key={app.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{app.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{app.description}</p>
              </div>
              <button onClick={() => handleDelete(app.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">App Key:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded">{app.app_key}</code>
                  <button onClick={() => copyToClipboard(app.app_key)} className="text-gray-400 hover:text-gray-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-gray-500">App Secret:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded">{app.app_secret.slice(0, 16)}...</code>
                  <button onClick={() => copyToClipboard(app.app_secret)} className="text-gray-400 hover:text-gray-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div><span className="text-gray-500">最大设备数:</span> {app.max_devices}</div>
              <div><span className="text-gray-500">心跳间隔:</span> {app.heartbeat_interval}秒</div>
            </div>
          </div>
        ))}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">创建应用</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">应用名称 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="输入应用名称" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="应用描述（可选）" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    最大设备数
                    <span className="text-gray-400 text-xs" title="单个卡密可同时绑定的设备数量">(?)</span>
                  </label>
                  <input type="number" min="1" value={form.max_devices} onChange={e => setForm({...form, max_devices: parseInt(e.target.value) || 1})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">单个卡密可绑定的设备数</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">心跳间隔(秒)</label>
                  <input type="number" min="10" value={form.heartbeat_interval} onChange={e => setForm({...form, heartbeat_interval: parseInt(e.target.value) || 60})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">建议60-120秒</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setError(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50" disabled={creating}>
                取消
              </button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
