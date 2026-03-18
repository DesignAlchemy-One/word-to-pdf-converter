import { NextResponse } from 'next/server';
const GOTENBERG_URL = 'https://word-to-pdf-converter-production-0d91.up.railway.app/forms/libreoffice/convert';
const FREE_LIMIT = 10;
// ── Supabase helpers (direct REST API — no SDK needed) ──────────────────────
function getSupabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
  };
}
async function getConversionsToday(ip: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const url = `${process.env.SUPABASE_URL}/rest/v1/conversion_log` +
      `?ip_address=eq.${encodeURIComponent(ip)}` +
      `&converted_at=gte.${startOfDay.toISOString()}` +
      `&select=id`;
    const res = await fetch(url, {
      headers: {
        ...getSupabaseHeaders(),
        'Prefer': 'count=exact',
      },
    });
    if (!res.ok) {
      console.error('Supabase count error:', await res.text());
      return 0;
    }
    const contentRange = res.headers.get('Content-Range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      return parseInt(total, 10) || 0;
    }
    return 0;
  } catch (err) {
    console.error('Supabase getConversionsToday network error:', err);
    return 0;
  }
}
async function logConversion(ip: string): Promise<void> {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/conversion_log`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({ ip_address: ip }),
    });
    if (!res.ok) {
      console.error('Supabase log error:', await res.text());
    }
  } catch (err) {
    console.error('Supabase logConversion network error:', err);
  }
}
// ── Pro subscriber check ─────────────────────────────────────────────────────
async function isProSubscriber(request: Request): Promise<boolean> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/verbatim_pro=([^;]+)/);
    if (!match) return false;
    const token = decodeURIComponent(match[1]);
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
// ── IP extraction ────────────────────────────────────────────────────────────
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  return 'unknown';
}
// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
// ── Pro check + Rate limit ──
    const clientIP = getClientIP(request);
    const isPro = await isProSubscriber(request);
    if (!isPro) {
      const conversionsToday = await getConversionsToday(clientIP);
      if (conversionsToday >= FREE_LIMIT) {
        return NextResponse.json(
          { error: 'Free limit reached', limitReached: true },
          { status: 429 }
        );
      }
    }
    // ── Convert ──
    const gotenbergForm = new FormData();
    gotenbergForm.append('files', file, file.name);
    const response = await fetch(GOTENBERG_URL, {
      method: 'POST',
      body: gotenbergForm,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg error: ${response.status} ${errorText}`);
    }
    const pdfBlob = await response.blob();
    // ── Log successful conversion ──
    await logConversion(clientIP);
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.docx?$/i, '.pdf')}"`,
      },
    });
  } catch (error: any) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: error.message || 'Conversion failed' },
      { status: 500 }
    );
  }
}
