import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminUser } from '@/lib/admin';
import { createInviteCode } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
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

    const { durationHours, count } = await request.json() as { durationHours?: number; count?: number };

    const hours = durationHours || 3;
    const numCodes = count || 1;

    const codes: string[] = [];
    for (let i = 0; i < numCodes; i++) {
      const code = generateInviteCode();
      const result = await createInviteCode(db, code, hours);
      if (result.success) {
        codes.push(code);
      }
    }

    return NextResponse.json({
      success: true,
      codes,
      durationHours: hours,
      count: codes.length,
    });
  } catch (error) {
    console.error('创建邀请码错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
