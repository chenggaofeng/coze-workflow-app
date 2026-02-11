'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Workflow {
  id: number;
  name: string;
  description: string;
  input_params: string;
  coze_workflow_id: string;
}

interface WorkflowClientProps {
  workflowId: string;
}

export default function WorkflowClient({ workflowId }: WorkflowClientProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchWorkflow(token);
  }, [router, workflowId]);

  const fetchWorkflow = async (token: string) => {
    try {
      // 从列表 API 获取工作流详情
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
        setError('获取工作流失败');
        return;
      }

      const data = await response.json() as { workflows: Workflow[] };
      const wf = data.workflows.find((w: Workflow) => w.id === parseInt(workflowId));

      if (!wf) {
        setError('工作流不存在');
        return;
      }

      setWorkflow(wf);

      // 初始化参数
      if (wf.input_params) {
        const paramsList = wf.input_params.split(',').filter((p: string) => p.trim());
        const initialParams: Record<string, string> = {};
        paramsList.forEach((param: string) => {
          initialParams[param.trim()] = '';
        });
        setParameters(initialParams);
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setExecuting(true);
    setError('');
    setResult('');

    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: workflowId,
          parameters,
        }),
      });

      const data = await response.json() as { error?: string; data?: { data?: string } };

      if (!response.ok) {
        setError(data.error || '执行失败');
        return;
      }

      // 处理 Coze API 返回结果
      if (data.data && data.data.data) {
        // 解析返回的 JSON 字符串
        try {
          const output = JSON.parse(data.data.data) as { output?: string };
          setResult(output.output || JSON.stringify(output, null, 2));
        } catch {
          setResult(data.data.data);
        }
      } else {
        setResult(JSON.stringify(data.data, null, 2));
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error || '工作流不存在'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← 返回首页
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{workflow.name}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/redeem"
              className="text-green-600 hover:text-green-800 font-medium"
            >
              兑换邀请码
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：工作流信息和参数输入 */}
          <div className="space-y-6">
            {/* 工作流描述 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">工作流描述</h2>
              <p className="text-gray-600">{workflow.description || '暂无描述'}</p>
            </div>

            {/* 参数输入 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">输入参数</h2>
              {Object.keys(parameters).length === 0 ? (
                <p className="text-gray-500">此工作流不需要输入参数</p>
              ) : (
                <div className="space-y-4">
                  {Object.keys(parameters).map((param) => (
                    <div key={param}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {param}
                      </label>
                      <input
                        type="text"
                        value={parameters[param]}
                        onChange={(e) =>
                          setParameters({ ...parameters, [param]: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`请输入 ${param}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={executing}
                className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? '执行中...' : '执行工作流'}
              </button>
            </div>
          </div>

          {/* 右侧：执行结果 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">执行结果</h2>
            {result ? (
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {result}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-12">
                点击"执行工作流"按钮查看结果
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
