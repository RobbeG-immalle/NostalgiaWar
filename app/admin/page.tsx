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
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕹️</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Nostalgia War — Admin
            </h1>
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
