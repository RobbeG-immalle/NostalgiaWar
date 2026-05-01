export function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div className="w-full aspect-video bg-white/10 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-white/10 rounded animate-pulse w-3/4" />
        <div className="h-10 bg-white/10 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
