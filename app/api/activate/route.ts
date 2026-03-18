import { NextResponse } from 'next/server';
async function validateToken(token: string): Promise<boolean> {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/pro_subscribers` +
      `?access_token=eq.${encodeURIComponent(token)}&status=eq.active&select=id`;
    const res = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch { return false; }
}
async function markActivated(token: string): Promise<void> {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/pro_subscribers?access_token=eq.${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ activated_at: new Date().toISOString() }),
  });
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?error=missing_token', request.url));
  }
  const valid = await validateToken(token);
  if (!valid) {
    return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
  }
  await markActivated(token);
  const response = NextResponse.redirect(new URL('/?activated=true', request.url));
  // httpOnly cookie — read server-side for rate limit bypass
  response.cookies.set('verbatim_pro', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  // UI flag cookie — readable by JavaScript to show Pro status in the UI
  response.cookies.set('verbatim_pro_ui', '1', {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
