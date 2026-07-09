/**
 * 数据隔离鉴权测试脚本
 *
 * 模拟不同用户在不同租户下的请求，验证鉴权逻辑是否生效。
 * 
 * 运行: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-auth-isolation.ts
 */

const { PrismaClient } = require("@prisma/client");

const BASE = "http://localhost:3000";

const PASS = "\x1b[32m✓ PASS\x1b[0m";
const FAIL = "\x1b[31m✗ FAIL\x1b[0m";
const INFO = "\x1b[36m▶ INFO\x1b[0m";

async function main() {
  console.log(`${INFO} 数据隔离鉴权测试\n`);

  const prisma = new PrismaClient();

  // ============================================================
  // 准备阶段: 创建测试用户
  // ============================================================
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@e-hetong.com" },
  });

  if (!demoUser) {
    console.log(`${FAIL} demo@e-hetong.com 不存在，请先运行种子数据`);
    await prisma.$disconnect();
    return;
  }

  // 查找已有租户
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });
  const tenant1 = tenants.find((t: { id: string; name: string }) => t.name === "我的房产");
  const tenant2 = tenants.find((t: { id: string; name: string }) => t.name === "七嗦米粉总店");

  if (!tenant1 || !tenant2) {
    console.log(`${FAIL} 需要两个租户: 我的房产 + 七嗦米粉总店`);
    await prisma.$disconnect();
    return;
  }

  // 创建第二个测试用户（只属于 tenant2）
  let testUser = await prisma.user.findUnique({
    where: { email: "tester@e-hetong.com" },
  });

  if (!testUser) {
    // 使用与 seed.ts 一致的 hash
    const bcrypt = require("bcryptjs") as any;
    const hash = bcrypt.hashSync("test123", 10);
    testUser = await prisma.user.create({
      data: {
        email: "tester@e-hetong.com",
        name: "测试员",
        passwordHash: hash,
      },
    });
    console.log(`${INFO} 已创建测试用户: tester@e-hetong.com (${testUser.id})`);
  }

  // 确保测试用户属于 tenant2，但不属于 tenant1
  const existingRole1 = await prisma.userTenantRole.findFirst({
    where: { userId: testUser.id, tenantId: tenant1.id },
  });
  if (existingRole1) {
    await prisma.userTenantRole.delete({ where: { id: existingRole1.id } });
    console.log(`${INFO} 已移除测试用户对"我的房产"的权限`);
  }

  const existingRole2 = await prisma.userTenantRole.findFirst({
    where: { userId: testUser.id, tenantId: tenant2.id },
  });
  if (!existingRole2) {
    await prisma.userTenantRole.create({
      data: {
        userId: testUser.id,
        tenantId: tenant2.id,
        role: "STAFF",
      },
    });
    console.log(`${INFO} 已授予测试用户对"七嗦米粉总店"的 STAFF 角色`);
  } else if (existingRole2.role !== "STAFF") {
    await prisma.userTenantRole.update({
      where: { id: existingRole2.id },
      data: { role: "STAFF" },
    });
    console.log(`${INFO} 已更新测试用户角色为 STAFF`);
  }

  await prisma.$disconnect();

  // ============================================================
  // Cookie 辅助
  // ============================================================
  function makeCookie(userId: string, role: string = "user"): string {
    return encodeURIComponent(JSON.stringify({ id: userId, role }));
  }

  const demoCookie = `ehetong_auth=${makeCookie(demoUser.id)}`;
  const testCookie = `ehetong_auth=${makeCookie(testUser.id)}`;
  const fakeCookie = `ehetong_auth=${makeCookie("fake-id-that-does-not-exist")}`;

  // ============================================================
  // 测试用例
  // ============================================================
  let passed = 0;
  let failed = 0;

  type TestCase = {
    name: string;
    method: "GET" | "POST";
    path: string;
    cookie: string;
    body?: any;
    expectedStatus: number; // 200 or 403
  };

  const cases: TestCase[] = [
    // --- 场景 A: demo（双租户OWNER）访问自己有权限的租户 → 200 ---
    {
      name: "A1: demo → 我的房产 /contracts (OWNER, 有效)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant1.id}`,
      cookie: demoCookie,
      expectedStatus: 200,
    },
    {
      name: "A2: demo → 七嗦米粉总店 /contracts (OWNER, 有效)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant2.id}`,
      cookie: demoCookie,
      expectedStatus: 200,
    },
    {
      name: "A3: demo → 我的房产 /ledger (OWNER, 有效)",
      method: "GET",
      path: `/api/ledger?tenantId=${tenant1.id}`,
      cookie: demoCookie,
      expectedStatus: 200,
    },
    {
      name: "A4: demo → 我的房产 /dashboard/stats (OWNER, 有效)",
      method: "GET",
      path: `/api/dashboard/stats?tenantId=${tenant1.id}`,
      cookie: demoCookie,
      expectedStatus: 200,
    },
    {
      name: "A5: demo → 我的房产 /reminders (OWNER, 有效)",
      method: "GET",
      path: `/api/reminders?tenantId=${tenant1.id}`,
      cookie: demoCookie,
      expectedStatus: 200,
    },

    // --- 场景 B: test（仅 STAFF 属于 tenant2）访问 tenant1 → 403 ---
    {
      name: "B1: test → 我的房产 /contracts (越权 → 403)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },
    {
      name: "B2: test → 我的房产 /ledger (越权 → 403)",
      method: "GET",
      path: `/api/ledger?tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },
    {
      name: "B3: test → 我的房产 /dashboard/stats (越权 → 403)",
      method: "GET",
      path: `/api/dashboard/stats?tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },
    {
      name: "B4: test → 我的房产 /reminders (越权 → 403)",
      method: "GET",
      path: `/api/reminders?tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },

    // --- 场景 C: test 访问自己的 tenant2 → 200 ---
    {
      name: "C1: test → 七嗦米粉总店 /contracts (STAFF, 有效)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant2.id}`,
      cookie: testCookie,
      expectedStatus: 200,
    },
    {
      name: "C2: test → 七嗦米粉总店 /ledger (STAFF, 有效)",
      method: "GET",
      path: `/api/ledger?tenantId=${tenant2.id}`,
      cookie: testCookie,
      expectedStatus: 200,
    },
    {
      name: "C3: test → 七嗦米粉总店 /dashboard/stats (STAFF, 有效)",
      method: "GET",
      path: `/api/dashboard/stats?tenantId=${tenant2.id}`,
      cookie: testCookie,
      expectedStatus: 200,
    },
    {
      name: "C4: test → 七嗦米粉总店 /reminders (STAFF, 有效)",
      method: "GET",
      path: `/api/reminders?tenantId=${tenant2.id}`,
      cookie: testCookie,
      expectedStatus: 200,
    },

    // --- 场景 D: 场景 API 越权 ---
    {
      name: "D1: test → 我的房产 /scenes/landlord/stats (越权 → 403)",
      method: "GET",
      path: `/api/scenes/landlord/stats?userId=${testUser.id}&tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },
    {
      name: "D2: test → 我的房产 /scenes/landlord/bills (越权 → 403)",
      method: "GET",
      path: `/api/scenes/landlord/bills?userId=${testUser.id}&tenantId=${tenant1.id}`,
      cookie: testCookie,
      expectedStatus: 403,
    },

    // --- 场景 E: 伪造/无效用户访问 → 401 或 403 均可（均为拒绝）---
    {
      name: "E1: fake user → 我的房产 /contracts (伪造 → 401/403)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant1.id}`,
      cookie: fakeCookie,
      expectedStatus: 403,  // 无法通过 cookie 判断伪造，查库后返回 403 合理
    },
    {
      name: "E2: no cookie → 我的房产 /contracts (未登录 → 401)",
      method: "GET",
      path: `/api/contracts?tenantId=${tenant1.id}`,
      cookie: "",
      expectedStatus: 401,
    },
  ];

  // ============================================================
  // 执行测试
  // ============================================================
  for (const tc of cases) {
    const url = `${BASE}${tc.path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (tc.cookie) {
      headers["Cookie"] = tc.cookie;
    }

    try {
      const res = await fetch(url, {
        method: tc.method,
        headers,
        body: tc.body ? JSON.stringify(tc.body) : undefined,
        redirect: "manual",
      });

      // 读取响应体确认 code 值
      let bodyCode = -1;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        bodyCode = json.code;
      } catch {}

      if (res.status === tc.expectedStatus) {
        console.log(`${PASS} ${tc.name} [HTTP ${res.status}]`);
        passed++;
      } else {
        console.log(
          `${FAIL} ${tc.name} [期望 ${tc.expectedStatus}, 实际 ${res.status}]`
        );
        failed++;
      }
    } catch (e: any) {
      console.log(`${FAIL} ${tc.name} [请求异常: ${e.message}]`);
      failed++;
    }
  }

  // ============================================================
  // 汇总
  // ============================================================
  const total = passed + failed;
  console.log(`\n${INFO} ========== 测试汇总 ==========`);
  console.log(`${INFO} 总计: ${total} | ${"\x1b[32m"}通过: ${passed}${"\x1b[0m"} | ${"\x1b[31m"}失败: ${failed}${"\x1b[0m"}`);

  if (failed === 0) {
    console.log(`${PASS} 鉴权隔离全部验证通过！`);
    process.exit(0);
  } else {
    console.log(`\n${FAIL} 有 ${failed} 个用例未通过，请检查以上 FAIL 条目`);
    process.exit(1);
  }
}

main().catch(console.error);
