import type { CloudUser, UsageSnapshot } from '../types/cloud';
import { getPlan } from '../data/plans';

export function entitlements(user:CloudUser|null){ return getPlan(user?.plan); }
export function canCreateProject(user:CloudUser|null,usage:UsageSnapshot){ const p=entitlements(user); return p.projectLimit===null||usage.projects<p.projectLimit; }
export function canProcess(user:CloudUser|null,usage:UsageSnapshot){ const p=entitlements(user); return p.processingSessions===null||usage.processingSessions<p.processingSessions; }
export function canUpload(user:CloudUser|null,sizeBytes:number){ return sizeBytes<=entitlements(user).maxFileBytes; }
export function canCollaborate(user:CloudUser|null){ return entitlements(user).editorLimit!==0; }
