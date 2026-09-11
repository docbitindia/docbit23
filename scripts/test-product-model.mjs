import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const plans = {
  free: {projects:10,storage:250*1024**2,maxFile:25*1024**2,sessions:10,editors:0,users:0,workspaces:1},
  starter: {projects:50,storage:2*1024**3,maxFile:100*1024**2,sessions:50,editors:0,users:0,workspaces:3},
  pro: {projects:100,storage:10*1024**3,maxFile:500*1024**2,sessions:1000,editors:50,users:500,workspaces:10},
  pro_plus: {projects:1000,storage:50*1024**3,maxFile:1024*1024**2,sessions:10000,editors:null,users:null,workspaces:50}
};
assert.equal(plans.free.projects,10); assert.equal(plans.starter.maxFile,100*1024**2); assert.equal(plans.pro.maxFile,500*1024**2); assert.equal(plans.pro_plus.maxFile,1024*1024**2);
const source = await readFile(new URL('../src/data/plans.ts', import.meta.url),'utf8');
for (const obsolete of ['maxRows','monthlyFileEditing','processedFiles','savedFiles','storageMb','maxFileMb']) assert(!source.includes(obsolete),`obsolete commercial field remains: ${obsolete}`);
const migration = await readFile(new URL('../supabase/migrations/20260902001100_production_workspace_entitlements.sql', import.meta.url),'utf8');
for (const required of ['workspaces','workspace_members','workspace_role','consume_processing_session','prevent_client_plan_change','can_workspace_access','can_project_access']) assert(migration.includes(required),`missing production model item: ${required}`);
const robots=await readFile(new URL('../public/robots.txt',import.meta.url),'utf8'); assert(robots.includes('Sitemap: https://docbit.in/sitemap.xml'));
console.log('DocBit product-model checks passed.');
