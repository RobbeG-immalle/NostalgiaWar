'use client';

const CATEGORIES = [
  { value: 'all', label: '🌟 All' },
  { value: 'video_games', label: '🎮 Video Games' },
  { value: 'cartoons', label: '📺 Cartoons' },
  { value: 'movies', label: '🎬 Movies' },
  { value: 'music', label: '🎵 Music' },
];

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            value === cat.value
              ? 'bg-gradient-to-r from-[#00a6ff] to-[#ff2d55] text-white shadow-lg shadow-[#ff2d55]/30'
              : 'bg-black/30 border border-white/10 text-white/80 hover:border-[#ffb347]/60 hover:text-white'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
