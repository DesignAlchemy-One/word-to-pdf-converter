import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

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

      if (!res.ok) throw new Error('Conversion failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      setError('Something went wrong. Try again?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Word to PDF Converter</h1>
        <p className="text-gray-300 mb-8">Upload a .docx file → Get a perfect PDF instantly</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="file"
            accept=".docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
          />

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-4 px-8 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              download={file?.name.replace('.docx', '.pdf')}
              className="inline-block py-4 px-8 bg-green-600 text-white font-bold rounded-full hover:bg-green-700"
            >
              Download Your PDF
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
