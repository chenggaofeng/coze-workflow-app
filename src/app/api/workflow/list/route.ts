import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, isExpired } from '@/lib/auth';
import { getWorkflows } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
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

    // 获取工作流列表
    const workflows = await getWorkflows(db);

    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (error) {
    console.error('获取工作流列表错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
