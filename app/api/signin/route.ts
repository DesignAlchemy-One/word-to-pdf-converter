import { NextResponse } from 'next/server';
// ── Supabase helpers ─────────────────────────────────────────────────────────
function getSupabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
  };
}
async function getSubscriberByEmail(email: string): Promise<{ access_token: string } | null> {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/pro_subscribers` +
      `?email=eq.${encodeURIComponent(email)}&status=eq.active&select=access_token`;
    const res = await fetch(url, { headers: getSupabaseHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch { return null; }
}
// ── Resend sign-in email ─────────────────────────────────────────────────────
async function sendSignInEmail(email: string, token: string): Promise<void> {
  const activationUrl = `https://verbatimpdf.com/api/activate?token=${encodeURIComponent(token)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@verbatimpdf.com',
      to: email,
      subject: 'Sign in to Verbatim PDF Pro',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#ffffff;padding:40px;border-radius:12px;">
          <p style="color:#818cf8;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">VERBATIM PDF</p>
          <h1 style="color:#ffffff;font-size:28px;margin-bottom:12px;">Sign in to Pro.</h1>
          <p style="color:#9ca3af;font-size:16px;margin-bottom:32px;">Copy the link below and paste it into the browser where you want Pro access activated. This link is unique to your account.</p>
          <a href="${activationUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-weight:bold;font-size:16px;padding:18px 36px;border-radius:50px;text-decoration:none;margin-bottom:32px;">Activate Pro Access →</a>
          <p style="color:#6b7280;font-size:13px;margin-bottom:32px;"><strong style="color:#9ca3af;">Copy and paste this link into your target browser:</strong><br/>${activationUrl}</p>
          <hr style="border:1px solid #1f2937;margin:24px 0;" />
          <p style="color:#4b5563;font-size:12px;">Files are never stored · Converted in seconds · No account required</p>
        </div>
      `,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
}
// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const subscriber = await getSubscriberByEmail(email.toLowerCase().trim());
    // Always return success — never reveal whether an email is in the system
    if (!subscriber) {
      return NextResponse.json({ success: true });
    }
    await sendSignInEmail(email.toLowerCase().trim(), subscriber.access_token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sign-in error:', error.message);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
