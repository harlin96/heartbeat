import axios, { AxiosError } from 'axios';

// 错误消息映射
const ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有操作权限',
  404: '资源不存在',
  429: '请求过于频繁，请稍后再试',
  500: '服务器错误，请稍后再试',
  502: '网关错误，服务暂时不可用',
  503: '服务暂时不可用',
};

// API错误类
export class APIError extends Error {
  status: number;
  detail: string;
  
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// 获取友好的错误消息
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.detail;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (detail) return detail;
    if (status && ERROR_MESSAGES[status]) return ERROR_MESSAGES[status];
    if (error.message === 'Network Error') return '网络连接失败，请检查网络';
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || ERROR_MESSAGES[status || 0] || error.message;
    
    // 401处理
    if (status === 401) {
      localStorage.removeItem('token');
      // 避免重复跳转
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // 429速率限制 - 可以在UI中提示用户
    if (status === 429) {
      console.warn('请求被限流:', detail);
    }
    
    return Promise.reject(new APIError(status || 0, detail));
  }
);

export default api;

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

export const appAPI = {
  list: () => api.get('/applications'),
  create: (data: any) => api.post('/applications', data),
  update: (id: number, data: any) => api.put(`/applications/${id}`, data),
  delete: (id: number) => api.delete(`/applications/${id}`),
};

export const cardAPI = {
  list: (params?: any) => api.get('/cards', { params }),
  create: (data: any) => api.post('/cards', data),
  delete: (key: string) => api.delete(`/cards/${key}`),
};

export const agentAPI = {
  list: () => api.get('/agents'),
  create: (data: any) => api.post('/agents', data),
  recharge: (data: any) => api.post('/agents/recharge', data),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  recentHeartbeats: () => api.get('/dashboard/recent-heartbeats'),
  activeDevices: () => api.get('/dashboard/active-devices'),
};
