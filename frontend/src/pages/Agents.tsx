import { useEffect, useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { agentAPI } from '../api';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [createForm, setCreateForm] = useState({ username: '', password: '', discount: 1.0 });
  const [rechargeForm, setRechargeForm] = useState({ amount: 0, remark: '' });

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
    await agentAPI.create(createForm);
    setShowCreateModal(false);
    setCreateForm({ username: '', password: '', discount: 1.0 });
    loadAgents();
  };

  const handleRecharge = async () => {
    await agentAPI.recharge({ user_id: selectedAgent.id, ...rechargeForm });
    setShowRechargeModal(false);
    setRechargeForm({ amount: 0, remark: '' });
    loadAgents();
  };

  const openRecharge = (agent: any) => {
    setSelectedAgent(agent);
    setShowRechargeModal(true);
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
              <th className="text-left px-4 py-3">用户名</th>
              <th className="text-left px-4 py-3">余额</th>
              <th className="text-left px-4 py-3">折扣率</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">创建时间</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id} className="border-t">
                <td className="px-4 py-3 font-medium">{agent.username}</td>
                <td className="px-4 py-3">¥{agent.balance.toFixed(2)}</td>
                <td className="px-4 py-3">{(agent.discount * 100).toFixed(0)}%</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${agent.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {agent.is_active ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(agent.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openRecharge(agent)} className="text-blue-500 hover:bg-blue-50 p-2 rounded flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> 充值
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">添加代理</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input type="text" value={createForm.username} onChange={e => setCreateForm({...createForm, username: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密码</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">折扣率 (0-1)</label>
                <input type="number" value={createForm.discount} onChange={e => setCreateForm({...createForm, discount: parseFloat(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2" min="0" max="1" step="0.1" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg">创建</button>
            </div>
          </div>
        </div>
      )}

      {showRechargeModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">给 {selectedAgent.username} 充值</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">当前余额</label>
                <div className="text-2xl font-bold text-green-600">¥{selectedAgent.balance.toFixed(2)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">充值金额</label>
                <input type="number" value={rechargeForm.amount} onChange={e => setRechargeForm({...rechargeForm, amount: parseFloat(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">备注</label>
                <input type="text" value={rechargeForm.remark} onChange={e => setRechargeForm({...rechargeForm, remark: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRechargeModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleRecharge} className="px-4 py-2 bg-blue-500 text-white rounded-lg">充值</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
