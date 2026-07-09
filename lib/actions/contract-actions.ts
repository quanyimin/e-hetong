import prisma from '@/lib/prisma';
import { validateTenantAccess, hasPermission } from '../data-isolation';

export interface ContractQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  sortBy?: 'createdAt' | 'endDate' | 'amount';
  sortOrder?: 'asc' | 'desc';
  folderId?: string;
}

export interface CreateContractParams {
  name: string;
  type: string;
  partyA: string;
  partyB: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  templateId?: string;
  fileUrl?: string;
  fileType?: string;
  content?: string;
  partnerId?: string;
  folderId?: string;
  sceneConfig?: string;
}

export interface UpdateContractParams extends Partial<CreateContractParams> {
  status?: string;
  remark?: string;
  tags?: string;
}

export async function getContracts(
  userId: string,
  tenantId: string,
  params?: ContractQueryParams
): Promise<{
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access) {
    throw new Error('无权限访问该主体');
  }

  const { page = 1, pageSize = 20, search, type, status, sortBy = 'createdAt', sortOrder = 'desc', folderId } = params || {};

  // TODO: Phase 2 迁移到 tenantId
  const where: any = { userId };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { partyA: { contains: search } },
      { partyB: { contains: search } },
      { tags: { contains: search } },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (folderId) {
    where.folderId = folderId;
  }

  const sort: Record<string, 'asc' | 'desc'> = {};
  sort[sortBy] = sortOrder;

  const [total, contracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      orderBy: sort,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        folder: { select: { id: true, name: true } },
        reminders: { select: { id: true, remindType: true, remindAt: true, sendStatus: true } },
      },
    }),
  ]);

  return {
    data: contracts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContractById(userId: string, tenantId: string, contractId: string) {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access) {
    throw new Error('无权限访问该主体');
  }

  // TODO: Phase 2 迁移到 tenantId, 增加 partner/bills/attachments 等关联
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
    include: {
      folder: { select: { id: true, name: true } },
      reminders: { select: { id: true, title: true, remindType: true, remindAt: true, sendStatus: true } },
    },
  });

  if (!contract) {
    throw new Error('合同不存在');
  }

  return contract;
}

export async function createContract(
  userId: string,
  tenantId: string,
  params: CreateContractParams
) {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'MANAGER')) {
    throw new Error('无权限创建合同');
  }

  // TODO: Phase 2 迁移到 tenantId, 加入 partnerId/sceneConfig 等字段
  const contract = await prisma.contract.create({
    data: {
      userId,
      name: params.name,
      type: params.type,
      partyA: params.partyA,
      partyB: params.partyB,
      amount: params.amount,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      fileUrl: params.fileUrl,
      fileType: params.fileType,
      folderId: params.folderId,
      searchText: [params.name, params.partyA, params.partyB].filter(Boolean).join(' '),
    },
  });

  return contract;
}

export async function updateContract(
  userId: string,
  tenantId: string,
  contractId: string,
  params: UpdateContractParams
) {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'MANAGER')) {
    throw new Error('无权限修改合同');
  }

  const existing = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });

  if (!existing) {
    throw new Error('合同不存在');
  }

  const updateData: any = {};

  if (params.name !== undefined) updateData.name = params.name;
  if (params.type !== undefined) updateData.type = params.type;
  if (params.partyA !== undefined) updateData.partyA = params.partyA;
  if (params.partyB !== undefined) updateData.partyB = params.partyB;
  if (params.amount !== undefined) updateData.amount = params.amount;
  if (params.startDate !== undefined) updateData.startDate = new Date(params.startDate);
  if (params.endDate !== undefined) updateData.endDate = new Date(params.endDate);
  if (params.fileUrl !== undefined) updateData.fileUrl = params.fileUrl;
  if (params.fileType !== undefined) updateData.fileType = params.fileType;
  if (params.folderId !== undefined) updateData.folderId = params.folderId;
  if (params.status !== undefined) updateData.status = params.status;
  if (params.remark !== undefined) updateData.remark = params.remark;
  if (params.tags !== undefined) updateData.tags = params.tags;

  // 重建 searchText（如果有搜索相关字段变更）
  if (params.name !== undefined || params.partyA !== undefined || params.partyB !== undefined || params.tags !== undefined) {
    const updatedName = params.name !== undefined ? params.name : existing.name;
    const updatedA = params.partyA !== undefined ? params.partyA : existing.partyA;
    const updatedB = params.partyB !== undefined ? params.partyB : existing.partyB;
    const updatedTags = params.tags !== undefined ? params.tags : existing.tags;
    updateData.searchText = [updatedName, updatedA, updatedB, updatedTags ? JSON.parse(updatedTags).join(' ') : ''].filter(Boolean).join(' ');
  }

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: updateData,
  });

  return contract;
}

export async function deleteContract(userId: string, tenantId: string, contractId: string) {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access || !hasPermission(access.role, 'ADMIN')) {
    throw new Error('无权限删除合同');
  }

  const existing = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });

  if (!existing) {
    throw new Error('合同不存在');
  }

  await prisma.contract.delete({
    where: { id: contractId },
  });

  return { success: true };
}

export async function updateContractParseResult(contractId: string, tenantId: string, result: any) {
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      parsedData: JSON.stringify(result),
      parseStatus: 'completed',
    },
  });
}

export async function getContractStats(userId: string, tenantId: string) {
  const access = await validateTenantAccess(userId, tenantId);
  if (!access) {
    throw new Error('无权限访问该主体');
  }

  // TODO: Phase 2 迁移到 tenantId
  const stats = await prisma.contract.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { amount: true },
  });

  const statusCount = await prisma.contract.groupBy({
    by: ['status'],
    where: { userId },
    _count: { id: true },
  });

  const typeCount = await prisma.contract.groupBy({
    by: ['type'],
    where: { userId },
    _count: { id: true },
  });

  return {
    total: stats._count.id,
    totalAmount: stats._sum.amount || 0,
    byStatus: statusCount.map((s) => ({ status: s.status, count: s._count.id })),
    byType: typeCount.map((t) => ({ type: t.type, count: t._count.id })),
  };
}
