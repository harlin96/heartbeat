import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, RefreshCw } from 'lucide-react';
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

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    const res = await appAPI.list();
    setApps(res.data);
  };

  const handleCreate = async () => {
    await appAPI.create(form);
    setShowModal(false);
    setForm({ name: '', description: '', max_devices: 1, heartbeat_interval: 60 });
    loadApps();
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">创建应用</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">应用名称</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" placeholder="输入应用名称" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" placeholder="应用描述" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">最大设备数</label>
                  <input type="number" value={form.max_devices} onChange={e => setForm({...form, max_devices: parseInt(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">心跳间隔(秒)</label>
                  <input type="number" value={form.heartbeat_interval} onChange={e => setForm({...form, heartbeat_interval: parseInt(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
