'use client';
import { useState, useEffect, useRef } from 'react';

const FREE_LIMIT = 10;
const FREE_BATCH_LIMIT = 2;
const PRO_BATCH_LIMIT = 20;
const FREE_MAX_MB = 10;
const PRO_MAX_MB = 25;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [conversionsToday, setConversionsToday] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInStatus, setSignInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const proToken = cookies.find((c) => c.startsWith('verbatim_pro_ui='));
    if (proToken) {
      setIsPro(true);
      setConversionsToday(0);
      localStorage.removeItem('pdf_conversions');
    }
  }, []);

  useEffect(() => {
    if (isPro) return;
    const today = new Date().toDateString();
    const saved = localStorage.getItem('pdf_conversions');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === today) {
        setConversionsToday(data.count);
      }
    }
  }, [isPro]);

  useEffect(() => {
    if (isPro) return;
    if (conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
    }
  }, [conversionsToday, isPro]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (batchSuccess) {
      const timer = setTimeout(() => setBatchSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [batchSuccess]);

  useEffect(() => {
    setBatchFiles([]);
    setBatchError(null);
    setBatchSuccess(null);
    setBatchProgress(null);
    setError(null);
    setSuccessMessage(null);
  }, [mode]);

  const incrementConversion = () => {
    if (isPro) return;
    const today = new Date().toDateString();
    const newCount = conversionsToday + 1;
    setConversionsToday(newCount);
    localStorage.setItem('pdf_conversions', JSON.stringify({ date: today, count: newCount }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!isPro && conversionsToday >= FREE_LIMIT) {
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
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name.replace(/\.docx?$/i, '.pdf') || 'converted.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      setSuccessMessage(`✓ ${file.name.replace(/\.docx?$/i, '.pdf')} is downloading now`);
      incrementConversion();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const batchLimit = isPro ? PRO_BATCH_LIMIT : FREE_BATCH_LIMIT;
  const maxMB = isPro ? PRO_MAX_MB : FREE_MAX_MB;

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchError(null);
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const oversized = selected.find((f) => f.size > maxMB * 1024 * 1024);
    if (oversized) {
      setBatchError(
        `${oversized.name} exceeds the ${maxMB}MB limit per file.${!isPro ? ' Upgrade to Pro for up to 25MB per file.' : ''}`
      );
      return;
    }
    const combined = [...batchFiles, ...selected];
    const unique = combined.filter(
      (f, i, arr) => arr.findIndex((x) => x.name === f.name) === i
    );
if (unique.length > batchLimit) {
      setBatchError(
        `${unique.length} files selected. We kept the first ${batchLimit} for you. Remove a file to swap in a different one${!isPro ? ', or upgrade to Pro for up to 20 files per batch' : ''}.`
      );
      setBatchFiles(unique.slice(0, batchLimit));
      if (batchInputRef.current) batchInputRef.current.value = '';
      return;
    }
    setBatchFiles(unique);
    if (batchInputRef.current) batchInputRef.current.value = '';
  };

  const removeBatchFile = (name: string) => {
    setBatchFiles((prev) => prev.filter((f) => f.name !== name));
    setBatchError(null);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchFiles.length === 0) return;
    if (!isPro && conversionsToday >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }
    setBatchLoading(true);
    setBatchError(null);
    setBatchSuccess(null);
    setBatchProgress(
      `Converting ${batchFiles.length} file${batchFiles.length > 1 ? 's' : ''}...`
    );
    const formData = new FormData();
    batchFiles.forEach((f) => formData.append('files', f, f.name));
    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.limitReached) {
          setShowUpgrade(true);
          setBatchLoading(false);
          setBatchProgress(null);
          return;
        }
        throw new Error(errData?.error || 'Batch conversion failed');
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const zipDate = new Date().toISOString().slice(0, 10);
      a.download = `verbatim-pdf-batch-${zipDate}.zip`;
      document.body.appendChild(a);
      setTimeout(() => a.click(), 300);
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      const resultsHeader = res.headers.get('X-Batch-Results');
      let successCount = batchFiles.length;
      let failCount = 0;
      if (resultsHeader) {
        const parsed = JSON.parse(resultsHeader);
        successCount = parsed.filter((r: any) => r.success).length;
        failCount = parsed.filter((r: any) => !r.success).length;
      }
      if (!isPro) {
        const logDate = new Date().toDateString();
        const newCount = conversionsToday + successCount;
        setConversionsToday(newCount);
        localStorage.setItem(
          'pdf_conversions',
          JSON.stringify({ date: logDate, count: newCount })
        );
      }
      const message =
        failCount > 0
          ? `✓ ${successCount} PDF${successCount > 1 ? 's' : ''} downloaded as ZIP. ${failCount} file${failCount > 1 ? 's' : ''} could not be converted.`
          : `✓ ${successCount} PDF${successCount > 1 ? 's' : ''} downloaded as ZIP`;
      setBatchSuccess(message);
      setBatchFiles([]);
    } catch (err: any) {
      setBatchError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBatchLoading(false);
      setBatchProgress(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInStatus('sending');
    try {
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSignInStatus('sent');
    } catch (_e) {
      setSignInStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">

        <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
          Verbatim PDF
        </p>
        <h1 className="text-4xl font-bold text-white mb-4">Word to PDF Converter</h1>
        <p className="text-gray-300 mb-2">Upload a .docx file and get a pixel-perfect PDF instantly</p>

        {isPro ? (
          <p className="text-sm font-semibold text-indigo-400 mb-4">
            Pro — Unlimited conversions
          </p>
        ) : (
          <p className="text-sm text-gray-400 mb-4">
            Free tier: {FREE_LIMIT - conversionsToday} / {FREE_LIMIT} conversions left today
          </p>
        )}

        <div className="flex rounded-full bg-gray-700 p-1 mb-6">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition ${
              mode === 'single' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Convert one
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition ${
              mode === 'batch' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Convert multiple
          </button>
        </div>

        {mode === 'single' && (
          <>
            {successMessage && (
              <div className="mb-6 px-4 py-3 bg-green-900 border border-green-500 rounded-lg text-green-300 text-sm font-medium">
                {successMessage}
              </div>
            )}
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
                disabled={!file || loading || (!isPro && conversionsToday >= FREE_LIMIT)}
                className="w-full py-4 px-8 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Converting...' : 'Convert to PDF'}
              </button>
            </form>
          </>
        )}

        {mode === 'batch' && (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {isPro
                ? `Add up to ${PRO_BATCH_LIMIT} files · Max ${PRO_MAX_MB}MB each`
                : `Free: up to ${FREE_BATCH_LIMIT} files · Max ${FREE_MAX_MB}MB each`}
            </p>
            {batchSuccess && (
              <div className="mb-4 px-4 py-3 bg-green-900 border border-green-500 rounded-lg text-green-300 text-sm font-medium">
                {batchSuccess}
              </div>
            )}
            {batchError && (
              <div className="mb-4 px-4 py-3 bg-red-900 border border-red-500 rounded-lg text-red-300 text-sm">
                {batchError}
              </div>
            )}
            {batchProgress && (
              <div className="mb-4 px-4 py-3 bg-indigo-900 border border-indigo-500 rounded-lg text-indigo-300 text-sm animate-pulse">
                {batchProgress}
              </div>
            )}
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <input
                ref={batchInputRef}
                type="file"
                accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={handleBatchFileChange}
                disabled={batchFiles.length >= batchLimit}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {batchFiles.length > 0 && (
                <div className="bg-gray-700 rounded-lg divide-y divide-gray-600 text-left max-h-48 overflow-y-auto">
                  {batchFiles.map((f) => (
                    <div key={f.name} className="flex items-center justify-between px-4 py-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">
                          {(f.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBatchFile(f.name)}
                        className="text-gray-400 hover:text-red-400 text-xs font-semibold transition flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {batchFiles.length > 0 && (
                <p className="text-xs text-gray-400">
                  {batchFiles.length} / {batchLimit} files selected
                </p>
              )}
              <button
                type="submit"
                disabled={
                  batchFiles.length === 0 ||
                  batchLoading ||
                  (!isPro && conversionsToday >= FREE_LIMIT)
                }
                className="w-full py-4 px-8 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {batchLoading
                  ? 'Converting...'
                  : batchFiles.length > 0
                  ? `Convert ${batchFiles.length} file${batchFiles.length > 1 ? 's' : ''} to PDF`
                  : 'Convert to PDF'}
              </button>
            </form>
            {!isPro && (
              <p className="mt-3 text-xs text-gray-500">
                Need more?{' '}
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline transition"
                >
                  Pro converts up to 20 files at once
                </button>
              </p>
            )}
          </>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Files are never stored · Converted in seconds · No account required
        </p>

        {!isPro && (
          <button
            onClick={() => setShowSignIn(true)}
            className="mt-3 text-xs text-gray-500 hover:text-indigo-400 underline transition"
          >
            Already a subscriber? Sign in
          </button>
        )}

        {showUpgrade && !isPro && (
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
                Upgrade to Pro for unlimited Word to PDF conversions, batch convert up to 20 files
                at once, pixel-perfect output, no ads, and files that are never stored.
              </p>
              <a
                href="https://buy.stripe.com/dRm14neBjb2sbJP1gJejK00"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 text-center text-lg transition"
              >
                $4.99 / month
                <br />
                <span className="text-sm font-normal">
                  Unlimited · Batch convert · Files never stored
                </span>
              </a>
              <button
                onClick={() => {
                  setShowUpgrade(false);
                  setShowSignIn(true);
                }}
                className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm underline"
              >
                Already a subscriber? Sign in
              </button>
              <button
                onClick={() => setShowUpgrade(false)}
                className="mt-4 block w-full text-gray-400 hover:text-white text-sm"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {showSignIn && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
              <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3">
                Verbatim PDF · Pro
              </p>
              <h2 className="text-2xl font-bold text-white mb-3">Sign in to Pro</h2>
              {signInStatus === 'sent' ? (
                <>
                  <div className="mb-6 px-4 py-3 bg-green-900 border border-green-500 rounded-lg text-green-300 text-sm">
                    ✓ Check your email — your sign-in link is on its way.
                  </div>
                  <button
                    onClick={() => {
                      setShowSignIn(false);
                      setSignInStatus('idle');
                      setSignInEmail('');
                    }}
                    className="mt-2 text-gray-400 hover:text-white text-sm"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">
                    Enter the email address you used to subscribe. We'll send you a link to restore
                    Pro access in this browser.
                  </p>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <input
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-indigo-500 focus:outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={signInStatus === 'sending'}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
                    >
                      {signInStatus === 'sending' ? 'Sending...' : 'Send Sign-in Link'}
                    </button>
                  </form>
                  {signInStatus === 'error' && (
                    <p className="mt-3 text-red-400 text-xs">
                      Something went wrong. Please try again.
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setShowSignIn(false);
                      setSignInStatus('idle');
                      setSignInEmail('');
                    }}
                    className="mt-6 text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}