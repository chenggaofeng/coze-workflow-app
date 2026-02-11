import { verifyToken, isExpired } from './lib/auth';
import { getUserByUsername, createUser, getUserByUsername as getUserByUsernameDB, updateUserExpiry, getInviteCode, useInviteCode, getWorkflowById, getWorkflows } from './lib/db';
import bcrypt from 'bcryptjs';

export interface Env {
  DB: D1Database;
  COZE_API_KEY?: string;
  JWT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // OPTIONS 请求处理
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由处理
    if (path === '/api/auth/login') {
      return handleLogin(request, env);
    } else if (path === '/api/auth/register') {
      return handleRegister(request, env);
    } else if (path === '/api/workflow/execute') {
      return handleWorkflowExecute(request, env);
    } else if (path === '/api/workflow/list') {
      return handleWorkflowList(request, env);
    } else if (path === '/api/invite/redeem') {
      return handleInviteRedeem(request, env);
    } else {
      return new Response(JSON.stringify({ error: '未找到路由' }), {
        status: 404,
        headers: corsHeaders,
      });
    }
  },
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405 });
  }

  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { status: 400 });
  }

  const user = await getUserByUsername(env.DB, username);
  if (!user) {
    return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash as string);
  if (!isValid) {
    return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 });
  }

  const { createToken } = await import('./lib/auth');
  const token = await createToken({
    id: user.id as number,
    username: user.username as string,
    expired_at: user.expired_at as string,
  });

  return new Response(JSON.stringify({ success: true, token }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405 });
  }

  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { status: 400 });
  }

  const existingUser = await getUserByUsername(env.DB, username);
  if (existingUser) {
    return new Response(JSON.stringify({ error: '用户名已存在' }), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 3);

  const result = await createUser(env.DB, username, passwordHash, expiredAt.toISOString());

  if (!result.success) {
    return new Response(JSON.stringify({ error: '注册失败' }), { status: 500 });
  }

  const newUser = await getUserByUsername(env.DB, username);

  const { createToken } = await import('./lib/auth');
  const token = await createToken({
    id: newUser!.id as number,
    username: newUser!.username as string,
    expired_at: newUser!.expired_at as string,
  });

  return new Response(JSON.stringify({ success: true, token }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleWorkflowExecute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401 });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401 });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403 });
  }

  const { workflowId, parameters } = await request.json() as { workflowId: string; parameters?: Record<string, unknown> };

  if (!workflowId) {
    return new Response(JSON.stringify({ error: '工作流ID不能为空' }), { status: 400 });
  }

  const workflow = await getWorkflowById(env.DB, parseInt(workflowId));
  if (!workflow) {
    return new Response(JSON.stringify({ error: '工作流不存在' }), { status: 404 });
  }

  const cozeApiKey = env.COZE_API_KEY;
  if (!cozeApiKey) {
    return new Response(JSON.stringify({ error: 'Coze API Key 未配置' }), { status: 500 });
  }

  const cozeResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cozeApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflow.coze_workflow_id,
      parameters: parameters || {},
    }),
  });

  const result = await cozeResponse.json();

  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleWorkflowList(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401 });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401 });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403 });
  }

  const workflows = await getWorkflows(env.DB);

  return new Response(JSON.stringify({ success: true, workflows }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleInviteRedeem(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401 });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401 });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403 });
  }

  const { code } = await request.json() as { code: string };

  if (!code) {
    return new Response(JSON.stringify({ error: '邀请码不能为空' }), { status: 400 });
  }

  const inviteCode = await getInviteCode(env.DB, code);
  if (!inviteCode) {
    return new Response(JSON.stringify({ error: '邀请码无效' }), { status: 404 });
  }

  if (inviteCode.used) {
    return new Response(JSON.stringify({ error: '邀请码已使用' }), { status: 409 });
  }

  const result = await useInviteCode(env.DB, code, user.id as number);

  if (!result.success) {
    return new Response(JSON.stringify({ error: '兑换失败' }), { status: 500 });
  }

  await updateUserExpiry(env.DB, user.id as number);

  return new Response(JSON.stringify({ success: true, message: '兑换成功' }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
