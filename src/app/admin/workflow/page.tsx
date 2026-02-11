'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Workflow {
  id: number;
  name: string;
  description: string;
  coze_workflow_id: string;
  input_params: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  expired_at: string;
  role?: string;
}

export default function AdminWorkflowPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cozeWorkflowId: '',
    inputParams: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.role !== 'admin') {
        router.push('/');
        return;
      }
    }

    fetchWorkflows(token);
  }, [router]);

  const fetchWorkflows = async (token: string) => {
    try {
      const response = await fetch('/api/admin/workflow/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }
        const errorData = await response.json() as { error?: string };
        setError(errorData.error || '获取工作流失败');
        return;
      }

      const data = await response.json() as { workflows: Workflow[] };
      setWorkflows(data.workflows);
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/workflow/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) {
        setError(data.error || '创建工作流失败');
        return;
      }

      setSuccess('工作流创建成功');
      setFormData({ name: '', description: '', cozeWorkflowId: '', inputParams: '' });
      fetchWorkflows(token);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    if (!token || !editingWorkflow) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/workflow/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingWorkflow.id,
          ...formData,
        }),
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) {
        setError(data.error || '更新工作流失败');
        return;
      }

      setSuccess('工作流更新成功');
      setEditingWorkflow(null);
      setFormData({ name: '', description: '', cozeWorkflowId: '', inputParams: '' });
      fetchWorkflows(token);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!confirm('确定要删除这个工作流吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/workflow/delete?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json() as { error?: string };

      if (!response.ok) {
        setError(data.error || '删除工作流失败');
        return;
      }

      setSuccess('工作流删除成功');
      fetchWorkflows(token);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      cozeWorkflowId: workflow.coze_workflow_id,
      inputParams: workflow.input_params,
    });
  };

  const handleCancel = () => {
    setEditingWorkflow(null);
    setFormData({ name: '', description: '', cozeWorkflowId: '', inputParams: '' });
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            ← 返回
          </Link>
          <h1 className="text-xl font-bold text-gray-800">工作流管理</h1>
          <Link
            href="/admin/invite"
            className="ml-auto text-sm text-blue-600 hover:text-blue-800"
          >
            邀请码管理
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded mb-6">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {editingWorkflow ? '编辑工作流' : '添加工作流'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工作流名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入工作流名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="请输入工作流描述"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coze 工作流 ID *
              </label>
              <input
                type="text"
                value={formData.cozeWorkflowId}
                onChange={(e) => setFormData({ ...formData, cozeWorkflowId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入 Coze 平台的工作流 ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                输入参数（用逗号分隔）
              </label>
              <input
                type="text"
                value={formData.inputParams}
                onChange={(e) => setFormData({ ...formData, inputParams: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: param1, param2, param3"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={editingWorkflow ? handleUpdate : handleCreate}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {saving ? '保存中...' : editingWorkflow ? '更新' : '添加'}
              </button>
              {editingWorkflow && (
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">工作流列表</h2>
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无工作流
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {workflow.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {workflow.description || '暂无描述'}
                      </p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          <span className="font-medium">Coze ID:</span> {workflow.coze_workflow_id}
                        </p>
                        {workflow.input_params && (
                          <p>
                            <span className="font-medium">参数:</span> {workflow.input_params}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">创建时间:</span>{' '}
                          {new Date(workflow.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(workflow)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
