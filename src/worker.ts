import { verifyToken, isExpired } from './lib/auth';
import { getUserByUsername, createUser, getUserByUsername as getUserByUsernameDB, updateUserExpiry, getInviteCode, useInviteCode, getWorkflowById, getWorkflows } from './lib/db';
import bcrypt from 'bcryptjs';

export interface Env {
  DB: D1Database;
  COZE_API_KEY?: string;
  JWT_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // OPTIONS 请求处理
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由处理
    if (path === '/') {
      return new Response(getRootPage(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders,
        },
      });
    } else if (path === '/api/auth/login') {
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
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: corsHeaders });
  }

  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { status: 400, headers: corsHeaders });
  }

  const user = await getUserByUsername(env.DB, username);
  if (!user) {
    return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: corsHeaders });
  }

  const isValid = await bcrypt.compare(password, user.password_hash as string);
  if (!isValid) {
    return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: corsHeaders });
  }

  const { createToken } = await import('./lib/auth');
  const token = await createToken({
    id: user.id as number,
    username: user.username as string,
    expired_at: user.expired_at as string,
  }, env.JWT_SECRET);

  return new Response(JSON.stringify({ success: true, token }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: corsHeaders });
  }

  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), { status: 400, headers: corsHeaders });
  }

  const existingUser = await getUserByUsername(env.DB, username);
  if (existingUser) {
    return new Response(JSON.stringify({ error: '用户名已存在' }), { status: 409, headers: corsHeaders });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 3);

  const result = await createUser(env.DB, username, passwordHash, expiredAt.toISOString());

  if (!result.success) {
    return new Response(JSON.stringify({ error: '注册失败' }), { status: 500, headers: corsHeaders });
  }

  const newUser = await getUserByUsername(env.DB, username);

  const { createToken } = await import('./lib/auth');
  const token = await createToken({
    id: newUser!.id as number,
    username: newUser!.username as string,
    expired_at: newUser!.expired_at as string,
  }, env.JWT_SECRET);

  return new Response(JSON.stringify({ success: true, token }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function handleWorkflowExecute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: corsHeaders });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token, env.JWT_SECRET);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401, headers: corsHeaders });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403, headers: corsHeaders });
  }

  const { workflowId, parameters } = await request.json() as { workflowId: string; parameters?: Record<string, unknown> };

  if (!workflowId) {
    return new Response(JSON.stringify({ error: '工作流ID不能为空' }), { status: 400, headers: corsHeaders });
  }

  const workflow = await getWorkflowById(env.DB, parseInt(workflowId));
  if (!workflow) {
    return new Response(JSON.stringify({ error: '工作流不存在' }), { status: 404, headers: corsHeaders });
  }

  const cozeApiKey = env.COZE_API_KEY;
  if (!cozeApiKey) {
    return new Response(JSON.stringify({ error: 'Coze API Key 未配置' }), { status: 500, headers: corsHeaders });
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
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: corsHeaders });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token, env.JWT_SECRET);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401, headers: corsHeaders });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403, headers: corsHeaders });
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
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: corsHeaders });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token, env.JWT_SECRET);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Token 无效' }), { status: 401, headers: corsHeaders });
  }

  if (isExpired(user.expired_at)) {
    return new Response(JSON.stringify({ error: '账户已过期' }), { status: 403, headers: corsHeaders });
  }

  const { code } = await request.json() as { code: string };

  if (!code) {
    return new Response(JSON.stringify({ error: '邀请码不能为空' }), { status: 400, headers: corsHeaders });
  }

  const inviteCode = await getInviteCode(env.DB, code);
  if (!inviteCode) {
    return new Response(JSON.stringify({ error: '邀请码无效' }), { status: 404, headers: corsHeaders });
  }

  if (inviteCode.used) {
    return new Response(JSON.stringify({ error: '邀请码已使用' }), { status: 409, headers: corsHeaders });
  }

  const result = await useInviteCode(env.DB, code, user.id as number);

  if (!result.success) {
    return new Response(JSON.stringify({ error: '兑换失败' }), { status: 500, headers: corsHeaders });
  }

  await updateUserExpiry(env.DB, user.id as number);

  return new Response(JSON.stringify({ success: true, message: '兑换成功' }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function getRootPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coze 工作流 API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 30px;
    }
    .endpoint {
      background: white;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      margin-right: 10px;
    }
    .get { background: #22c55e; color: white; }
    .post { background: #3b82f6; color: white; }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>Coze 工作流 API</h1>
  <p>欢迎使用 Coze 工作流 API。以下是可用的 API 端点：</p>

  <h2>认证端点</h2>
  
  <div class="endpoint">
    <span class="method post">POST</span>
    <strong>/api/auth/register</strong>
    <p>用户注册</p>
    <pre>{
  "username": "string",
  "password": "string"
}</pre>
  </div>

  <div class="endpoint">
    <span class="method post">POST</span>
    <strong>/api/auth/login</strong>
    <p>用户登录，返回 JWT token</p>
    <pre>{
  "username": "string",
  "password": "string"
}</pre>
  <p>响应：<code>{"success": true, "token": "jwt_token"}</code></p>
  </div>

  <h2>工作流端点</h2>
  
  <div class="endpoint">
    <span class="method get">GET</span>
    <strong>/api/workflow/list</strong>
    <p>获取工作流列表（需要认证）</p>
    <p>请求头：<code>Authorization: Bearer {token}</code></p>
  </div>

  <div class="endpoint">
    <span class="method post">POST</span>
    <strong>/api/workflow/execute</strong>
    <p>执行工作流（需要认证）</p>
    <p>请求头：<code>Authorization: Bearer {token}</code></p>
    <pre>{
  "workflowId": "number",
  "parameters": {}
}</pre>
  </div>

  <h2>邀请码端点</h2>
  
  <div class="endpoint">
    <span class="method post">POST</span>
    <strong>/api/invite/redeem</strong>
    <p>兑换邀请码（需要认证）</p>
    <p>请求头：<code>Authorization: Bearer {token}</code></p>
    <pre>{
  "code": "string"
}</pre>
  </div>

  <h2>使用示例</h2>
  <pre>
// 1. 注册用户
POST /api/auth/register
{
  "username": "testuser",
  "password": "password123"
}

// 2. 登录获取 token
POST /api/auth/login
{
  "username": "testuser",
  "password": "password123"
}
// 返回: {"success": true, "token": "eyJhbGc..."}

// 3. 使用 token 访问其他 API
GET /api/workflow/list
Headers: Authorization: Bearer eyJhbGc...
  </pre>

  <p style="margin-top: 30px; color: #666;">
    <small>注意：所有请求都需要设置 CORS 头。在生产环境中，请将 JWT_SECRET 替换为安全的密钥。</small>
  </p>
</body>
</html>`;
}
