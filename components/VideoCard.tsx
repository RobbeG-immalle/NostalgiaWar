'use client';

import { useState } from 'react';
import { Item } from '@/lib/types';

interface VideoCardProps {
  item: Item;
  onVote: () => void;
  onReport?: (itemId: string) => void;
  disabled: boolean;
  isWinner?: boolean;
  percentage?: number;
  showResults: boolean;
}

function getYouTubeEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let videoId = '';
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    }
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
      : url;
  } catch {
    return url;
  }
}

export function VideoCard({
  item,
  onVote,
  onReport,
  disabled,
  isWinner,
  percentage,
  showResults,
}: VideoCardProps) {
  const embedUrl = getYouTubeEmbedUrl(item.youtube_url);
  const [reported, setReported] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleReportClick() {
    if (reported) return;
    setConfirming(true);
  }

  function handleReportConfirm() {
    setConfirming(false);
    setReported(true);
    onReport?.(item.id);
  }

  function handleReportCancel() {
    setConfirming(false);
  }

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ${
        showResults && isWinner
          ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-[1.02]'
          : 'border-white/10'
      } bg-white/5 backdrop-blur-sm`}
    >
      <div className="relative w-full aspect-video bg-black">
        <iframe
          src={embedUrl}
          title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-white font-semibold text-lg leading-tight">{item.title}</h2>

        {showResults && percentage !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Nostalgia votes</span>
              <span className={`font-bold ${isWinner ? 'text-purple-400' : 'text-white/60'}`}>
                {percentage}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isWinner ? 'bg-purple-500' : 'bg-white/30'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onVote}
          disabled={disabled}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
            disabled
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-lg hover:shadow-purple-500/25 cursor-pointer'
          }`}
        >
          {showResults ? (isWinner ? '🏆 Winner' : 'Lost') : 'Vote!'}
        </button>

        {confirming ? (
          <div className="flex items-center justify-center gap-3 text-xs">
            <span className="text-white/50">Report this video?</span>
            <button
              onClick={handleReportConfirm}
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Yes, report
            </button>
            <button
              onClick={handleReportCancel}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleReportClick}
            disabled={reported}
            className="text-xs text-white/25 hover:text-white/50 disabled:text-white/20 disabled:cursor-default transition-colors"
          >
            {reported ? '⚑ Reported' : '⚐ Report video'}
          </button>
        )}
      </div>
    </div>
  );
}
