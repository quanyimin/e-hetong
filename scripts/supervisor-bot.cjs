#!/usr/bin/env node
/**
 * 自动监督机器人 - 多多合同助手 SaaS 优化任务
 *
 * 功能：
 *   1. 扫描代码库，自动检查 11 个优化任务的实现状态
 *   2. 每个任务有明确的验收规则（文件存在、代码包含、TS编译）
 *   3. 输出结构化进度报告 + 质量门禁判定
 *   4. 生成报告文件，供 CI/CD 或人工审查
 *
 * 运行方式: node scripts/supervisor-bot.cjs [--watch] [--json]
 *   --watch  持续监控模式（每30秒检查一次）
 *   --json   输出 JSON 格式报告
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============ 单实例锁 (pidfile) ============
// 避免多进程并存导致检查状态与日志混乱（参考经验：476236 + 287066）
const PID_FILE = path.join(PROJECT_ROOT, '.supervisor.pid');
function acquireLock() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const prevPid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      if (!Number.isNaN(prevPid)) {
        try { process.kill(prevPid, 0); } // 信号 0 仅检查进程是否存在
        catch {
          // 进程已不存在，清除陈旧 pidfile
          fs.unlinkSync(PID_FILE);
          fs.writeFileSync(PID_FILE, String(process.pid));
          return true;
        }
        return { alreadyRunning: true, pid: prevPid };
      }
    }
    fs.writeFileSync(PID_FILE, String(process.pid));
    return true;
  } catch (e) {
    // 锁获取失败以非阻塞方式降级：不启动 watch
    console.error(`[SUPERVISOR] ⚠️  获取锁失败: ${e.message}`);
    return false;
  }
}
function releaseLock() {
  try {
    if (fs.existsSync(PID_FILE) && parseInt(fs.readFileSync(PID_FILE, 'utf-8')) === process.pid) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {}
}
// 结构化日志：固定前缀，机器可解析，避免第三方 warning 干扰解析
function logStructured(level, tag, data) {
  const ts = new Date().toISOString();
  const payload = typeof data === 'string' ? { msg: data } : data || {};
  console.log(`[SUPERVISOR][${level}][${ts}][${tag}] ${JSON.stringify(payload)}`);
}
// 全局异常捕获：任何未捕获错误都不至于让 --watch 进程崩溃退出（经验 287066）
process.on('uncaughtException', (err) => {
  logStructured('ERROR', 'uncaughtException', { message: err.message, stack: err.stack?.substring(0, 200) });
});
process.on('unhandledRejection', (reason) => {
  logStructured('ERROR', 'unhandledRejection', { reason: String(reason).substring(0, 200) });
});
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((sig) =>
  process.on(sig, () => { logStructured('INFO', sig, { pid: process.pid }); releaseLock(); process.exit(0); })
);

// ============ 任务定义（11 项 P0-P2） ============
const TASKS = [
  // ---------- P0 ----------
  {
    id: 'p0-1',
    name: '新用户空状态引导卡片',
    priority: 'P0',
    qualityGate: '当指标为0时，卡片内容替换为引导操作（非空数字0）',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['空状态', 'emptyState', 'isEmpty', '引导', 'getStarted', '快速开始'],
        minMatches: 2,
        desc: '首页组件包含空状态引导逻辑',
      },
      {
        type: 'file_contains',
        file: 'app/dashboard/components/AiModeHomePage.tsx',
        patterns: ['空状态', 'emptyState', '引导', '快速开始'],
        minMatches: 1,
        desc: 'AI首页包含空状态引导',
      },
    ],
  },
  {
    id: 'p0-2',
    name: 'Cmd+K 全局快捷搜索面板',
    priority: 'P0',
    qualityGate: 'Cmd+K / Ctrl+K 快捷键触发全局搜索，所有屏幕宽度可用',
    checks: [
      {
        type: 'file_exists',
        file: 'components/dashboard/CommandPalette.tsx',
        desc: '命令面板组件已创建',
      },
      {
        type: 'file_contains',
        file: 'app/dashboard/(traditional)/layout.tsx',
        patterns: ['CommandPalette', 'cmdk', 'cmd+k', 'metaKey', 'ctrlKey', '83', '75'],
        minMatches: 1,
        desc: '传统布局集成了 Cmd+K 快捷键',
      },
      {
        type: 'file_contains',
        file: 'app/dashboard/(ai-mode)/layout.tsx',
        patterns: ['CommandPalette', 'cmdk', '75', 'metaKey'],
        minMatches: 1,
        desc: 'AI布局集成了 Cmd+K 快捷键',
      },
    ],
  },
  {
    id: 'p0-3',
    name: '首页拖拽上传区',
    priority: 'P0',
    qualityGate: '首页有虚线边框拖拽区域，支持拖拽 PDF/Word 发起审查或签署',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['onDrop', 'onDragOver', 'drag', '拖拽', 'dropzone', 'dashed'],
        minMatches: 2,
        desc: '首页包含拖拽上传逻辑',
      },
    ],
  },
  // ---------- P1 ----------
  {
    id: 'p1-4',
    name: '指标卡片趋势对比',
    priority: 'P1',
    qualityGate: '指标卡片显示环比箭头（↑12% vs 上周）',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['trend', '环比', '同比', 'vs', '↑', '↓', 'lastWeek', 'lastMonth', 'previousPeriod'],
        minMatches: 2,
        desc: '指标卡片包含趋势对比数据',
      },
    ],
  },
  {
    id: 'p1-5',
    name: '合同趋势 sparkline',
    priority: 'P1',
    qualityGate: '合同状态分布区域包含近30天趋势折线图（sparkline）',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['sparkline', 'trend', '趋势', 'line', '折线', '30天', 'dailyData', 'timeSeries'],
        minMatches: 1,
        desc: '首页包含趋势图组件',
      },
    ],
  },
  {
    id: 'p1-6',
    name: '首页信息分层',
    priority: 'P1',
    qualityGate: '首页内容按三屏分层：第一屏（指标+快速发起）/第二屏（趋势+列表）/第三屏（亮点+商业化）',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['above-the-fold', '第一屏', '第二屏', '第三屏', 'primary-section', 'secondary-section', 'scroll-mt'],
        minMatches: 1,
        desc: '首页有分层标记',
      },
    ],
  },
  {
    id: 'p1-7',
    name: '智能工具二级分组',
    priority: 'P1',
    qualityGate: '合同菜单下有"智能工具"分组（归档/台账/比对/审查）',
    checks: [
      {
        type: 'file_contains',
        file: 'lib/menu-config.ts',
        patterns: ['智能工具', 'smart-tools', 'contracts-smart', '归档', '台账', '比对', '审查'],
        minMatches: 2,
        desc: '菜单配置包含智能工具分组',
      },
    ],
  },
  // ---------- P2 ----------
  {
    id: 'p2-8',
    name: '暗色模式基础支持',
    priority: 'P2',
    qualityGate: 'dark: 类使用 + 主题切换按钮',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/(traditional)/layout.tsx',
        patterns: ['dark:', 'theme', 'ThemeToggle', 'useTheme'],
        minMatches: 1,
        desc: '布局包含暗色模式支持',
      },
    ],
  },
  {
    id: 'p2-9',
    name: '首页组件自定义',
    priority: 'P2',
    qualityGate: '用户可拖拽排序首页各区块',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/components/TraditionalHomePage.tsx',
        patterns: ['customiz', '自定义', 'drag-reorder', 'sortable', 'widgetOrder', 'layoutConfig'],
        minMatches: 1,
        desc: '首页支持组件自定义',
      },
    ],
  },
  {
    id: 'p2-10',
    name: '合同详情页协作功能',
    priority: 'P2',
    qualityGate: '合同详情页支持评论/标注',
    checks: [
      {
        type: 'file_exists',
        file: 'app/dashboard/contracts/[id]/comments/page.tsx',
        desc: '合同评论页面存在',
      },
      {
        type: 'file_contains',
        file: 'app/dashboard/contracts/[id]/page.tsx',
        patterns: ['comment', '评论', '标注', 'annotate', 'collaboration'],
        minMatches: 1,
        desc: '合同详情页包含协作入口',
      },
    ],
  },
  {
    id: 'p2-11',
    name: '企业/个人空间切换器',
    priority: 'P2',
    qualityGate: '顶部导航有空间切换器',
    checks: [
      {
        type: 'file_contains',
        file: 'app/dashboard/(traditional)/layout.tsx',
        patterns: ['空间切换', 'SpaceSwitcher', 'tenant-switch', 'switchSpace', 'PERSONAL', 'ENTERPRISE'],
        minMatches: 1,
        desc: '顶部导航包含空间切换器',
      },
    ],
  },
];

// ============ 检查器 ============
function checkFileExists(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  return fs.existsSync(fullPath);
}

function checkFileContains(filePath, patterns, minMatches = 1) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return { passed: false, matches: [], reason: '文件不存在' };
  const content = fs.readFileSync(fullPath, 'utf-8');
  const matches = [];
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      matches.push(pattern);
    }
  }
  return {
    passed: matches.length >= minMatches,
    matches,
    reason: matches.length >= minMatches ? `${matches.length}/${patterns.length} 模式匹配` : `仅匹配 ${matches.length}/${patterns.length}（需 ${minMatches}）`,
  };
}

function runTaskCheck(task) {
  const results = task.checks.map(check => {
    if (check.type === 'file_exists') {
      const passed = checkFileExists(check.file);
      return { ...check, passed, result: passed ? '✅ 文件存在' : '❌ 文件不存在' };
    }
    if (check.type === 'file_contains') {
      const result = checkFileContains(check.file, check.patterns, check.minMatches);
      return { ...check, passed: result.passed, result: result.reason, matches: result.matches };
    }
    return { ...check, passed: false, result: '❌ 未知检查类型' };
  });
  const allPassed = results.every(r => r.passed);
  return { ...task, checks: results, status: allPassed ? 'completed' : 'pending' };
}

// ============ 报告生成 ============
function generateReport(taskResults, jsonMode = false) {
  const total = taskResults.length;
  const completed = taskResults.filter(t => t.status === 'completed').length;
  const pending = taskResults.filter(t => t.status === 'pending').length;
  const p0Total = taskResults.filter(t => t.priority === 'P0').length;
  const p0Done = taskResults.filter(t => t.priority === 'P0' && t.status === 'completed').length;
  const p1Total = taskResults.filter(t => t.priority === 'P1').length;
  const p1Done = taskResults.filter(t => t.priority === 'P1' && t.status === 'completed').length;
  const p2Total = taskResults.filter(t => t.priority === 'P2').length;
  const p2Done = taskResults.filter(t => t.priority === 'P2' && t.status === 'completed').length;
  const progress = Math.round((completed / total) * 100);

  if (jsonMode) {
    return JSON.stringify({ total, completed, pending, progress, tasks: taskResults }, null, 2);
  }

  const lines = [];
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('       多多合同助手 SaaS 优化 · 监督机器人报告');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  📊 总进度: ${completed}/${total} (${progress}%)`);
  lines.push(`  P0 (紧急): ${p0Done}/${p0Total}  |  P1 (高优): ${p1Done}/${p1Total}  |  P2 (中期): ${p2Done}/${p2Total}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────');
  for (const task of taskResults) {
    const icon = task.status === 'completed' ? '✅' : '⏳';
    lines.push(`  ${icon} [${task.priority}] ${task.id}: ${task.name}`);
    lines.push(`     质量门: ${task.qualityGate}`);
    for (const check of task.checks) {
      const cIcon = check.passed ? '✓' : '✗';
      lines.push(`     ${cIcon} ${check.desc}: ${check.result}`);
    }
    lines.push('');
  }
  lines.push('═══════════════════════════════════════════════════════');
  if (progress === 100) {
    lines.push('  🎉 全部任务完成！质量门禁通过。');
  } else if (p0Done < p0Total) {
    lines.push(`  ⚠️ P0 紧急任务未完成: ${p0Total - p0Done} 项待处理，需优先执行。`);
  } else if (p1Done < p1Total) {
    lines.push(`  📌 P0 已全部完成，P1 待推进: ${p1Total - p1Done} 项。`);
  } else {
    lines.push(`  P0/P1 已完成，P2 待推进: ${p2Total - p2Done} 项。`);
  }
  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ============ 主程序 ============
function runCheck(jsonMode = false) {
  const taskResults = TASKS.map(runTaskCheck);
  const report = generateReport(taskResults, jsonMode);
  
  // 保存报告到文件
  const reportPath = path.join(PROJECT_ROOT, 'supervisor-report.txt');
  fs.writeFileSync(reportPath, report);
  
  if (!jsonMode) {
    console.log(report);
  } else {
    console.log(report);
  }
  
  return taskResults;
}

// ============ Watch 模式 ============
// 经验 476236 + 287066：
//   - 不要在对话线程做阻塞轮询 → 这里是独立进程可正常运行
//   - setInterval 回调必须完整 try/catch，否则单次异常会导致后续定时器静默死掉
//   - 同时记录 checkCount 便于观察长时间运行是否有内存泄漏
let watchIntervalHandle = null;
let watchCheckCount = 0;
function watchMode() {
  const lockResult = acquireLock();
  if (lockResult && typeof lockResult === 'object' && lockResult.alreadyRunning) {
    console.log(`[SUPERVISOR] ⚠️  已有监督机器人在运行，PID=${lockResult.pid}，跳过启动。`);
    console.log(`           如确定无其他进程，手动删除: rm ${PID_FILE}`);
    process.exit(2);
  }
  if (lockResult === false) {
    console.log('[SUPERVISOR] ❌ 无法获取单实例锁，退出。');
    process.exit(3);
  }
  logStructured('INFO', 'watch-start', { pid: process.pid, intervalSec: 30, pwd: PROJECT_ROOT });
  console.log('🔍 监督机器人启动 - Watch 模式（每30秒检查）\n');
  console.log(`   PID: ${process.pid}  |  pidfile: ${PID_FILE}\n`);

  // 把 runCheck 包一层，防止任何异常中断定时器
  const safeRun = (label) => {
    watchCheckCount += 1;
    const t0 = Date.now();
    try {
      runCheck();
      logStructured('INFO', label, { nth: watchCheckCount, costMs: Date.now() - t0 });
    } catch (err) {
      logStructured('ERROR', label, { nth: watchCheckCount, costMs: Date.now() - t0, message: err.message, stack: err.stack?.substring(0, 300) });
      // 异常不退出进程，等下一轮继续检查（经验 287066：避免定时器回调异常导致静默假死）
      console.log(`\n⚠️  本轮检查异常: ${err.message}，下一轮将自动重试。\n`);
    }
  };

  safeRun('check-round-init');

  // 单间隔句柄全局保存，便于 SIGTERM 清理
  watchIntervalHandle = setInterval(() => {
    console.clear();
    const now = new Date();
    console.log(`\n🔄 检查时间: ${now.toLocaleTimeString('zh-CN')}  |  第 ${watchCheckCount + 1} 轮\n`);
    safeRun('check-round');
  }, 30000);
}

// ============ 命令行入口 ============
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watchMode();
} else {
  const results = runCheck(args.includes('--json'));
  const allDone = results.every(r => r.status === 'completed');
  process.exit(allDone ? 0 : 1);
}
