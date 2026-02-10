// Cloudflare Pages Function - Main Entry
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // API Routes
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(request, env, url);
  }
  
  // Static assets - serve from KV or fallback
  return new Response('Coze Workflow App - Please deploy via Git integration for full functionality', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleAPI(request, env, url) {
  const path = url.pathname;
  
  // Auth routes
  if (path === '/api/auth/login') {
    return handleLogin(request, env);
  }
  if (path === '/api/auth/register') {
    return handleRegister(request, env);
  }
  
  // Workflow routes
  if (path === '/api/workflow/list') {
    return handleWorkflowList(request, env);
  }
  if (path === '/api/workflow/execute') {
    return handleWorkflowExecute(request, env);
  }
  
  return jsonResponse({ error: 'Not found' }, 404);
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  const { username, password } = await request.json();
  
  if (!username || !password) {
    return jsonResponse({ error: '用户名和密码不能为空' }, 400);
  }
  
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
    
  if (!user) {
    return jsonResponse({ error: '用户名或密码错误' }, 401);
  }
  
  // Simple password check (in production, use bcrypt)
  if (user.password_hash !== password) {
    return jsonResponse({ error: '用户名或密码错误' }, 401);
  }
  
  return jsonResponse({
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: user.id,
      username: user.username,
      expired_at: user.expired_at,
    }
  });
}

async function handleRegister(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  const { username, password } = await request.json();
  
  if (!username || !password) {
    return jsonResponse({ error: '用户名和密码不能为空' }, 400);
  }
  
  const existing = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
    
  if (existing) {
    return jsonResponse({ error: '用户名已存在' }, 409);
  }
  
  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 3);
  
  const result = await env.DB.prepare(
    'INSERT INTO users (username, password_hash, expired_at) VALUES (?, ?, ?)'
  ).bind(username, password, expiredAt.toISOString()).run();
  
  if (!result.success) {
    return jsonResponse({ error: '注册失败' }, 500);
  }
  
  const newUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  
  return jsonResponse({
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: newUser.id,
      username: newUser.username,
      expired_at: newUser.expired_at,
    }
  });
}

async function handleWorkflowList(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return jsonResponse({ error: '未授权' }, 401);
  }
  
  const workflows = await env.DB.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
  
  return jsonResponse({
    success: true,
    workflows: workflows.results,
  });
}

async function handleWorkflowExecute(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return jsonResponse({ error: '未授权' }, 401);
  }
  
  const { workflowId, parameters } = await request.json();
  
  const workflow = await env.DB.prepare('SELECT * FROM workflows WHERE id = ?')
    .bind(workflowId)
    .first();
    
  if (!workflow) {
    return jsonResponse({ error: '工作流不存在' }, 404);
  }
  
  // Call Coze API
  const cozeResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.COZE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflow.coze_workflow_id,
      parameters: parameters || {},
    }),
  });
  
  if (!cozeResponse.ok) {
    return jsonResponse({ error: '调用 Coze API 失败' }, 502);
  }
  
  const result = await cozeResponse.json();
  
  return jsonResponse({
    success: true,
    data: result,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
