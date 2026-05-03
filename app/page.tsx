import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen text-white relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0 nw-scanlines opacity-30" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d18]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Nostalgia War" className="h-20 w-auto mix-blend-screen" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4 py-16 space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-white/95 nw-glow-text tracking-wide uppercase">
            Nostalgia War
          </h1>
          <p className="text-white/50 text-sm uppercase tracking-[0.25em]">
            Choose your game mode
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {/* Singleplayer */}
          <Link
            href="/singleplayer"
            className="group bg-black/35 backdrop-blur-sm border border-[#00a6ff]/20 hover:border-[#00a6ff]/60 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-[#00a6ff]/5 active:scale-95"
          >
            <span className="text-5xl select-none">🎮</span>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-[#00a6ff] uppercase tracking-widest group-hover:nw-glow-text transition-all">
                Singleplayer
              </h2>
              <p className="text-white/45 text-sm">
                Vote solo – which video is more nostalgic?
              </p>
            </div>
            <span className="mt-2 text-[#00a6ff]/60 group-hover:text-[#00a6ff] text-sm font-semibold transition-colors">
              Play now →
            </span>
          </Link>

          {/* Multiplayer */}
          <Link
            href="/multiplayer"
            className="group bg-black/35 backdrop-blur-sm border border-[#ffb347]/20 hover:border-[#ffb347]/60 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-[#ffb347]/5 active:scale-95"
          >
            <span className="text-5xl select-none">👥</span>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-[#ffb347] uppercase tracking-widest group-hover:nw-glow-text transition-all">
                Multiplayer
              </h2>
              <p className="text-white/45 text-sm">
                Party mode – play live with friends in real-time
              </p>
            </div>
            <span className="mt-2 text-[#ffb347]/60 group-hover:text-[#ffb347] text-sm font-semibold transition-colors">
              Create or join →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
