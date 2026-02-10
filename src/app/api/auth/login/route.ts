import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';
import { getUserByUsername } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();
    const db = env.DB;

    // 查找用户
    const user = await getUserByUsername(db, username);
    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash as string);
    if (!isValid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成 JWT
    const token = await createToken({
      id: user.id as number,
      username: user.username as string,
      expired_at: user.expired_at as string,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        expired_at: user.expired_at,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
