/**
 * P0-01 新用户空状态引导卡片 - 单元测试
 *
 * 测试覆盖范围：
 *   1. isEmptyState() 空状态判断逻辑
 *   2. getGuideCards() 引导卡片数据完整性
 *   3. buildCardRenderData() 卡片渲染模式切换逻辑
 *   4. 边界用例：全 0 / 部分 0 / null / undefined / 负数
 *
 * 运行方式: npx vitest run tests/empty-state.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isEmptyState,
  getGuideCards,
  buildCardRenderData,
  type MetricData,
} from '@/lib/empty-state-config';

// ============ 1. isEmptyState 空状态判断 ============

describe('isEmptyState - 空状态判断逻辑', () => {
  it('全 0 数据应判定为空状态', () => {
    const stats: MetricData = {
      pendingSignCount: 0,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 0,
    };
    expect(isEmptyState(stats)).toBe(true);
  });

  it('待签署 > 0 时不应判定为空状态', () => {
    const stats: MetricData = {
      pendingSignCount: 3,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 0,
    };
    expect(isEmptyState(stats)).toBe(false);
  });

  it('履约提醒 > 0 时不应判定为空状态', () => {
    const stats: MetricData = {
      pendingSignCount: 0,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 2,
      totalContracts: 0,
    };
    expect(isEmptyState(stats)).toBe(false);
  });

  it('总合同数 > 0 时不应判定为空状态（即使待签和提醒为 0）', () => {
    const stats: MetricData = {
      pendingSignCount: 0,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 15,
    };
    expect(isEmptyState(stats)).toBe(false);
  });

  it('null 输入应判定为空状态', () => {
    expect(isEmptyState(null)).toBe(true);
  });

  it('undefined 输入应判定为空状态', () => {
    expect(isEmptyState(undefined)).toBe(true);
  });

  it('缺少 totalContracts 字段时应按 0 处理（判定为空状态）', () => {
    const stats = {
      pendingSignCount: 0,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
    } as MetricData;
    expect(isEmptyState(stats)).toBe(true);
  });
});


// ============ 2. getGuideCards 引导卡片数据 ============

describe('getGuideCards - 引导卡片数据完整性', () => {
  const cards = getGuideCards();

  it('应返回 5 张引导卡片', () => {
    expect(cards).toHaveLength(5);
  });

  it('每张卡片应包含必要字段 (title, desc, icon, gradient, href)', () => {
    cards.forEach((card) => {
      expect(card.title).toBeTruthy();
      expect(card.desc).toBeTruthy();
      expect(card.icon).toBeTruthy();
      expect(card.gradient).toBeTruthy();
      expect(card.href).toMatch(/^\//);
    });
  });

  it('第 1 张: 上传合同 → /dashboard/upload', () => {
    expect(cards[0].title).toContain('上传');
    expect(cards[0].href).toBe('/dashboard/upload');
    expect(cards[0].icon).toBe('Upload');
  });

  it('第 2 张: 创建模板 → /dashboard/templates', () => {
    expect(cards[1].title).toContain('模板');
    expect(cards[1].href).toBe('/dashboard/templates');
    expect(cards[1].icon).toBe('BookOpen');
  });

  it('第 3 张: AI 生成 → /dashboard/contracts/generate', () => {
    expect(cards[2].title).toContain('AI');
    expect(cards[2].href).toBe('/dashboard/contracts/generate');
    expect(cards[2].icon).toBe('Wand2');
  });

  it('第 4 张: 发起签署 → /dashboard/esign/setup', () => {
    expect(cards[3].title).toContain('签署');
    expect(cards[3].href).toBe('/dashboard/esign/setup');
    expect(cards[3].icon).toBe('PenTool');
  });

  it('第 5 张: AI 对话 → /dashboard/ai-chat', () => {
    expect(cards[4].title).toContain('AI');
    expect(cards[4].href).toBe('/dashboard/ai-chat');
    expect(cards[4].icon).toBe('Sparkles');
  });

  it('gradient 字段应使用 Tailwind 渐变格式', () => {
    cards.forEach((card) => {
      expect(card.gradient).toMatch(/^from-\w+-\d+\s+to-\w+-\d+$/);
    });
  });
});


// ============ 3. buildCardRenderData 渲染模式切换 ============

describe('buildCardRenderData - 卡片渲染模式切换', () => {
  it('空状态时全部卡片应为 guide 模式', () => {
    const stats: MetricData = {
      pendingSignCount: 0,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 0,
    };
    const result = buildCardRenderData(stats);
    expect(result).toHaveLength(5);
    result.forEach((item) => {
      expect(item.mode).toBe('guide');
      expect(item.guide).toBeDefined();
    });
  });

  it('非空状态时 count > 0 的卡片应为 metric 模式', () => {
    const stats: MetricData = {
      pendingSignCount: 5,
      pendingFillCount: 0,
      pendingApprovalCount: 3,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 10,
    };
    const result = buildCardRenderData(stats);
    expect(result[0].mode).toBe('metric');
    expect(result[0].count).toBe(5);
    expect(result[2].mode).toBe('metric');
    expect(result[2].count).toBe(3);
  });

  it('非空状态时 count = 0 的卡片仍应为 guide 模式', () => {
    const stats: MetricData = {
      pendingSignCount: 5,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 10,
    };
    const result = buildCardRenderData(stats);
    expect(result[1].mode).toBe('guide');
    expect(result[1].guide).toBeDefined();
    expect(result[1].guide?.title).toContain('模板');
  });

  it('null 输入时全部卡片应为 guide 模式', () => {
    const result = buildCardRenderData(null);
    expect(result).toHaveLength(5);
    result.forEach((item) => {
      expect(item.mode).toBe('guide');
      expect(item.guide).toBeDefined();
    });
  });

  it('卡片标签应与指标对应（待我签署/待我填写/待我审批/待他人操作/履约提醒）', () => {
    const result = buildCardRenderData(null);
    expect(result[0].label).toBe('待我签署');
    expect(result[1].label).toBe('待我填写');
    expect(result[2].label).toBe('待我审批');
    expect(result[3].label).toBe('待他人操作');
    expect(result[4].label).toBe('履约提醒');
  });
});


// ============ 4. 边界用例 ============

describe('边界用例 - 极端场景', () => {
  it('负数值应安全处理（按 0 之外的值处理，判定为非空状态）', () => {
    const stats: MetricData = {
      pendingSignCount: -1,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 0,
    };
    // -1 !== 0，所以 isEmptyState 返回 false
    expect(isEmptyState(stats)).toBe(false);
  });

  it('超大数值应正常处理', () => {
    const stats: MetricData = {
      pendingSignCount: 99999,
      pendingFillCount: 0,
      pendingApprovalCount: 0,
      pendingOthersCount: 0,
      expiringCount: 0,
      totalContracts: 99999,
    };
    const result = buildCardRenderData(stats);
    expect(result[0].mode).toBe('metric');
    expect(result[0].count).toBe(99999);
  });

  it('全部指标有值时不应出现任何 guide 模式', () => {
    const stats: MetricData = {
      pendingSignCount: 1,
      pendingFillCount: 2,
      pendingApprovalCount: 3,
      pendingOthersCount: 4,
      expiringCount: 5,
      totalContracts: 15,
    };
    const result = buildCardRenderData(stats);
    result.forEach((item) => {
      expect(item.mode).toBe('metric');
      expect(item.guide).toBeUndefined();
    });
  });

  it('空对象应判定为空状态（全部字段缺失按 0 处理）', () => {
    const stats = {} as MetricData;
    expect(isEmptyState(stats)).toBe(true);
    const result = buildCardRenderData(stats);
    result.forEach((item) => {
      expect(item.mode).toBe('guide');
    });
  });
});
