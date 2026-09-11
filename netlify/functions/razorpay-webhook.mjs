import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const admin=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
export default async request=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const raw=await request.text(); const signature=request.headers.get('x-razorpay-signature')||''; const secret=process.env.RAZORPAY_WEBHOOK_SECRET||'';
 if(!secret)return Response.json({error:'Webhook secret is not configured.'},{status:503});
 const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
 if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return Response.json({error:'Invalid signature.'},{status:401});
 try{
  const event=JSON.parse(raw); const a=admin();
  const entity=event?.payload?.subscription?.entity||event?.payload?.payment?.entity||event?.payload?.order?.entity||{};
  const userId=entity?.notes?.userId||entity?.notes?.user_id||null;
  const planId=entity?.notes?.planId||entity?.notes?.plan_id||null;
  const cycle=entity?.notes?.billingCycle||entity?.notes?.billing_cycle||'monthly';
  const {data:logged,error:logError}=await a.from('billing_events').insert({event_type:event.event,user_id:userId,payload:event}).select('id').single();
  if(logError)throw logError;
  if(userId && event.event?.startsWith('payment.') && entity.id){
    const amount=Number(entity.amount||0);
    if(amount>0){await a.from('payments').upsert({user_id:userId,provider:'razorpay',provider_payment_id:entity.id,amount_paise:amount,currency:entity.currency||'INR',status:entity.status||'created',metadata:{orderId:entity.order_id||null,planId,billingCycle:cycle}},{onConflict:'provider_payment_id'});}
  }
  if(userId && event.event?.startsWith('subscription.')){
    const statusMap={active:'active',authenticated:'active',charged:'active',completed:'active',halted:'past_due',cancelled:'canceled',expired:'expired'};
    const status=statusMap[event.event.split('.')[1]]||'active';
    await a.from('subscriptions').upsert({user_id:userId,plan:planId||'free',status,billing_cycle:cycle,provider:'razorpay',provider_subscription_id:entity.id||null,current_period_start:entity.current_start?new Date(entity.current_start*1000).toISOString():null,current_period_end:entity.current_end?new Date(entity.current_end*1000).toISOString():null},{onConflict:'user_id'});
    if(planId && ['starter','pro','pro_plus'].includes(planId)) await a.from('profiles').update({plan:planId}).eq('id',userId);
  }
  return Response.json({received:true,eventId:logged.id});
 }catch(e){return Response.json({error:e?.message||'Webhook failed.'},{status:400});}
};
