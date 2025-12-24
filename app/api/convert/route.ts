import { NextResponse } from 'next/server';

const GOTENBERG_URL = 'https://word-to-pdf-gotenberg.onrender.com/forms/libreoffice/convert';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Create a new FormData for Gotenberg
    const gotenbergForm = new FormData();
    gotenbergForm.append('files', file, file.name);

    // Send to Gotenberg (it may take 10-30s on first request due to Render cold start)
    const response = await fetch(GOTENBERG_URL, {
      method: 'POST',
      body: gotenbergForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg error: ${response.status} ${errorText}`);
    }

    // Get the PDF blob
    const pdfBlob = await response.blob();

    // Return the PDF directly to the browser
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace('.docx', '.pdf')}"`,
      },
    });
  } catch (error: any) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 500 });
  }
}
