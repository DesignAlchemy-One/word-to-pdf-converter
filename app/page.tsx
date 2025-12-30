'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversionsToday, setConversionsToday] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const FREE_LIMIT = 10;

  // Load today's conversion count from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('pdf_conversions');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === today) {
        setConversionsToday(data.count);
      }
    }
  }, []);

  // Automatically show upgrade modal and clear old download when limit reached
  useEffect(() => {
    if (conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
      setDownloadUrl(null); // Clear any old download button
    }
  }, [conversionsToday]);

  const incrementConversion = () => {
    const today = new Date().toDateString();
    const newCount = conversionsToday + 1;
    setConversionsToday(newCount);
    localStorage.setItem('pdf_conversions', JSON.stringify({ date: today, count: newCount }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // If limit reached, show upgrade (redundant but safe)
    if (conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Conversion failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      incrementConversion();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Word to PDF Converter</h1>
        <p className="text-gray-300 mb-2">Upload a .docx file → Get a perfect PDF instantly</p>
        <p className="text-sm text-gray-400 mb-6">
          Free tier: {FREE_LIMIT - conversionsToday} / {FREE_LIMIT} conversions left today
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
          />

          <button
            type="submit"
            disabled={!file || loading || conversionsToday >= FREE_LIMIT}
            className="w-full py-4 px-8 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Converting... (may take 10-30s first time)' : 'Convert to PDF'}
          </button>
        </form>

        {error && <p className="text-red-400 mt-6">{error}</p>}

        {downloadUrl && (
          <div className="mt-8">
            <p className="text-green-400 mb-4">Conversion complete! 🎉</p>
            <a
              href={downloadUrl}
              download={file?.name.replace('.docx', '.pdf') || 'converted.pdf'}
              className="inline-block py-4 px-8 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition"
            >
              Download Your PDF
            </a>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
              <h2 className="text-3xl font-bold text-white mb-4">Upgrade for Unlimited</h2>
              <p className="text-gray-300 mb-8">
                You've reached the free limit of {FREE_LIMIT} conversions today.
              </p>

              <div className="space-y-4">
                <a
                  href="https://buy.stripe.com/00w5kD9cY4RA0fM0z04Vy06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 text-center text-lg transition"
                >
                  $2.99 / month<br />
                  <span className="text-sm font-normal">Unlimited conversions</span>
                </a>

                <a
                  href="https://buy.stripe.com/28EcN53SE1Fo0fMa9A4Vy08"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-5 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 text-center text-lg transition"
                >
                  $9.99 Lifetime<br />
                  <span className="text-sm font-normal">Everything forever — no recurring fees</span>
                </a>
              </div>

              <button
                onClick={() => setShowUpgrade(false)}
                className="mt-8 text-gray-400 hover:text-white text-sm"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
