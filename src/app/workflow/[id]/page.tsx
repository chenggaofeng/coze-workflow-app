import WorkflowClient from './WorkflowClient';

// 生成静态参数 - 预渲染常见的工作流ID
export function generateStaticParams() {
  // 预渲染 ID 1-10 的工作流页面
  return Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
  }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: PageProps) {
  const { id } = await params;
  return <WorkflowClient workflowId={id} />;
}
