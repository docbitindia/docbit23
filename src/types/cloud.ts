import type { PlanId } from '../data/plans';
export type WorkspaceRole = 'owner'|'admin'|'editor'|'member';
export type ProjectRole = 'owner'|'editor'|'member';
export type ActivityType = 'project_created'|'file_uploaded'|'file_analyzed'|'file_added_to_project'|'file_edited'|'changes_saved'|'file_exported'|'member_added'|'member_removed'|'workspace_created'|'workspace_member_added'|'workspace_member_removed'|'role_changed'|'report_generated'|'template_created'|'template_updated';
export interface CloudUser { uid:string; email:string; displayName:string; photoURL?:string; plan:PlanId; createdAt:string; status?:'active'|'deactivated'; onboardingComplete?:boolean; }
export interface Workspace { id:string; ownerId:string; name:string; description:string; slug?:string; createdAt:string; updatedAt:string; role:WorkspaceRole; }
export interface Project { id:string; workspaceId?:string; ownerId:string; name:string; description:string; fileCount:number; storageBytes?:number; updatedAt:string; createdAt:string; accessRole?:'owner'|'editor'|'member'; }
export interface ProjectFile { id:string; projectId:string; ownerId:string; name:string; originalName:string; fileType:string; size:number; storagePath:string; documentPath:string; version:number; updatedAt:string; createdAt:string; lastOpenedAt?:string; }
export interface ProjectMember { uid:string; email:string; displayName:string; role:'editor'|'member'; addedAt:string; }
export interface WorkspaceMember { uid:string; email:string; displayName:string; role:WorkspaceRole; addedAt:string; }
export interface Activity { id:string; type:ActivityType; userId:string; projectId?:string; fileId?:string; label:string; createdAt:string; }
export interface PdfConfiguration { id:string; projectId:string; ownerId:string; name:string; config:Record<string, unknown>; createdAt:string; updatedAt:string; }
export interface UsageSnapshot { processingSessions:number; storageBytes:number; projects:number; members:number; editors:number; }
