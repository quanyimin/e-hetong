# 数据隔离鉴权测试

## 概述

跨租户数据隔离是系统的核心安全防线。本测试套件模拟不同用户在不同租户下的 HTTP 请求，验证每条 API 是否正确执行鉴权检查，防止越权访问。

## 运行方式

### 前置条件

1. 开发服务器已启动（`npm run dev`）
2. 种子数据已填充（`npm run db:seed`，或 `prisma db seed`）
3. SQLite 数据库文件存在

### 命令

```bash
# 方式一：通过 package.json 脚本运行
npm run test:auth-isolation

# 方式二：直接使用 ts-node
npx ts-node --transpile-only scripts/test-auth-isolation.ts

# 方式三：CI 全流程（含数据库初始化）
npm run test
```

### 预期结果

```text
▶ INFO 数据隔离鉴权测试
✓ PASS A1: demo → 我的房产 /contracts [HTTP 200]
✓ PASS ...
▶ INFO 总计: 17 | 通过: 17 | 失败: 0
```

退出码 `0` 表示全部通过，`1` 表示有用例失败。

---

## 测试场景矩阵

测试覆盖 **5 组场景、17 个用例**，涵盖不同的用户身份、租户权限和 API 端点组合。

### A 组：合法访问（OWNER → 自己的租户）

| ID | 请求方 | 目标租户 | API | 预期 | 说明 |
|----|--------|---------|-----|------|------|
| A1 | demo (OWNER) | 我的房产 | `GET /api/contracts` | 200 | OWNER 访问自己有权限的租户 |
| A2 | demo (OWNER) | 七嗦米粉总店 | `GET /api/contracts` | 200 | 同一用户访问另一个有权限的租户 |
| A3 | demo (OWNER) | 我的房产 | `GET /api/ledger` | 200 | 台账 API |
| A4 | demo (OWNER) | 我的房产 | `GET /api/dashboard/stats` | 200 | 仪表盘 API |
| A5 | demo (OWNER) | 我的房产 | `GET /api/reminders` | 200 | 提醒 API |

### B 组：越权访问（STAFF → 不属于自己的租户）

| ID | 请求方 | 目标租户 | API | 预期 | 说明 |
|----|--------|---------|-----|------|------|
| B1 | test (STAFF) | 我的房产 | `GET /api/contracts` | 403 | test 仅属于七嗦米粉总店 |
| B2 | test (STAFF) | 我的房产 | `GET /api/ledger` | 403 | 台账越权 |
| B3 | test (STAFF) | 我的房产 | `GET /api/dashboard/stats` | 403 | 仪表盘越权 |
| B4 | test (STAFF) | 我的房产 | `GET /api/reminders` | 403 | 提醒越权 |

### C 组：合法访问（STAFF → 自己的租户）

| ID | 请求方 | 目标租户 | API | 预期 | 说明 |
|----|--------|---------|-----|------|------|
| C1 | test (STAFF) | 七嗦米粉总店 | `GET /api/contracts` | 200 | test 用户有权访问七嗦米粉总店 |
| C2 | test (STAFF) | 七嗦米粉总店 | `GET /api/ledger` | 200 | 台账 |
| C3 | test (STAFF) | 七嗦米粉总店 | `GET /api/dashboard/stats` | 200 | 仪表盘 |
| C4 | test (STAFF) | 七嗦米粉总店 | `GET /api/reminders` | 200 | 提醒 |

### D 组：行业场景 API 越权

| ID | 请求方 | 目标租户 | API | 预期 | 说明 |
|----|--------|---------|-----|------|------|
| D1 | test (STAFF) | 我的房产 | `GET /api/scenes/landlord/stats` | 403 | 场景 API 同样受 auth 保护 |
| D2 | test (STAFF) | 我的房产 | `GET /api/scenes/landlord/bills` | 403 | 场景 API 同样受 auth 保护 |

### E 组：伪造 / 未登录

| ID | 请求方 | 目标租户 | API | 预期 | 说明 |
|----|--------|---------|-----|------|------|
| E1 | fake user | 我的房产 | `GET /api/contracts` | 401/403 | 伪造 cookie → 查库后返回 403 |
| E2 | no cookie | 我的房产 | `GET /api/contracts` | 401 | 未登录直接拒绝 |

---

## 测试用户

| 用户 | 邮箱 | 所属租户 | 角色 | 说明 |
|------|------|---------|------|------|
| demo | demo@e-hetong.com | 我的房产 / 七嗦米粉总店 | OWNER | 种子数据已有，双租户管理员 |
| test | tester@e-hetong.com | 七嗦米粉总店 | STAFF | 测试脚本自动创建，仅一个租户 |

> 测试脚本在首次运行时会自动创建 `tester@e-hetong.com`，并将其从「我的房产」租户中移除。已有数据不受影响。

---

## 项目结构

```text
e-hetong/
├── scripts/
│   ├── test-auth-isolation.ts    ← 主测试脚本
│   └── TEST_AUTH_ISOLATION.md    ← 本文档
├── .github/
│   └── workflows/
│       └── auth-isolation.yml    ← CI/CD 配置（GitHub Actions）
├── lib/
│   └── api-auth.ts               ← 鉴权工具函数
└── package.json                  ← npm run test:auth-isolation
```

---

## 鉴权工具函数

`lib/api-auth.ts` 提供了三个核心鉴权函数，所有 API 路由均应使用：

```typescript
getCurrentUser(request)     // 从 cookie 解析当前用户 → { id, role } | null
verifyTenantAccess(request, tenantId)  // 校验当前用户对 tenant 是否有权限
unauthorized()              // 返回 401 响应
forbidden(msg?)             // 返回 403 响应
```

## 鉴权模式

所有受保护的 API 遵循统一模式：

```typescript
export async function GET(request: NextRequest) {
  const currentUser = getCurrentUser(request);
  if (!currentUser) return unauthorized();

  const membership = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, tenantId },
  });
  if (!membership) return forbidden('您无权访问该主体');

  // ... 业务逻辑（所有 Prisma 查询自动按 tenantId 过滤）
}
```

### 特殊场景：ID 驱动的操作（PATCH/DELETE）

对于按 `id` 操作的端点，先查记录确定 `tenantId`，再校验权限：

```typescript
const record = await prisma.record.findUnique({ where: { id } });
if (!record) return notFound();
// 用 record.tenantId 而不是 URL 参数中的 tenantId
const membership = await prisma.userTenantRole.findFirst({
  where: { userId: currentUser.id, tenantId: record.tenantId },
});
if (!membership) return forbidden();
```

### 管理后台 API

管理后台路由使用 `requireAdmin` 模式：

```typescript
async function requireAdmin(request: NextRequest) {
  const currentUser = getCurrentUser(request);
  if (!currentUser) return { error: unauthorized() };
  const adminCheck = await prisma.userTenantRole.findFirst({
    where: { userId: currentUser.id, role: { in: ['OWNER', 'ADMIN'] } },
  });
  if (!adminCheck) return { error: forbidden('需要管理员权限') };
  return { error: null };
}
```

---

## 添加新测试用例

1. 打开 `scripts/test-auth-isolation.ts`
2. 在 `cases` 数组中追加新用例：

```typescript
const cases: TestCase[] = [
  // ... 已有用例
  {
    name: "F1: test → 我的房产 /new-api (越权 → 403)",
    method: "GET",
    path: `/api/new-api?tenantId=${tenant1.id}`,
    cookie: testCookie,
    expectedStatus: 403,
  },
];
```

3. 运行验证：`npm run test:auth-isolation`

> **命名约定**：`{组字母}{序号}: {请求方} → {目标租户} /{路径} ({描述})`

---

## CI/CD 集成

每次 push 到 `main` / `master` / `develop` 或 PR 到这些分支时，GitHub Actions 自动执行：

```yaml
steps:
  - setup-node
  - npm ci
  - prisma generate + db push + seed
  - npm run dev & (后台等待就绪)
  - npm run test:auth-isolation
```

工作流文件：[.github/workflows/auth-isolation.yml](file:///Users/quanyimin/Documents/VS-AI%20开发生产线%2020706/e-hetong/.github/workflows/auth-isolation.yml)

---

## 常见问题

### Q: 测试提示 `fetch failed`

服务器未启动。先运行 `npm run dev`，再运行测试。

### Q: 测试提示「缺少 tenantId 参数」

检查测试脚本中 `tenant1.id` / `tenant2.id` 是否正确赋值。首次运行需先执行 `prisma db seed`。

### Q: 如何重置测试用户状态？

手动删除 `tester@e-hetong.com` 用户后重新运行测试，脚本会自动重建：

```bash
npx ts-node --transpile-only -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { email: 'tester@e-hetong.com' } });
  if (u) {
    await p.userTenantRole.deleteMany({ where: { userId: u.id } });
    await p.user.delete({ where: { id: u.id } });
    console.log('已清除测试用户');
  }
  await p.\$disconnect();
})();
"
```
