# 部署计划

## 部署步骤

### 1. 构建 Next.js 项目
- 运行 `npm run pages:build` 构建项目
- 生成静态文件到 .vercel/output/static

### 2. 部署到 Cloudflare Pages
- 运行 `npx wrangler pages deploy` 部署前端
- 获得 Pages 在线网址

### 3. 部署 Workers（后端 API）
- 运行 `npm run worker:deploy` 部署后端
- 更新 Workers 在线网址

### 4. 同步数据库到远程
- 执行 `npx wrangler d1 execute coze-workflow-db --file=init.sql --remote`
- 执行 `npx wrangler d1 execute coze-workflow-db --file=create_admin.sql --remote`

## 预期结果
- 获得完整的在线访问网址（包含前端页面）
- 后端 API 正常工作
- 数据库包含管理员账号和示例邀请码