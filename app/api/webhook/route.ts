import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ── Stripe signature verification (no SDK needed) ────────────────────────────
function verifyStripeSignature(payload: string, sig: string, secret: string): boolean {
  try {
    const timestamp = sig.split(',').find(e => e.startsWith('t='))?.split('=')[1];
    const signatures = sig.split(',').filter(e => e.startsWith('v1=')).map(e => e.slice(3));
    if (!timestamp || signatures.length === 0) return false;
    const expected = crypto.createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`).digest('hex');
    return signatures.some(s => {
      try { return crypto.timingSafeEqual(Buffer.from(s, 'hex'), Buffer.from(expected, 'hex')); }
      catch { return false; }
    });
  } catch { return false; }
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
function getSupabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
    'Content-Type': 'application/json',
  };
}

async function createProSubscriber(email: string, customerId: string, token: string): Promise<void> {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/pro_subscribers`, {
    method: 'POST',
    headers: { ...getSupabaseHeaders(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ email, stripe_customer_id: customerId, access_token: token, status: 'active' }),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${await res.text()}`);
}

async function cancelProSubscriber(customerId: string): Promise<void> {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/pro_subscribers?stripe_customer_id=eq.${customerId}`, {
    method: 'PATCH',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({ status: 'cancelled' }),
  });
}

// ── Resend magic link email ──────────────────────────────────────────────────
async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const activationUrl = `https://verbatimpdf.com/api/activate?token=${token}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@verbatimpdf.com',
      to: email,
      subject: 'Activate your Verbatim PDF Pro access',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#ffffff;padding:40px;border-radius:12px;">
          <p style="color:#818cf8;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">VERBATIM PDF</p>
          <h1 style="color:#ffffff;font-size:28px;margin-bottom:12px;">You're now Pro.</h1>
          <p style="color:#9ca3af;font-size:16px;margin-bottom:32px;">Click below to activate your unlimited Word to PDF access. This link is unique to your account.</p>
          <a href="${activationUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-weight:bold;font-size:16px;padding:18px 36px;border-radius:50px;text-decoration:none;margin-bottom:32px;">Activate Pro Access →</a>
          <p style="color:#6b7280;font-size:13px;margin-bottom:32px;">Or copy this link:<br/>${activationUrl}</p>
          <hr style="border:1px solid #1f2937;margin:24px 0;" />
          <p style="color:#4b5563;font-size:12px;">Files are never stored · Converted in seconds · No account required</p>
        </div>
      `,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
}

// ── Main webhook handler ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }
  if (!verifyStripeSignature(payload, signature, secret)) {
    console.error('Stripe signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(payload);
  console.log('Stripe webhook received:', event.type);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      const customerId = session.customer;
      if (!email) {
        console.error('No email found in session:', session.id);
        return NextResponse.json({ received: true });
      }
      const token = crypto.randomBytes(32).toString('hex');
      await createProSubscriber(email, customerId, token);
      await sendMagicLinkEmail(email, token);
      console.log(`Pro subscriber created and email sent: ${email}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const customerId = event.data.object.customer;
      await cancelProSubscriber(customerId);
      console.log(`Subscription cancelled for customer: ${customerId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
