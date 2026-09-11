import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const admin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PRICES = {
  starter: { monthly: 299, yearly: 2990 },
  pro: { monthly: 699, yearly: 6990 },
  pro_plus: { monthly: 1499, yearly: 14990 }
};

export default async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const a = admin();
    const { data: { user }, error: authError } = await a.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const planId = String(body.planId || '');
    const cycle = body.cycle === 'yearly' ? 'yearly' : 'monthly';
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    const expectedAmount = PRICES[planId]?.[cycle];
    if (!expectedAmount || !orderId || !paymentId || !signature) {
      return Response.json({ error: 'Invalid payment details.' }, { status: 400 });
    }

    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${orderId}|${paymentId}`).digest('hex');
    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return Response.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Basic ${credentials}` } });
    const razorOrder = await orderResponse.json();
    if (!orderResponse.ok || Number(razorOrder.amount) !== Math.round(expectedAmount * 100) || razorOrder.currency !== 'INR' || razorOrder.notes?.userId !== user.id || razorOrder.notes?.planId !== planId || razorOrder.notes?.billingCycle !== cycle) {
      return Response.json({ error: 'Payment order could not be verified.' }, { status: 400 });
    }

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${credentials}` } });
    const razorPayment = await paymentResponse.json();
    if (!paymentResponse.ok || razorPayment.order_id !== orderId || razorPayment.amount !== Math.round(expectedAmount * 100) || razorPayment.currency !== 'INR' || !['captured','authorized'].includes(razorPayment.status)) {
      return Response.json({ error: 'Payment capture could not be verified.' }, { status: 400 });
    }

    const { data: existing } = await a.from('payments').select('id').eq('provider_payment_id', paymentId).maybeSingle();
    if (existing) return Response.json({ ok: true, alreadyProcessed: true });

    const now = new Date();
    const end = new Date(now);
    if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);

    const { error: paymentError } = await a.from('payments').insert({
      user_id: user.id,
      provider: 'razorpay',
      provider_payment_id: paymentId,
      amount_paise: Math.round(expectedAmount * 100),
      currency: 'INR',
      status: 'captured',
      metadata: { orderId, planId, billingCycle: cycle }
    });
    if (paymentError) throw paymentError;

    const { error: subError } = await a.from('subscriptions').upsert({
      user_id: user.id,
      plan: planId,
      status: 'active',
      billing_cycle: cycle,
      provider: 'razorpay',
      provider_subscription_id: null,
      provider_order_id: orderId,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString()
    }, { onConflict: 'user_id' });
    if (subError) throw subError;

    const { error: profileError } = await a.from('profiles').update({ plan: planId }).eq('id', user.id);
    if (profileError) throw profileError;

    return Response.json({ ok: true, planId, billingCycle: cycle });
  } catch (e) {
    return Response.json({ error: e?.message || 'Payment verification failed.' }, { status: 400 });
  }
};
