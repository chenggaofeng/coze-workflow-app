import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';
import { createUser, getUserByUsername } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json() as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const ctx: any = getRequestContext();
    const db = ctx.env ? ctx.env.DB : undefined;
    
    if (!db) {
      return NextResponse.json(
        { error: '数据库连接不可用' },
        { status: 500 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await getUserByUsername(db, username);
    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 计算过期时间（当前时间 + 3小时）
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 3);

    // 创建用户
    const result = await createUser(db, username, passwordHash, expiredAt.toISOString());
    
    if (!result.success) {
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    // 获取新创建的用户
    const newUser = await getUserByUsername(db, username);
    if (!newUser) {
      return NextResponse.json(
        { error: '用户创建失败' },
        { status: 500 }
      );
    }

    // 生成 JWT
    const token = await createToken({
      id: newUser.id as number,
      username: newUser.username as string,
      expired_at: newUser.expired_at as string,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        expired_at: newUser.expired_at,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
