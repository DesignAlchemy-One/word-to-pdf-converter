import { NextResponse } from 'next/server';

const GOTENBERG_URL = 'https://word-to-pdf-converter-production-0d91.up.railway.app/forms/libreoffice/convert';
const FREE_LIMIT = 10;

// ── Supabase helpers (direct REST API — no SDK needed) ──────────────────────

function getSupabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
    'Content-Type': 'application/json',
  };
}

async function getConversionsToday(ip: string): Promise<number> {
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
    // Fail open — if Supabase is down, don't block conversions
    return 0;
  }

  // Supabase returns count in Content-Range header: "0-9/42"
  const contentRange = res.headers.get('Content-Range');
  if (contentRange) {
    const total = contentRange.split('/')[1];
    return parseInt(total, 10) || 0;
  }

  return 0;
}

async function logConversion(ip: string): Promise<void> {
  const url = `${process.env.SUPABASE_URL}/rest/v1/conversion_log`;

  const res = await fetch(url, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({ ip_address: ip }),
  });

  if (!res.ok) {
    console.error('Supabase log error:', await res.text());
    // Non-fatal — conversion already succeeded, just log the failure
  }
}

// ── IP extraction ────────────────────────────────────────────────────────────

function getClientIP(request: Request): string {
  // Vercel sets x-forwarded-for for all requests
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // May contain multiple IPs — take the first (original client)
    return forwarded.split(',')[0].trim();
  }

  // Fallback headers
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  // Last resort — unknown IP, fail open
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

    // ── Rate limit check ──
    const clientIP = getClientIP(request);
    const conversionsToday = await getConversionsToday(clientIP);

    if (conversionsToday >= FREE_LIMIT) {
      return NextResponse.json(
        { error: 'Free limit reached', limitReached: true },
        { status: 429 }
      );
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
