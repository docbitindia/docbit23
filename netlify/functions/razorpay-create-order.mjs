import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const admin=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const PRICES={starter:{monthly:299,yearly:2990},pro:{monthly:699,yearly:6990},pro_plus:{monthly:1499,yearly:14990}};

export default async request=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)return Response.json({error:'Paid billing is not configured yet.'},{status:503});
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return Response.json({error:'Authentication required.'},{status:401});
 try{
  const a=admin(); const {data:{user},error}=await a.auth.getUser(token); if(error||!user)return Response.json({error:'Authentication required.'},{status:401});
  const body=await request.json().catch(()=>({})); const planId=String(body.planId||''); const cycle=body.cycle==='yearly'?'yearly':'monthly'; const price=PRICES[planId]?.[cycle];
  if(!price)return Response.json({error:'Invalid plan or billing cycle.'},{status:400});
  const credentials=Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:`Basic ${credentials}`,'Content-Type':'application/json'},body:JSON.stringify({amount:Math.round(price*100),currency:'INR',receipt:`docbit_${user.id}_${crypto.randomUUID()}`,notes:{userId:user.id,planId,billingCycle:cycle}})});
  const result=await response.json(); if(!response.ok)return Response.json(result,{status:response.status});
  return Response.json({...result,key_id:process.env.RAZORPAY_KEY_ID,planId,billingCycle:cycle});
 }catch(e){return Response.json({error:e?.message||'Payment order creation failed.'},{status:500});}
};
