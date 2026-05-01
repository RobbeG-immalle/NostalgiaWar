interface VoteBarProps {
  leftPercentage: number;
  rightPercentage: number;
  leftLabel: string;
  rightLabel: string;
}

export function VoteBar({ leftPercentage, rightPercentage, leftLabel, rightLabel }: VoteBarProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex text-xs text-white/50 justify-between">
        <span className="truncate max-w-[45%]">{leftLabel}</span>
        <span className="truncate max-w-[45%] text-right">{rightLabel}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
        <div
          className="bg-purple-500 transition-all duration-700 ease-out"
          style={{ width: `${leftPercentage}%` }}
        />
        <div
          className="bg-pink-500 transition-all duration-700 ease-out"
          style={{ width: `${rightPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span className="text-purple-400">{leftPercentage}%</span>
        <span className="text-pink-400">{rightPercentage}%</span>
      </div>
    </div>
  );
}
