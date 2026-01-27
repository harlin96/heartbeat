import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Search } from 'lucide-react';
import { cardAPI, appAPI } from '../api';

const CARD_TYPES = [
  { value: 'day', label: '天卡', days: 1 },
  { value: 'week', label: '周卡', days: 7 },
  { value: 'month', label: '月卡', days: 30 },
  { value: 'year', label: '年卡', days: 365 },
  { value: 'permanent', label: '永久卡', days: 36500 },
];

export default function Cards() {
  const [cards, setCards] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ application_id: '', is_used: '' });
  const [form, setForm] = useState({ card_type: 'month', application_id: 0, count: 10, price: 0 });

  useEffect(() => {
    loadCards();
    loadApps();
  }, []);

  const loadCards = async () => {
    const params: any = {};
    if (filter.application_id) params.application_id = filter.application_id;
    if (filter.is_used !== '') params.is_used = filter.is_used === 'true';
    const res = await cardAPI.list(params);
    setCards(res.data);
  };

  const loadApps = async () => {
    const res = await appAPI.list();
    setApps(res.data);
    if (res.data.length > 0) setForm(f => ({ ...f, application_id: res.data[0].id }));
  };

  const handleCreate = async () => {
    await cardAPI.create(form);
    setShowModal(false);
    loadCards();
  };

  const handleDelete = async (key: string) => {
    if (confirm('确定删除此卡密？')) {
      await cardAPI.delete(key);
      loadCards();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllUnused = () => {
    const unused = cards.filter(c => !c.is_used).map(c => c.card_key).join('\n');
    navigator.clipboard.writeText(unused);
    alert(`已复制 ${cards.filter(c => !c.is_used).length} 个未使用卡密`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">卡密管理</h1>
        <div className="flex gap-3">
          <button onClick={copyAllUnused} className="border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50">
            <Copy className="w-5 h-5" /> 复制未使用
          </button>
          <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600">
            <Plus className="w-5 h-5" /> 生成卡密
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-4">
        <select value={filter.application_id} onChange={e => setFilter({...filter, application_id: e.target.value})}
          className="border rounded-lg px-3 py-2">
          <option value="">全部应用</option>
          {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
        </select>
        <select value={filter.is_used} onChange={e => setFilter({...filter, is_used: e.target.value})}
          className="border rounded-lg px-3 py-2">
          <option value="">全部状态</option>
          <option value="false">未使用</option>
          <option value="true">已使用</option>
        </select>
        <button onClick={loadCards} className="bg-gray-100 px-4 py-2 rounded-lg flex items-center gap-2">
          <Search className="w-5 h-5" /> 搜索
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">卡密</th>
              <th className="text-left px-4 py-3">类型</th>
              <th className="text-left px-4 py-3">天数</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">到期时间</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-sm">{card.card_key}</code>
                    <button onClick={() => copyToClipboard(card.card_key)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">{CARD_TYPES.find(t => t.value === card.card_type)?.label}</td>
                <td className="px-4 py-3">{card.duration_days}天</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${card.is_used ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
                    {card.is_used ? '已使用' : '未使用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {card.expires_at ? new Date(card.expires_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3">
                  {!card.is_used && (
                    <button onClick={() => handleDelete(card.card_key)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">生成卡密</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">选择应用</label>
                <select value={form.application_id} onChange={e => setForm({...form, application_id: parseInt(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2">
                  {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">卡密类型</label>
                <select value={form.card_type} onChange={e => setForm({...form, card_type: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2">
                  {CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.days}天)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">生成数量</label>
                  <input type="number" value={form.count} onChange={e => setForm({...form, count: parseInt(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2" min="1" max="100" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">单价</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2" min="0" step="0.01" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg">生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
