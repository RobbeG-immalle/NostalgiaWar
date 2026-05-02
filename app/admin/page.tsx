'use client';

import { useState, useEffect, useCallback } from 'react';
import { Item } from '@/lib/types';

const CATEGORIES = [
  { value: 'video_games', label: '🎮 Video Games' },
  { value: 'cartoons', label: '📺 Cartoons' },
  { value: 'movies', label: '🎬 Movies' },
  { value: 'music', label: '🎵 Music' },
];

const CATEGORY_LABELS: Record<string, string> = {
  video_games: '🎮 Video Games',
  cartoons: '📺 Cartoons',
  movies: '🎬 Movies',
  music: '🎵 Music',
};

const SESSION_KEY = 'nostalgia_admin_pw';

type CsvUploadItem = {
  category: string;
  title: string;
  youtube_url: string;
};

type BulkUploadResponse = {
  inserted: Item[];
  skipped: Array<CsvUploadItem & { reason: string }>;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseBulkCsv(csv: string): CsvUploadItem[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one item.');
  }

  const header = parseCsvLine(lines[0]).map((column) => column.toLowerCase());
  const categoryIndex = header.indexOf('category');
  const titleIndex = header.indexOf('title');
  const youtubeUrlIndex = header.indexOf('youtube_url');

  if (categoryIndex === -1 || titleIndex === -1 || youtubeUrlIndex === -1) {
    throw new Error('CSV header must be: category,title,youtube_url');
  }

  return lines.slice(1).map((line, rowIndex) => {
    const columns = parseCsvLine(line);
    const category = columns[categoryIndex]?.trim() ?? '';
    const title = columns[titleIndex]?.trim() ?? '';
    const youtube_url = columns[youtubeUrlIndex]?.trim() ?? '';

    if (!category || !title || !youtube_url) {
      throw new Error(`Row ${rowIndex + 2} is missing one or more required values.`);
    }

    return { category, title, youtube_url };
  });
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loadError, setLoadError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add-video form state
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkSkipped, setBulkSkipped] = useState<Array<CsvUploadItem & { reason: string }>>([])

  // Broken link checker state
  type BrokenItem = { id: string; title: string; youtube_url: string; category: string };
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [brokenItems, setBrokenItems] = useState<BrokenItem[] | null>(null);
  const [checkError, setCheckError] = useState('');

  // Reports state
  type ReportedItem = { item: { id: string; title: string; youtube_url: string; category: string }; count: number };
  const [reportedItems, setReportedItems] = useState<ReportedItem[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');;

  // Restore saved password from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' }),
    [password]
  );

  const loadItems = useCallback(async () => {
    setLoadError('');
    const res = await fetch('/api/admin/items', { headers: authHeaders() });
    if (res.status === 401) {
      setAuthed(false);
      sessionStorage.removeItem(SESSION_KEY);
      setAuthError('Session expired. Please log in again.');
      return;
    }
    if (!res.ok) {
      setLoadError('Failed to load items.');
      return;
    }
    const data: Item[] = await res.json();
    setItems(data);
  }, [authHeaders]);

  useEffect(() => {
    if (authed) loadItems();
  }, [authed, loadItems]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (!password.trim()) {
      setAuthError('Please enter a password.');
      return;
    }

    // Validate credentials against the server before accepting the login
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { Authorization: `Bearer ${password}` },
    });

    if (!res.ok) {
      setAuthError('Incorrect password.');
      return;
    }

    sessionStorage.setItem(SESSION_KEY, password);
    setAuthed(true);
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword('');
    setItems([]);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this video? All associated votes will also be removed.')) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/items/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    setDeleting(null);
    if (!res.ok) {
      alert('Failed to delete item. Please try again.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!title.trim() || !youtubeUrl.trim()) {
      setAddError('Title and YouTube URL are required.');
      return;
    }

    setAdding(true);
    const res = await fetch('/api/admin/items', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: title.trim(), youtube_url: youtubeUrl.trim(), category }),
    });
    setAdding(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setAddError((err as { error?: string }).error || 'Failed to add item.');
      return;
    }

    const newItem: Item = await res.json();
    setItems((prev) =>
      [...prev, newItem].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
    );
    setTitle('');
    setYoutubeUrl('');
    setCategory(CATEGORIES[0].value);
    setAddSuccess(`"${newItem.title}" added successfully!`);
  }

  async function handleCheckLinks() {
    setCheckingLinks(true);
    setCheckError('');
    setBrokenItems(null);

    const res = await fetch('/api/admin/check-links', { headers: authHeaders() });
    setCheckingLinks(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setCheckError((err as { error?: string }).error || 'Check failed.');
      return;
    }

    const { broken } = await res.json() as { broken: BrokenItem[]; total: number };
    setBrokenItems(broken);
  }

  async function handleLoadReports() {
    setReportsLoading(true);
    setReportsError('');

    const res = await fetch('/api/admin/reports', { headers: authHeaders() });
    setReportsLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setReportsError((err as { error?: string }).error || 'Failed to load reports.');
      return;
    }

    const data = await res.json() as ReportedItem[];
    setReportedItems(data);
  }

  async function handleDeleteBroken(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/admin/items/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    setDeleting(null);
    if (!res.ok) {
      alert('Failed to delete item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setBrokenItems((prev) => prev?.filter((item) => item.id !== id) ?? null);
  }

  async function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setBulkCsv(text);
    e.target.value = '';
  }

  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    setBulkError('');
    setBulkSuccess('');
    setBulkSkipped([]);

    let parsedItems: CsvUploadItem[];
    try {
      parsedItems = parseBulkCsv(bulkCsv);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to parse CSV.');
      return;
    }

    setBulkUploading(true);
    const res = await fetch('/api/admin/items', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items: parsedItems }),
    });
    setBulkUploading(false);

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      setBulkError((payload as { error?: string } | null)?.error || 'Bulk upload failed.');
      return;
    }

    const result = payload as BulkUploadResponse;
    setItems((prev) =>
      [...prev, ...result.inserted].sort(
        (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
      )
    );
    setBulkSkipped(result.skipped);
    setBulkSuccess(
      `Added ${result.inserted.length} item${result.inserted.length === 1 ? '' : 's'}${
        result.skipped.length ? `, skipped ${result.skipped.length} duplicate/invalid row${result.skipped.length === 1 ? '' : 's'}` : ''
      }.`
    );

    if (result.inserted.length > 0) {
      setBulkCsv('');
    }
  }

  // ─── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-3xl">🔒</span>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/40 text-sm">Enter your admin password to continue</p>
          </div>

          {authError && (
            <p className="text-red-400 text-sm text-center">{authError}</p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Log in
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ─── Admin panel ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Nostalgia War" className="h-10 w-auto mix-blend-screen" />
            <span className="text-sm font-semibold text-white/50 border border-white/10 rounded-md px-2 py-0.5">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* ── Add video form ── */}
        <section className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white/90">Add a new video</h2>

          {addError && <p className="text-red-400 text-sm">{addError}</p>}
          {addSuccess && <p className="text-green-400 text-sm">{addSuccess}</p>}

          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-white/40 uppercase tracking-wide">Title</label>
              <input
                type="text"
                placeholder="e.g. Super Mario 64 — Bob-omb Battlefield"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/40 uppercase tracking-wide">YouTube URL</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/40 uppercase tracking-wide">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {adding ? 'Adding…' : 'Add video'}
            </button>
          </form>
        </section>

        <section className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white/90">Bulk upload CSV</h2>
              <p className="text-sm text-white/40">
                Paste CSV or load a file with: <span className="font-mono">category,title,youtube_url</span>
              </p>
            </div>
            <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              Choose CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileChange} />
            </label>
          </div>

          {bulkError && <p className="text-red-400 text-sm">{bulkError}</p>}
          {bulkSuccess && <p className="text-green-400 text-sm">{bulkSuccess}</p>}

          <form onSubmit={handleBulkUpload} className="space-y-4">
            <textarea
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              rows={12}
              placeholder={['category,title,youtube_url', 'Video Games,Call of Duty Black Ops Main Theme,https://www.youtube.com/watch?v=Zxnx3W-HA18'].join('\n')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500 transition-colors"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/35">
                Existing rows and duplicates inside the same CSV are skipped automatically.
              </p>
              <button
                type="submit"
                disabled={bulkUploading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {bulkUploading ? 'Uploading…' : 'Upload CSV'}
              </button>
            </div>
          </form>

          {bulkSkipped.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-amber-200">Skipped rows</h3>
              <ul className="space-y-1 text-xs text-amber-100/80 max-h-40 overflow-y-auto pr-1">
                {bulkSkipped.map((item, index) => (
                  <li key={`${item.title}-${item.youtube_url}-${index}`}>
                    {item.title || 'Untitled'} ({item.category || 'unknown'}) - {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Broken link checker ── */}
        <section className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white/90">Check broken links</h2>
              <p className="text-sm text-white/40">Finds videos that are deleted, private, or unavailable on YouTube.</p>
            </div>
            <button
              onClick={handleCheckLinks}
              disabled={checkingLinks}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {checkingLinks ? 'Checking…' : 'Run check'}
            </button>
          </div>

          {checkError && <p className="text-red-400 text-sm">{checkError}</p>}

          {brokenItems !== null && brokenItems.length === 0 && (
            <p className="text-green-400 text-sm">All links are working.</p>
          )}

          {brokenItems && brokenItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-amber-400 text-sm">{brokenItems.length} broken link{brokenItems.length === 1 ? '' : 's'} found.</p>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 divide-y divide-white/5 overflow-hidden">
                {brokenItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-white/90 font-medium truncate">{item.title}</p>
                      <a
                        href={item.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 truncate block max-w-xs"
                      >
                        {item.youtube_url}
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeleteBroken(item.id)}
                      disabled={deleting === item.id}
                      className="shrink-0 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-40 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors"
                    >
                      {deleting === item.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── User reports ── */}
        <section className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white/90">User reports</h2>
              <p className="text-sm text-white/40">Videos flagged by users as broken or incorrect.</p>
            </div>
            <button
              onClick={handleLoadReports}
              disabled={reportsLoading}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {reportsLoading ? 'Loading…' : 'Load reports'}
            </button>
          </div>

          {reportsError && <p className="text-red-400 text-sm">{reportsError}</p>}

          {reportedItems !== null && reportedItems.length === 0 && (
            <p className="text-white/40 text-sm">No reports yet.</p>
          )}

          {reportedItems && reportedItems.length > 0 && (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Title</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Category</th>
                    <th className="text-center px-5 py-3">Reports</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {reportedItems.map(({ item, count }, i) => (
                    <tr
                      key={item.id}
                      className={`border-b border-white/5 last:border-0 ${
                        i % 2 === 0 ? '' : 'bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-5 py-3 text-white/90 font-medium max-w-[200px] truncate">{item.title}</td>
                      <td className="px-5 py-3 hidden sm:table-cell text-white/50">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded-md text-xs ${
                          count >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-40 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors"
                        >
                          {deleting === item.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Video list ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white/90">
            All videos{' '}
            <span className="text-white/30 font-normal text-base">({items.length})</span>
          </h2>

          {loadError && (
            <div className="text-center py-8 space-y-3">
              <p className="text-red-400 text-sm">{loadError}</p>
              <button
                onClick={loadItems}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loadError && items.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">No videos yet.</p>
          )}

          {items.length > 0 && (
            <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Title</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Category</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">YouTube URL</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-5 py-3 text-white/90 font-medium max-w-[200px] truncate">
                        {item.title}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-white/50">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <a
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 text-xs truncate block max-w-[240px]"
                        >
                          {item.youtube_url}
                        </a>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-40 text-red-400 text-xs font-medium rounded-lg border border-red-500/20 transition-colors"
                        >
                          {deleting === item.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
