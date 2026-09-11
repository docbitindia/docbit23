import type { DocumentState } from '../types/document';
import type { Activity, Project, ProjectFile, ProjectMember, Workspace, WorkspaceMember, UsageSnapshot, CloudUser } from '../types/cloud';
import { supabase, type AuthSession } from '../lib/supabase/client';

const now = () => new Date().toISOString();
const fileType = (name: string) => name.toLowerCase().endsWith('.json') ? 'json' : name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
function requireSession(session: AuthSession | null) { if (!session) throw new Error('Sign in to continue.'); }
function clean<T>(data: T | null, error: any): T | null { if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message || 'Cloud data request failed.'); } return data; }

function mapProfile(data: any): CloudUser {
  return {
    uid: data.id,
    email: data.email || '',
    displayName: data.display_name || data.email?.split('@')[0] || 'DocBit user',
    photoURL: data.photo_url || undefined,
    plan: (data.plan || 'free') as CloudUser['plan'],
    createdAt: data.created_at,
    status: data.status || 'active',
    onboardingComplete: Boolean(data.onboarding_complete)
  };
}

export async function getProfile(session: AuthSession | null): Promise<CloudUser | null> {
  requireSession(session);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session!.localId).maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message || 'Profile could not be loaded.');
  }
  return data ? mapProfile(data) : null;
}

export async function updateProfileData(session: AuthSession | null, values: Partial<Pick<CloudUser,'displayName'|'photoURL'>>): Promise<CloudUser> {
  requireSession(session);
  const update: Record<string, string | null> = {};
  if (values.displayName !== undefined) update.display_name = values.displayName.trim();
  if (values.photoURL !== undefined) update.photo_url = values.photoURL || null;
  if (!Object.keys(update).length) {
    const current = await getProfile(session);
    if (!current) throw new Error('Profile could not be loaded.');
    return current;
  }
  const { data, error } = await supabase.from('profiles').update(update).eq('id', session!.localId).select('*').single();
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function uploadProfilePhoto(session: AuthSession | null, file: File): Promise<string> {
  requireSession(session);
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Profile photo must be PNG, JPG or WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photo must be 5 MB or smaller.');
  const current = await getProfile(session);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `avatars/${session!.localId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('profile-media').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
  try {
    await updateProfileData(session, { photoURL: data.publicUrl });
  } catch (e) {
    await supabase.storage.from('profile-media').remove([path]);
    throw e;
  }
  const previous = current?.photoURL?.split('/profile-media/')[1];
  if (previous && previous.startsWith(`avatars/${session!.localId}/`)) await supabase.storage.from('profile-media').remove([decodeURIComponent(previous)]);
  return data.publicUrl;
}

export async function listWorkspaces(session: AuthSession | null): Promise<Workspace[]> {
  requireSession(session);
  const { data, error } = await supabase.from('workspaces').select('*,workspace_members!left(role)').order('updated_at',{ascending:false});
  if(error) throw new Error(error.message);
  return (data||[]).map((w:any)=>({id:w.id,ownerId:w.owner_id,name:w.name,description:w.description||'',slug:w.slug||undefined,createdAt:w.created_at,updatedAt:w.updated_at,role:w.owner_id===session!.localId?'owner':(w.workspace_members?.[0]?.role||'member')}));
}

export async function createWorkspace(session: AuthSession | null, name:string, description=''): Promise<Workspace> {
  requireSession(session);
  const {data,error}=await supabase.rpc('create_workspace',{p_name:name.trim()||'New workspace',p_description:description.trim()});
  if(error) throw new Error(error.message);
  const w=Array.isArray(data)?data[0]:data; if(!w) throw new Error('Workspace could not be created.');
  return {id:w.id,ownerId:w.owner_id,name:w.name,description:w.description||'',slug:w.slug||undefined,createdAt:w.created_at,updatedAt:w.updated_at,role:'owner'};
}

export async function listWorkspaceMembers(session: AuthSession | null, workspaceId:string): Promise<WorkspaceMember[]> {
  requireSession(session);
  const {data,error}=await supabase.from('workspace_members').select('user_id,role,created_at,email,display_name').eq('workspace_id',workspaceId).order('created_at');
  if(error) throw new Error(error.message);
  return (data||[]).map((m:any)=>({uid:m.user_id,email:m.email||'',displayName:m.display_name||m.email?.split('@')[0]||'User',role:m.role,addedAt:m.created_at}));
}

export async function inviteWorkspaceMember(session: AuthSession | null, workspaceId:string, email:string, role:'admin'|'editor'|'member') {
  requireSession(session);
  const {data,error}=await supabase.rpc('invite_workspace_member',{p_workspace_id:workspaceId,p_email:email.trim().toLowerCase(),p_role:role});
  if(error) throw new Error(error.message); return data;
}

export async function updateWorkspaceMember(session: AuthSession | null, workspaceId:string, userId:string, role:'admin'|'editor'|'member') {
  requireSession(session); const {error}=await supabase.rpc('update_workspace_member',{p_workspace_id:workspaceId,p_user_id:userId,p_role:role}); if(error) throw new Error(error.message);
}

export async function removeWorkspaceMember(session: AuthSession | null, workspaceId:string, userId:string) {
  requireSession(session); const {error}=await supabase.rpc('remove_workspace_member',{p_workspace_id:workspaceId,p_user_id:userId}); if(error) throw new Error(error.message);
}

export async function listProjects(session: AuthSession | null, workspaceId?:string): Promise<Project[]> {
  requireSession(session);
  let q=supabase.from('projects').select('*').order('updated_at',{ascending:false});
  if(workspaceId) q=q.eq('workspace_id',workspaceId);
  const {data,error}=await q; if(error) throw new Error(error.message);
  const members=await supabase.from('project_members').select('project_id,role').eq('user_id',session!.localId);
  if(members.error) throw new Error(members.error.message); const roles=new Map((members.data||[]).map((m:any)=>[m.project_id,m.role]));
  return (data||[]).map((p:any)=>({...p,workspaceId:p.workspace_id,createdAt:p.created_at,updatedAt:p.updated_at,ownerId:p.owner_id,fileCount:p.file_count,storageBytes:p.storage_bytes,accessRole:p.owner_id===session!.localId?'owner':(roles.get(p.id)==='editor'?'editor':'member')}));
}

export async function createProject(session: AuthSession | null, name: string, description = '', workspaceId?: string): Promise<Project> {
  requireSession(session);
  const { data, error } = await supabase.rpc('create_project', {
    p_name: name.trim() || 'Untitled project',
    p_description: description.trim(),
    p_workspace_id: workspaceId || (typeof window !== 'undefined' ? window.localStorage.getItem('docbit_workspace_id') : null)
  });
  if (error) throw new Error(error.message);
  const projectRow = Array.isArray(data) ? data[0] : data;
  if (!projectRow) throw new Error('Project could not be created.');
  const project = { ...projectRow, ownerId: projectRow.owner_id, fileCount: projectRow.file_count, storageBytes: projectRow.storage_bytes, createdAt: projectRow.created_at, updatedAt: projectRow.updated_at } as Project;
  await addActivity(session, { type: 'project_created', projectId: project.id, label: `Created project “${project.name}”` });
  return project;
}

export async function updateProject(session: AuthSession | null, projectId: string, patch: Pick<Project,'name'|'description'>) {
  requireSession(session);
  const { data, error } = await supabase.from('projects').update({ name: patch.name.trim(), description: patch.description.trim() }).eq('id', projectId).eq('owner_id', session!.localId).select().single();
  if (error) throw new Error(error.message);
  return { ...data, ownerId: data.owner_id, fileCount: data.file_count, storageBytes: data.storage_bytes, createdAt: data.created_at, updatedAt: data.updated_at } as Project;
}

export async function deleteProject(session: AuthSession | null, projectId: string) {
  requireSession(session);
  const response = await fetch('/.netlify/functions/project-actions',{method:'POST',headers:{Authorization:`Bearer ${session!.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({action:'delete',projectId})});
  const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data?.error||'Project could not be deleted.');
}

export async function listProjectFiles(session: AuthSession | null, projectId: string): Promise<ProjectFile[]> {
  requireSession(session);
  const { data, error } = await supabase.from('project_files').select('*').eq('project_id', projectId).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((f: any) => ({ ...f, projectId: f.project_id, ownerId: f.owner_id, originalName: f.original_name, fileType: f.file_type, storagePath: f.storage_path, documentPath: f.document_path, updatedAt: f.updated_at, createdAt: f.created_at, lastOpenedAt: f.last_opened_at }));
}

export async function saveProjectFile(session: AuthSession | null, project: Project, originalFile: File, document: DocumentState, existing?: ProjectFile): Promise<ProjectFile> {
  requireSession(session);
  const id = existing?.id ?? crypto.randomUUID();
  const sourcePath = `${project.id}/${id}/original/${originalFile.name}`;
  const documentPath = `${project.id}/${id}/versions/${Date.now()}.json`;
  if (!existing) {
    const { error } = await supabase.storage.from('project-files').upload(sourcePath, originalFile, { upsert: false, contentType: originalFile.type || 'application/octet-stream' });
    if (error) throw new Error(error.message);
  }
  const json = new Blob([JSON.stringify(document)], { type: 'application/json' });
  const { error: versionError } = await supabase.storage.from('project-files').upload(documentPath, json, { upsert: false, contentType: 'application/json' });
  if (versionError) {
    if (!existing) await supabase.storage.from('project-files').remove([sourcePath]);
    throw new Error(versionError.message);
  }
  const recordDb = { id, project_id: project.id, owner_id: project.ownerId, name: document.config.design.fileName || originalFile.name, original_name: originalFile.name, file_type: fileType(originalFile.name), size: originalFile.size, storage_path: sourcePath, document_path: documentPath, version: (existing?.version ?? 0) + 1, last_opened_at: now() };
  let data: any; let error: any;
  if (existing) {
    const result = await supabase.from('project_files').update({ name: recordDb.name, original_name: recordDb.original_name, file_type: recordDb.file_type, size: recordDb.size, storage_path: recordDb.storage_path, document_path: recordDb.document_path, version: recordDb.version, last_opened_at: recordDb.last_opened_at }).eq('id', id).eq('project_id', project.id).select().single();
    data=result.data; error=result.error;
  } else {
    const result = await supabase.from('project_files').insert(recordDb).select().single();
    data=result.data; error=result.error;
  }
  if (error) {
    await supabase.storage.from('project-files').remove([documentPath]);
    if (!existing) await supabase.storage.from('project-files').remove([sourcePath]);
    throw new Error(error.message);
  }
  await addActivity(session, { type: existing ? 'changes_saved' : 'file_added_to_project', projectId: project.id, fileId: id, label: existing ? `Saved changes to “${originalFile.name}”` : `Added “${originalFile.name}” to ${project.name}` });
  return { ...data, projectId: data.project_id, ownerId: data.owner_id, originalName: data.original_name, fileType: data.file_type, storagePath: data.storage_path, documentPath: data.document_path, updatedAt: data.updated_at, createdAt: data.created_at, lastOpenedAt: data.last_opened_at } as ProjectFile;
}

export async function downloadProjectDocument(session: AuthSession | null, file: ProjectFile): Promise<DocumentState> {
  requireSession(session);
  const { data, error } = await supabase.storage.from('project-files').download(file.documentPath);
  if (error) throw new Error(error.message);
  return JSON.parse(await data.text()) as DocumentState;
}

export async function downloadProjectFile(session: AuthSession | null, file: ProjectFile): Promise<Blob> {
  requireSession(session);
  const { data, error } = await supabase.storage.from('project-files').download(file.storagePath);
  if (error) throw new Error(error.message);
  return data;
}

export async function addActivity(session: AuthSession | null, input: Omit<Activity,'id'|'userId'|'createdAt'>) {
  requireSession(session);
  const { data, error } = await supabase.from('activities').insert({ user_id: session!.localId, type: input.type, project_id: input.projectId || null, file_id: input.fileId || null, label: input.label }).select().single();
  if (error) throw new Error(error.message);
  return { id: data.id, userId: data.user_id, projectId: data.project_id || undefined, fileId: data.file_id || undefined, type: data.type, label: data.label, createdAt: data.created_at } as Activity;
}

export async function listActivity(session: AuthSession | null): Promise<Activity[]> {
  requireSession(session);
  const { data, error } = await supabase.from('activities').select('*').eq('user_id', session!.localId).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map((a:any)=>({ id:a.id,userId:a.user_id,projectId:a.project_id||undefined,fileId:a.file_id||undefined,type:a.type,label:a.label,createdAt:a.created_at }));
}

export async function listMembers(session: AuthSession | null, projectId: string): Promise<ProjectMember[]> {
  requireSession(session);
  const { data, error } = await supabase.from('project_members').select('user_id,email,display_name,role,created_at').eq('project_id', projectId).order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map((m:any)=>({ uid:m.user_id,email:m.email,displayName:m.display_name||m.email.split('@')[0],role:m.role,addedAt:m.created_at }));
}

export async function inviteProjectMember(session: AuthSession | null, projectId: string, email: string, role: 'editor'|'member') {
  requireSession(session);
  const { data, error } = await supabase.rpc('manage_project_member', {
    p_action: 'add', p_project_id: projectId, p_email: email.trim().toLowerCase(), p_role: role
  });
  if (error) throw new Error(error.message);
  if (!data?.member) throw new Error('Member could not be added.');
  return data.member as ProjectMember;
}

export async function updateProjectMember(session: AuthSession | null, projectId: string, userId: string, role: 'editor'|'member') {
  requireSession(session);
  const { data, error } = await supabase.rpc('manage_project_member', {
    p_action: 'update', p_project_id: projectId, p_user_id: userId, p_role: role
  });
  if (error) throw new Error(error.message);
  if (!data?.member) throw new Error('Member could not be updated.');
  return data.member as ProjectMember;
}

export async function removeProjectMember(session: AuthSession | null, projectId: string, userId: string) {
  requireSession(session);
  const { error } = await supabase.rpc('manage_project_member', {
    p_action: 'remove', p_project_id: projectId, p_user_id: userId
  });
  if (error) throw new Error(error.message);
}

export async function getUsage(session: AuthSession | null, period = 'current'): Promise<UsageSnapshot> {
  requireSession(session);
  const {data:usage,error}=await supabase.from('usage').select('*').eq('user_id',session!.localId).eq('period',period).maybeSingle();
  if(error) throw new Error(error.message);
  const projects=await listProjects(session);
  const members=await supabase.from('workspace_members').select('user_id,role').eq('user_id',session!.localId);
  if(members.error) throw new Error(members.error.message);
  return {processingSessions:Number(usage?.processing_sessions ?? usage?.processed_files ?? 0),storageBytes:projects.reduce((sum,p)=>sum+Number(p.storageBytes||0),0),projects:projects.length,members:members.data?.length||0,editors:0};
}

export async function listSessions(session: AuthSession | null) {
  requireSession(session);
  const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', session!.localId).order('last_seen_at',{ascending:false});
  if(error) throw new Error(error.message);
  return data || [];
}
export async function removeSession(session: AuthSession | null, id: string) { requireSession(session); const { error } = await supabase.from('user_sessions').delete().eq('id',id).eq('user_id',session!.localId); if(error) throw new Error(error.message); }

export async function deleteAccount(session: AuthSession | null, action:'deactivate'|'delete') {
  requireSession(session);
  const response = await fetch('/.netlify/functions/account-actions',{method:'POST',headers:{Authorization:`Bearer ${session!.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({action})});
  const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data?.error||'Account action failed.'); return data;
}

export async function incrementProcessedUsage(session: AuthSession | null) { requireSession(session); const { data, error } = await supabase.rpc('consume_processing_session'); if(error) throw new Error(error.message); if(data === false) throw new Error('Your monthly processing-session limit has been reached. Upgrade your plan to continue.'); return true; }

export interface BillingSnapshot {
  subscription: { plan:string; status:string; billingCycle:string; currentPeriodEnd?:string; providerSubscriptionId?:string; providerOrderId?:string } | null;
  payments: Array<{ id:string; amountPaise:number; currency:string; status:string; providerPaymentId?:string; createdAt:string }>;
}

export async function getBilling(session: AuthSession | null): Promise<BillingSnapshot> {
  requireSession(session);
  const [{data:sub,error:subError},{data:payments,error:paymentError}] = await Promise.all([
    supabase.from('subscriptions').select('plan,status,billing_cycle,current_period_end,provider_subscription_id,provider_order_id').eq('user_id',session!.localId).maybeSingle(),
    supabase.from('payments').select('id,amount_paise,currency,status,provider_payment_id,created_at').eq('user_id',session!.localId).order('created_at',{ascending:false}).limit(20)
  ]);
  if(subError) throw new Error(subError.message);
  if(paymentError) throw new Error(paymentError.message);
  return {
    subscription: sub ? {plan:sub.plan,status:sub.status,billingCycle:sub.billing_cycle,currentPeriodEnd:sub.current_period_end||undefined,providerSubscriptionId:sub.provider_subscription_id||undefined,providerOrderId:sub.provider_order_id||undefined} : null,
    payments:(payments||[]).map((p:any)=>({id:p.id,amountPaise:Number(p.amount_paise),currency:p.currency,status:p.status,providerPaymentId:p.provider_payment_id||undefined,createdAt:p.created_at}))
  };
}

export async function startRazorpayCheckout(session: AuthSession | null, planId: 'starter'|'pro'|'pro_plus', cycle:'monthly'|'yearly'): Promise<void> {
  requireSession(session);
  const response = await fetch('/.netlify/functions/razorpay-create-order',{method:'POST',headers:{Authorization:`Bearer ${session!.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({planId,cycle})});
  const order = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(order?.error||'Could not start checkout.');
  const win = window as any;
  if(!win.Razorpay) {
    await new Promise<void>((resolve,reject)=>{const existing=document.querySelector('script[data-razorpay]');if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Razorpay could not be loaded.')),{once:true});return;}const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.dataset.razorpay='true';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Razorpay could not be loaded.'));document.head.appendChild(script);});
  }
  await new Promise<void>((resolve,reject)=>{
    const checkout=new win.Razorpay({key:order.key_id,amount:order.amount,currency:order.currency,name:'DocBit',description:`DocBit ${planId} — ${cycle}`,order_id:order.id,prefill:{name:userName(session!),email:session!.email},theme:{color:'#2563EB'},handler:async(payload:any)=>{try{const verify=await fetch('/.netlify/functions/razorpay-verify-payment',{method:'POST',headers:{Authorization:`Bearer ${session!.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({planId,cycle,razorpay_order_id:payload.razorpay_order_id,razorpay_payment_id:payload.razorpay_payment_id,razorpay_signature:payload.razorpay_signature})});const result=await verify.json().catch(()=>({}));if(!verify.ok)throw new Error(result?.error||'Payment verification failed.');resolve();window.location.reload();}catch(e){reject(e);}},modal:{ondismiss:()=>reject(new Error('Payment was cancelled.'))}});checkout.open();
  });
}
function userName(session:AuthSession){return session.displayName||session.email.split('@')[0];}

export async function listPdfConfigurations(session: AuthSession | null, projectId: string): Promise<import('../types/cloud').PdfConfiguration[]> {
  requireSession(session);
  const { data, error } = await supabase.from('pdf_configurations').select('*').eq('project_id', projectId).order('updated_at',{ascending:false});
  if(error) throw new Error(error.message);
  return (data||[]).map((x:any)=>({id:x.id,projectId:x.project_id,ownerId:x.owner_id,name:x.name,config:x.config||{},createdAt:x.created_at,updatedAt:x.updated_at}));
}
export async function savePdfConfiguration(session: AuthSession | null, projectId: string, name: string, config: Record<string,any>) {
  requireSession(session);
  const { data, error } = await supabase.rpc('save_pdf_configuration',{p_project_id:projectId,p_name:name.trim()||'PDF configuration',p_config:config});
  if(error) throw new Error(error.message);
  return data;
}
