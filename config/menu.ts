export type SceneType = 'GENERAL'|'FREELANCE'|'LANDLORD'|'CATERING'|'TECH'|'TRADE'|'CONSTRUCTION'|'EDUCATION'|'MEDICAL'|'AGRICULTURE'|'OTHER';
export type PlanLevel = 'FREE'|'FREELANCE'|'LANDLORD'|'CATERING'|'AGRICULTURE'|'ENTERPRISE';

export interface MenuItem {
  key: string; label: string; icon: string; path: string;
  scenes: SceneType[]; minPlan: PlanLevel; children?: MenuItem[];
}

const PLAN_ORDER: Record<PlanLevel, number> = { FREE:0, FREELANCE:1, LANDLORD:2, CATERING:3, AGRICULTURE:4, ENTERPRISE:5 };

export function hasPlanAccess(userPlan: PlanLevel, minPlan: PlanLevel): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[minPlan];
}

export function filterMenusByScene(menus: MenuItem[], enabledScenes: SceneType[], userPlan: PlanLevel): MenuItem[] {
  return menus.filter(m => {
    const sceneMatch = m.scenes.length === 0 || m.scenes.some(s => enabledScenes.includes(s));
    return sceneMatch && hasPlanAccess(userPlan, m.minPlan);
  }).map(m => ({ ...m, children: m.children ? filterMenusByScene(m.children, enabledScenes, userPlan) : undefined }));
}

export const SIDEBAR_MENUS: MenuItem[] = [
  { key:'dashboard', label:'控制台', icon:'LayoutDashboard', path:'/dashboard/[orgId]', scenes:[], minPlan:'FREE' },
  { key:'contracts', label:'合同管理', icon:'FileText', path:'/dashboard/[orgId]/contracts', scenes:[], minPlan:'FREE',
    children:[
      { key:'contract-list', label:'全部合同', icon:'List', path:'/dashboard/[orgId]/contracts', scenes:[], minPlan:'FREE' },
      { key:'templates', label:'模板库', icon:'Layers', path:'/dashboard/[orgId]/contracts/templates', scenes:[], minPlan:'FREE' },
      { key:'new-contract', label:'新建合同', icon:'PlusCircle', path:'/dashboard/[orgId]/contracts/new', scenes:[], minPlan:'FREE' },
    ]},
  { key:'bills', label:'收支台账', icon:'Wallet', path:'/dashboard/[orgId]/bills', scenes:[], minPlan:'FREELANCE',
    children:[
      { key:'receivable', label:'应收管理', icon:'ArrowDownLeft', path:'/dashboard/[orgId]/bills/receivable', scenes:[], minPlan:'FREELANCE' },
      { key:'payable', label:'应付管理', icon:'ArrowUpRight', path:'/dashboard/[orgId]/bills/payable', scenes:[], minPlan:'FREELANCE' },
    ]},
  { key:'partners', label:'合作方管理', icon:'Users', path:'/dashboard/[orgId]/partners', scenes:[], minPlan:'FREELANCE' },
  { key:'reminders', label:'提醒中心', icon:'Bell', path:'/dashboard/[orgId]/reminders', scenes:[], minPlan:'FREE' },
  { key:'reports', label:'数据报表', icon:'BarChart3', path:'/dashboard/[orgId]/reports', scenes:[], minPlan:'FREELANCE' },
  { key:'landlord', label:'房东工作台', icon:'Home', path:'/dashboard/[orgId]/landlord/houses', scenes:['LANDLORD'], minPlan:'LANDLORD',
    children:[
      { key:'houses', label:'房源管理', icon:'Building2', path:'/dashboard/[orgId]/landlord/houses', scenes:['LANDLORD'], minPlan:'LANDLORD' },
      { key:'meters', label:'水电读数', icon:'Gauge', path:'/dashboard/[orgId]/landlord/meters', scenes:['LANDLORD'], minPlan:'LANDLORD' },
      { key:'deposit', label:'押金管理', icon:'Safe', path:'/dashboard/[orgId]/landlord/deposit', scenes:['LANDLORD'], minPlan:'LANDLORD' },
    ]},
  { key:'catering', label:'餐饮工作台', icon:'UtensilsCrossed', path:'/dashboard/[orgId]/catering/suppliers', scenes:['CATERING'], minPlan:'CATERING',
    children:[
      { key:'suppliers', label:'供应商管理', icon:'Truck', path:'/dashboard/[orgId]/catering/suppliers', scenes:['CATERING'], minPlan:'CATERING' },
      { key:'licenses', label:'证照管理', icon:'BadgeCheck', path:'/dashboard/[orgId]/catering/licenses', scenes:['CATERING'], minPlan:'CATERING' },
      { key:'devices', label:'设备管理', icon:'Refrigerator', path:'/dashboard/[orgId]/catering/devices', scenes:['CATERING'], minPlan:'CATERING' },
    ]},
  { key:'enterprise', label:'企业管理', icon:'Building', path:'/dashboard/[orgId]/enterprise/members', scenes:[], minPlan:'ENTERPRISE',
    children:[
      { key:'members', label:'成员管理', icon:'UserPlus', path:'/dashboard/[orgId]/enterprise/members', scenes:[], minPlan:'ENTERPRISE' },
      { key:'approval', label:'审批流程', icon:'CheckSquare', path:'/dashboard/[orgId]/enterprise/approval', scenes:[], minPlan:'ENTERPRISE' },
      { key:'seals', label:'印章管理', icon:'Stamp', path:'/dashboard/[orgId]/enterprise/seals', scenes:[], minPlan:'ENTERPRISE' },
    ]},
  { key:'settings', label:'主体设置', icon:'Settings', path:'/dashboard/[orgId]/settings', scenes:[], minPlan:'FREE' },
];
