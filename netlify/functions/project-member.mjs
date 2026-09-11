import { createClient } from '@supabase/supabase-js';
const admin=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export default async request=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return Response.json({error:'Authentication required.'},{status:401});
 try{
  const client=admin();
  const {data:{user:caller},error:ce}=await client.auth.getUser(token); if(ce||!caller)return Response.json({error:'Authentication required.'},{status:401});
  const {data:callerProfile}=await client.from('profiles').select('status').eq('id',caller.id).maybeSingle(); if(callerProfile?.status!=='active')return Response.json({error:'Account is deactivated.'},{status:403});
  const body=await request.json(); const action=body.action==='update'||body.action==='remove'?body.action:'add';
  const projectId=String(body.projectId||''); const userId=String(body.userId||''); const email=String(body.email||'').trim().toLowerCase(); const role=body.role==='editor'?'editor':'member';
  const {data:project}=await client.from('projects').select('*').eq('id',projectId).eq('owner_id',caller.id).maybeSingle(); if(!project)return Response.json({error:'Project not found or you do not own it.'},{status:404});
  if(action==='remove'){
    if(!userId)return Response.json({error:'Member is required.'},{status:400});
    const {error}=await client.from('project_members').delete().eq('project_id',projectId).eq('user_id',userId); if(error)throw error;
    return Response.json({ok:true});
  }
  if(action==='update'){
    if(!userId)return Response.json({error:'Member is required.'},{status:400});
    const {data:member,error}=await client.from('project_members').update({role}).eq('project_id',projectId).eq('user_id',userId).select('user_id,email,display_name,role,created_at').single(); if(error)throw error;
    return Response.json({ok:true,member:{uid:member.user_id,email:member.email,displayName:member.display_name||member.email.split('@')[0],role:member.role,addedAt:member.created_at}});
  }
  if(!email)return Response.json({error:'Email is required.'},{status:400});
  const {data:profile}=await client.from('profiles').select('id,email,display_name,status').ilike('email',email).maybeSingle(); if(!profile)return Response.json({error:'No DocBit account exists with that email.'},{status:404}); if(profile.status!=='active')return Response.json({error:'That account is deactivated and cannot be added.'},{status:400}); if(profile.id===caller.id)return Response.json({error:'The project owner already has full access.'},{status:400});
  const {data:member,error}=await client.from('project_members').upsert({project_id:projectId,user_id:profile.id,email,display_name:profile.display_name||email.split('@')[0],role},{onConflict:'project_id,user_id'}).select('user_id,email,display_name,role,created_at').single(); if(error)throw error;
  return Response.json({ok:true,member:{uid:member.user_id,email:member.email,displayName:member.display_name,role:member.role,addedAt:member.created_at}});
 }catch(error){return Response.json({error:error?.message||'Project member operation failed.'},{status:400});}
};
