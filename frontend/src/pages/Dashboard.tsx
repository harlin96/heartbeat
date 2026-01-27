import { useEffect, useState } from 'react';
import { AppWindow, CreditCard, Users, Laptop, DollarSign, Activity } from 'lucide-react';
import { dashboardAPI } from '../api';

interface Stats {
  total_users: number;
  total_apps: number;
  total_cards: number;
  used_cards: number;
  active_devices: number;
  total_revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentHeartbeats, setRecentHeartbeats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, heartbeatsRes] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.recentHeartbeats(),
      ]);
      setStats(statsRes.data);
      setRecentHeartbeats(heartbeatsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const statCards = [
    { label: '应用数量', value: stats?.total_apps || 0, icon: AppWindow, color: 'bg-blue-500' },
    { label: '卡密总数', value: stats?.total_cards || 0, icon: CreditCard, color: 'bg-green-500' },
    { label: '已使用卡密', value: stats?.used_cards || 0, icon: CreditCard, color: 'bg-yellow-500' },
    { label: '活跃设备', value: stats?.active_devices || 0, icon: Laptop, color: 'bg-purple-500' },
    { label: '用户数量', value: stats?.total_users || 0, icon: Users, color: 'bg-pink-500' },
    { label: '总收入', value: `¥${stats?.total_revenue || 0}`, icon: DollarSign, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">最近心跳记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="pb-3">设备ID</th>
                <th className="pb-3">IP地址</th>
                <th className="pb-3">状态</th>
                <th className="pb-3">消息</th>
                <th className="pb-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {recentHeartbeats.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="py-3 font-mono text-sm">{log.device_id?.slice(0, 16)}...</td>
                  <td className="py-3 text-sm">{log.ip_address}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.status === 'success' ? 'bg-green-100 text-green-600' :
                      log.status === 'expired' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-500">{log.message}</td>
                  <td className="py-3 text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
