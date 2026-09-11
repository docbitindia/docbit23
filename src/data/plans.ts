export type PlanId = 'free' | 'starter' | 'pro' | 'pro_plus';
export type ActivityLevel = 'none' | 'basic' | 'advanced';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  projectLimit: number | null;
  storageBytes: number;
  maxFileBytes: number;
  processingSessions: number | null;
  editorLimit: number | null;
  memberLimit: number | null;
  workspaceLimit: number | null;
  activityLevel: ActivityLevel;
  customPdfBranding: boolean;
  priorityProcessing: boolean;
  prioritySupport: boolean;
  advertisements: boolean;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Customer-facing entitlement definitions. Backend/RPC remains authoritative. */
export const PLANS: PlanDefinition[] = [
  { id:'free', name:'Free', monthlyPrice:0, annualPrice:0, description:'Start preparing smaller data jobs with the complete core workflow.', projectLimit:10, storageBytes:250*MB, maxFileBytes:25*MB, processingSessions:10, editorLimit:0, memberLimit:0, workspaceLimit:1, activityLevel:'none', customPdfBranding:false, priorityProcessing:false, prioritySupport:true, advertisements:true },
  { id:'starter', name:'Starter', monthlyPrice:299, annualPrice:2990, description:'For regular individual work with larger files and reusable reporting.', projectLimit:50, storageBytes:2*GB, maxFileBytes:100*MB, processingSessions:50, editorLimit:0, memberLimit:0, workspaceLimit:3, activityLevel:'basic', customPdfBranding:true, priorityProcessing:false, prioritySupport:true, advertisements:false },
  { id:'pro', name:'Pro', monthlyPrice:699, annualPrice:6990, description:'For professional teams running recurring data preparation workflows.', projectLimit:100, storageBytes:10*GB, maxFileBytes:500*MB, processingSessions:1000, editorLimit:50, memberLimit:500, workspaceLimit:10, activityLevel:'advanced', customPdfBranding:true, priorityProcessing:true, prioritySupport:true, advertisements:false },
  { id:'pro_plus', name:'Pro Plus', monthlyPrice:1499, annualPrice:14990, description:'For high-volume organizations with larger teams and workspaces.', projectLimit:1000, storageBytes:50*GB, maxFileBytes:1*GB, processingSessions:10000, editorLimit:null, memberLimit:null, workspaceLimit:50, activityLevel:'advanced', customPdfBranding:true, priorityProcessing:true, prioritySupport:true, advertisements:false }
];

export function getPlan(id: PlanId | string | undefined): PlanDefinition { return PLANS.find(p=>p.id===id) ?? PLANS[0]; }
export function formatLimit(value:number|null,suffix=''){ return value===null?'Unlimited':`${value.toLocaleString()}${suffix}`; }
export function formatStorage(bytes:number){ if(bytes>=GB) return `${(bytes/GB).toLocaleString('en-IN',{maximumFractionDigits:1})} GB`; return `${Math.round(bytes/MB).toLocaleString('en-IN')} MB`; }
