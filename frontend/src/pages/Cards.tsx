import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Search, Download, ChevronLeft, ChevronRight, Loader2, FileX } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState({ application_id: '', is_used: '', keyword: '' });
  const [form, setForm] = useState({ card_type: 'month', application_id: 0, count: 10 });
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false
  });

  useEffect(() => {
    loadApps();
  }, []);
  
  useEffect(() => {
    loadCards();
  }, [pagination.page]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, page_size: pagination.page_size };
      if (filter.application_id) params.application_id = filter.application_id;
      if (filter.is_used !== '') params.is_used = filter.is_used === 'true';
      if (filter.keyword) params.keyword = filter.keyword;
      const res = await cardAPI.list(params);
      setCards(res.data.items || []);
      setPagination(p => ({ ...p, ...res.data, page: res.data.page }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadApps = async () => {
    try {
      const res = await appAPI.list();
      setApps(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, application_id: res.data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await cardAPI.create(form);
      setShowModal(false);
      setPagination(p => ({ ...p, page: 1 }));
      loadCards();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };
  
  const handleSearch = () => {
    setPagination(p => ({ ...p, page: 1 }));
    loadCards();
  };
  
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filter.application_id) params.append('application_id', filter.application_id);
    if (filter.is_used !== '') params.append('is_used', filter.is_used);
    window.open(`/api/cards/export/csv?${params.toString()}`, '_blank');
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

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <input 
          type="text" 
          placeholder="搜索卡密..." 
          value={filter.keyword} 
          onChange={e => setFilter({...filter, keyword: e.target.value})}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="border rounded-lg px-3 py-2 w-48"
        />
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
        <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600">
          <Search className="w-5 h-5" /> 搜索
        </button>
        <button onClick={handleExport} className="border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50">
          <Download className="w-5 h-5" /> 导出CSV
        </button>
        <div className="ml-auto text-sm text-gray-500">
          共 {pagination.total} 条记录
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileX className="w-16 h-16 mb-4" />
            <p className="text-lg">暂无卡密数据</p>
            <p className="text-sm">点击"生成卡密"创建新卡密</p>
          </div>
        ) : (
          <>
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
                  <tr key={card.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{card.card_key}</code>
                        <button onClick={() => copyToClipboard(card.card_key)} className="text-gray-400 hover:text-blue-500" title="复制">
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
                        <button onClick={() => handleDelete(card.card_key)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                第 {pagination.page} / {pagination.total_pages} 页
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={!pagination.has_prev}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={!pagination.has_next}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
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
              <div>
                <label className="block text-sm font-medium mb-1">生成数量</label>
                <input type="number" value={form.count} onChange={e => setForm({...form, count: parseInt(e.target.value) || 1})}
                  className="w-full border rounded-lg px-3 py-2" min="1" max="100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50" disabled={creating}>取消</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
