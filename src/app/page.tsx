'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Workflow {
  id: number;
  name: string;
  description: string;
  input_params: string;
}

interface User {
  id: number;
  username: string;
  expired_at: string;
}

export default function HomePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    // 获取工作流列表
    fetchWorkflows(token);
  }, [router]);

  const fetchWorkflows = async (token: string) => {
    try {
      const response = await fetch('/api/workflow/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        const data = await response.json();
        setError(data.error || '获取工作流失败');
        return;
      }

      const data = await response.json();
      setWorkflows(data.workflows);
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isExpired = (expiredAt: string) => {
    return new Date(expiredAt) < new Date();
  };

  const formatExpiry = (expiredAt: string) => {
    const date = new Date(expiredAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return '已过期';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}小时${minutes}分钟`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Coze 工作流平台</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm">
                <span className="text-gray-600">用户: {user.username}</span>
                <span className="mx-2">|</span>
                <span className={isExpired(user.expired_at) ? 'text-red-600' : 'text-green-600'}>
                  {isExpired(user.expired_at) ? '已过期' : `剩余: ${formatExpiry(user.expired_at)}`}
                </span>
              </div>
            )}
            <Link
              href="/redeem"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              兑换邀请码
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
            {error}
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-800 mb-4">可用工作流</h2>

        {workflows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无可用工作流
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflow/${workflow.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {workflow.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {workflow.description || '暂无描述'}
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {workflow.input_params ? workflow.input_params.split(',').length : 0} 个参数
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
