import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminUser } from '@/lib/admin';
import { getAllInviteCodes } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const ctx: any = getRequestContext();
    const db = ctx.env ? ctx.env.DB : undefined;
    const secret = ctx.env?.JWT_SECRET;

    if (!db) {
      return NextResponse.json(
        { error: '数据库连接不可用' },
        { status: 500 }
      );
    }

    const adminUser = await verifyAdminUser(token, db, secret);
    if (!adminUser) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const inviteCodes = await getAllInviteCodes(db);

    return NextResponse.json({
      success: true,
      inviteCodes,
    });
  } catch (error) {
    console.error('获取邀请码列表错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
