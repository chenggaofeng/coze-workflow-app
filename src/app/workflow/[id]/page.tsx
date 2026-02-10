'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Workflow {
  id: number;
  name: string;
  description: string;
  input_params: string;
  coze_workflow_id: string;
}

export default function WorkflowPage() {
  const params = useParams();
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
  }, [router, params.id]);

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

      const data = await response.json();
      const wf = data.workflows.find((w: Workflow) => w.id === parseInt(params.id as string));
      
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
          workflowId: params.id,
          parameters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '执行失败');
        return;
      }

      // 处理 Coze API 返回结果
      if (data.data && data.data.data) {
        // 解析返回的 JSON 字符串
        try {
          const output = JSON.parse(data.data.data);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            ← 返回
          </Link>
          <h1 className="text-xl font-bold text-gray-800">{workflow.name}</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-6">
            {workflow.description || '暂无描述'}
          </p>

          {/* 参数输入 */}
          {Object.keys(parameters).length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">输入参数</h3>
              {Object.keys(parameters).map((paramName) => (
                <div key={paramName}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {paramName}
                  </label>
                  <textarea
                    value={parameters[paramName]}
                    onChange={(e) => setParameters({ ...parameters, [paramName]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder={`请输入 ${paramName}...`}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={executing}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 font-medium"
          >
            {executing ? '执行中...' : '执行工作流'}
          </button>
        </div>

        {/* 执行结果 */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">执行结果</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {result}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
