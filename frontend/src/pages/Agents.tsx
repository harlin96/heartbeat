import { useEffect, useState } from 'react';
import { Plus, UserX, UserCheck } from 'lucide-react';
import { agentAPI } from '../api';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    try {
      const res = await agentAPI.list();
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    try {
      setError('');
      await agentAPI.create(createForm);
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '' });
      loadAgents();
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败');
    }
  };

  const toggleStatus = async (agent: any) => {
    try {
      await agentAPI.toggleStatus(agent.id, !agent.is_active);
      loadAgents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">代理管理</h1>
        <button onClick={() => setShowCreateModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600">
          <Plus className="w-5 h-5" /> 添加代理
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">用户名</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">创建时间</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id} className="border-t">
                <td className="px-4 py-3 text-gray-500">{agent.id}</td>
                <td className="px-4 py-3 font-medium">{agent.username}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${agent.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {agent.is_active ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(agent.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleStatus(agent)} className={`p-2 rounded flex items-center gap-1 ${agent.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}>
                    {agent.is_active ? <><UserX className="w-4 h-4" /> 禁用</> : <><UserCheck className="w-4 h-4" /> 启用</>}
                  </button>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">暂无代理</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">添加代理</h2>
            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded mb-4">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input type="text" value={createForm.username} onChange={e => setCreateForm({...createForm, username: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" placeholder="请输入用户名" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密码</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" placeholder="请输入密码" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowCreateModal(false); setError(''); }} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
