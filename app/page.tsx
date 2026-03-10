'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  // Auto-show upgrade modal when limit reached
  useEffect(() => {
    if (conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
    }
  }, [conversionsToday]);

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const incrementConversion = () => {
    const today = new Date().toDateString();
    const newCount = conversionsToday + 1;
    setConversionsToday(newCount);
    localStorage.setItem('pdf_conversions', JSON.stringify({ date: today, count: newCount }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
  const errData = await res.json().catch(() => null);
  if (errData?.limitReached) {
    setShowUpgrade(true);
    setLoading(false);
    return;
  }
  throw new Error(errData?.error || 'Conversion failed');
}
      const blob = await res.blob();
      // Trigger automatic download
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file?.name.replace(/\.docx?$/i, '.pdf') || 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      // Show styled success message
      setSuccessMessage(`✓ ${file.name.replace(/\.docx?$/i, '.pdf')} is downloading now`);
      incrementConversion();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">

        {/* ── Wordmark ── */}
        <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
          Verbatim PDF
        </p>

        <h1 className="text-4xl font-bold text-white mb-4">Word to PDF Converter</h1>
        <p className="text-gray-300 mb-2">Upload a .docx file → Get a pixel-perfect PDF instantly</p>
        <p className="text-sm text-gray-400 mb-6">
          Free tier: {FREE_LIMIT - conversionsToday} / {FREE_LIMIT} conversions left today
        </p>

        {/* ── Success Banner ── */}
        {successMessage && (
          <div className="mb-6 px-4 py-3 bg-green-900 border border-green-500 rounded-lg text-green-300 text-sm font-medium animate-pulse">
            {successMessage}
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-900 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="file"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setSuccessMessage(null);
              setError(null);
            }}
            required
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
          />
          <button
            type="submit"
            disabled={!file || loading || conversionsToday >= FREE_LIMIT}
            className="w-full py-4 px-8 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Converting...' : 'Convert to PDF'}
          </button>
        </form>

        {/* ── Privacy note ── */}
        <p className="mt-6 text-xs text-gray-500">
          Files are never stored · Converted in seconds · No account required
        </p>

        {/* ── Upgrade Modal ── */}
        {showUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">

              <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3">
                Verbatim PDF · Pro
              </p>

              <h2 className="text-3xl font-bold text-white mb-3">Unlimited Conversions</h2>

              <p className="text-gray-300 mb-2">
                You've reached the free limit of {FREE_LIMIT} conversions today.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Upgrade to Pro for unlimited Word to PDF conversions, pixel-perfect output, no ads, and files that are never stored.
              </p>

              <a
                href="https://buy.stripe.com/6oU3cv88U5VE8MichI4Vy0a"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 text-center text-lg transition"
              >
                $4.99 / month
                <br />
                <span className="text-sm font-normal">Unlimited · No ads · Files never stored</span>
              </a>

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
