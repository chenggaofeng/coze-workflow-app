## 项目执行计划

### 项目概述
开发一个基于 Cloudflare 生态的 Web 应用，核心功能是根据 D1 数据库的配置，动态渲染并调用扣子 (Coze.cn) 工作流。

### 测试工作流（已更新参数）
1. **爆款拆解** - workflow_id: `7596157604926193727`，参数: `input`
2. **爆款改写** - workflow_id: `7532436429864402987`，参数: `input`, `input1`

### 技术栈
- **前端**: Next.js (App Router), Tailwind CSS, Shadcn UI
- **后端/数据库**: Cloudflare Pages + Cloudflare Workers + Cloudflare D1
- **部署平台**: Cloudflare

---

### 执行步骤

#### 阶段 1: 基础设施搭建

**1. 创建 D1 数据库**
```bash
npx wrangler d1 create coze-workflow-db
```

**2. 初始化数据库表结构**（包含测试工作流数据）
```sql
-- users 表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    expired_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- invite_codes 表
CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    duration_hours INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (used_by) REFERENCES users(id)
);

-- workflows 表
CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coze_workflow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    input_params TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试工作流数据（已更新参数）
INSERT INTO workflows (coze_workflow_id, name, input_params, description) VALUES
('7596157604926193727', '爆款拆解', 'input', '自动拆解爆款视频内容'),
('7532436429864402987', '爆款改写', 'input,input1', '根据输入内容改写成爆款文案');
```

**3. 创建 wrangler.toml**
**4. 初始化 Next.js 项目**
**5. 安装依赖**

#### 阶段 2: 核心功能实现
- 用户系统（注册、登录、JWT鉴权）
- 动态工作流界面
- 安全转发 API

#### 阶段 3: 部署
- 本地测试: `npx wrangler pages dev`
- 部署: `npx wrangler pages deploy`

---

### 文件结构
```
coze-workflow-app/
├── app/
│   ├── api/auth/login/route.ts
│   ├── api/auth/register/route.ts
│   ├── api/workflow/list/route.ts
│   ├── api/workflow/execute/route.ts
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx
│   └── workflow/[id]/page.tsx
├── lib/db.ts, auth.ts, coze.ts
├── schema.sql
└── wrangler.toml
```