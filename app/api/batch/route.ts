import { NextResponse } from 'next/server';
import JSZip from 'jszip';

const GOTENBERG_URL = 'https://word-to-pdf-converter-production-0d91.up.railway.app/forms/libreoffice/convert';

const FREE_DAILY_LIMIT = 10;
const FREE_BATCH_LIMIT = 2;
const PRO_BATCH_LIMIT = 20;
const FREE_MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB
const PRO_MAX_FILE_SIZE = 25 * 1024 * 1024;   // 25MB

// ── Supabase helpers ─────────────────────────────────────────────────────────
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
      headers: { ...getSupabaseHeaders(), 'Prefer': 'count=exact' },
    });
    if (!res.ok) return 0;
    const contentRange = res.headers.get('Content-Range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      return parseInt(total, 10) || 0;
    }
    return 0;
  } catch (err) {
    console.error('Supabase getConversionsToday error:', err);
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
    if (!res.ok) console.error('Supabase log error:', await res.text());
  } catch (err) {
    console.error('Supabase logConversion error:', err);
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
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  return 'unknown';
}

// ── Convert a single file via Gotenberg ─────────────────────────────────────
async function convertSingleFile(file: File): Promise<ArrayBuffer> {
  const gotenbergForm = new FormData();
  gotenbergForm.append('files', file, file.name);
  const response = await fetch(GOTENBERG_URL, {
    method: 'POST',
    body: gotenbergForm,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gotenberg error on ${file.name}: ${response.status} ${errorText}`);
  }
  return response.arrayBuffer();
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawFiles = formData.getAll('files');
    const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // ── Pro check ──
    const clientIP = getClientIP(request);
    const isPro = await isProSubscriber(request);

    // ── Validate file count ──
    const batchLimit = isPro ? PRO_BATCH_LIMIT : FREE_BATCH_LIMIT;
    if (files.length > batchLimit) {
      return NextResponse.json(
        {
          error: isPro
            ? `Pro batch limit is ${PRO_BATCH_LIMIT} files per job`
            : `Free batch limit is ${FREE_BATCH_LIMIT} files. Upgrade to Pro for up to ${PRO_BATCH_LIMIT} files.`,
          limitReached: !isPro,
        },
        { status: 400 }
      );
    }

    // ── Validate file sizes ──
    const maxSize = isPro ? PRO_MAX_FILE_SIZE : FREE_MAX_FILE_SIZE;
    const maxSizeLabel = isPro ? '25MB' : '10MB';
    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: `${file.name} exceeds the ${maxSizeLabel} file size limit.${!isPro ? ' Upgrade to Pro for up to 25MB per file.' : ''}`,
            limitReached: !isPro,
          },
          { status: 400 }
        );
      }
    }

    // ── Check daily conversion headroom for free users ──
    if (!isPro) {
      const conversionsToday = await getConversionsToday(clientIP);
      const remaining = FREE_DAILY_LIMIT - conversionsToday;
      if (remaining <= 0) {
        return NextResponse.json(
          { error: 'Daily free limit reached', limitReached: true },
          { status: 429 }
        );
      }
      if (files.length > remaining) {
        return NextResponse.json(
          {
            error: `You have ${remaining} conversion${remaining === 1 ? '' : 's'} left today. Reduce your batch size or upgrade to Pro for unlimited conversions.`,
            limitReached: true,
          },
          { status: 429 }
        );
      }
    }

    // ── Process files sequentially and build ZIP ──
    const zip = new JSZip();
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const file of files) {
      try {
        const pdfBuffer = await convertSingleFile(file);
        const pdfName = file.name.replace(/\.docx?$/i, '.pdf');
        zip.file(pdfName, pdfBuffer);
        await logConversion(clientIP);
        results.push({ name: file.name, success: true });
      } catch (err: any) {
        console.error(`Batch conversion error for ${file.name}:`, err);
        results.push({ name: file.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      return NextResponse.json(
        { error: 'All files failed to convert. Please check your files and try again.' },
        { status: 500 }
      );
    }

    // ── Generate ZIP ──
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const timestamp = new Date().toISOString().slice(0, 10);
    const zipName = `verbatim-pdf-batch-${timestamp}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'X-Batch-Results': JSON.stringify(results),
      },
    });

  } catch (error: any) {
    console.error('Batch conversion error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch conversion failed' },
      { status: 500 }
    );
  }
}
