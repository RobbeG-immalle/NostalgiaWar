interface VoteBarProps {
  leftPercentage: number;
  rightPercentage: number;
  leftLabel: string;
  rightLabel: string;
}

export function VoteBar({ leftPercentage, rightPercentage, leftLabel, rightLabel }: VoteBarProps) {
  return (
    <div className="w-full space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
      <div className="flex text-xs text-white/60 justify-between">
        <span className="truncate max-w-[45%]">{leftLabel}</span>
        <span className="truncate max-w-[45%] text-right">{rightLabel}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
        <div
          className="bg-gradient-to-r from-[#0077ff] to-[#00c2ff] transition-all duration-700 ease-out"
          style={{ width: `${leftPercentage}%` }}
        />
        <div
          className="bg-gradient-to-r from-[#ff7a18] to-[#ff2d55] transition-all duration-700 ease-out"
          style={{ width: `${rightPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span className="text-[#00a6ff]">{leftPercentage}%</span>
        <span className="text-[#ff6f61]">{rightPercentage}%</span>
      </div>
    </div>
  );
}
