import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, isExpired } from '@/lib/auth';
import { getWorkflowById, getUserByUsername, updateUserExpiry, getInviteCode, useInviteCode } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// 执行工作流
export async function POST(request: NextRequest) {
  try {
    // 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Token 无效' },
        { status: 401 }
      );
    }

    // 检查是否过期
    if (isExpired(user.expired_at)) {
      return NextResponse.json(
        { error: '账户已过期' },
        { status: 403 }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const { workflowId, parameters } = await request.json() as { workflowId: string; parameters?: Record<string, unknown> };

    if (!workflowId) {
      return NextResponse.json(
        { error: '工作流ID不能为空' },
        { status: 400 }
      );
    }

    // 获取工作流配置
    const workflow = await getWorkflowById(db, parseInt(workflowId));
    if (!workflow) {
      return NextResponse.json(
        { error: '工作流不存在' },
        { status: 404 }
      );
    }

    // 调用 Coze API
    const cozeApiKey = env.COZE_API_KEY;
    if (!cozeApiKey) {
      return NextResponse.json(
        { error: 'Coze API Key 未配置' },
        { status: 500 }
      );
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

    if (!cozeResponse.ok) {
      const errorData = await cozeResponse.text();
      console.error('Coze API 错误:', errorData);
      return NextResponse.json(
        { error: '调用 Coze API 失败' },
        { status: 502 }
      );
    }

    const result = await cozeResponse.json();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('执行工作流错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 使用邀请码续期
export async function PUT(request: NextRequest) {
  try {
    // 验证 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Token 无效' },
        { status: 401 }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      );
    }

    // 查找邀请码
    const inviteCode = await getInviteCode(db, code);
    if (!inviteCode) {
      return NextResponse.json(
        { error: '邀请码无效或已被使用' },
        { status: 400 }
      );
    }

    // 计算新的过期时间
    const currentExpiredAt = new Date(user.expired_at);
    const now = new Date();
    const baseTime = currentExpiredAt > now ? currentExpiredAt : now;
    baseTime.setHours(baseTime.getHours() + (inviteCode.duration_hours as number));

    // 更新用户过期时间
    await updateUserExpiry(db, user.id, baseTime.toISOString());

    // 标记邀请码已使用
    await useInviteCode(db, inviteCode.id as number, user.id);

    return NextResponse.json({
      success: true,
      message: `有效期已延长 ${inviteCode.duration_hours} 小时`,
      new_expired_at: baseTime.toISOString(),
    });
  } catch (error) {
    console.error('使用邀请码错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
