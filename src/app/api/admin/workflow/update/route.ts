import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminUser } from '@/lib/admin';
import { updateWorkflow } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function PUT(request: NextRequest) {
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

    const { id, name, description, cozeWorkflowId, inputParams } = await request.json() as {
      id: number;
      name: string;
      description: string;
      cozeWorkflowId: string;
      inputParams: string;
    };

    if (!id || !name || !cozeWorkflowId) {
      return NextResponse.json(
        { error: '工作流 ID、名称和 Coze 工作流 ID 不能为空' },
        { status: 400 }
      );
    }

    const result = await updateWorkflow(db, id, name, description || '', cozeWorkflowId, inputParams || '');

    if (!result.success) {
      return NextResponse.json(
        { error: '更新工作流失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '工作流更新成功',
    });
  } catch (error) {
    console.error('更新工作流错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
