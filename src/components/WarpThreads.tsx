"use client";

export function WarpThreads({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="animate-warp absolute inset-y-[-10%] left-0 flex w-full justify-around opacity-40">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="h-full w-px"
            style={{
              background: `linear-gradient(180deg, transparent, ${
                i % 3 === 0
                  ? "rgba(166,61,74,0.35)"
                  : i % 3 === 1
                    ? "rgba(26,92,74,0.3)"
                    : "rgba(21,34,56,0.28)"
              }, transparent)`,
              marginLeft: i % 2 === 0 ? 0 : 6,
            }}
          />
        ))}
      </div>
    </div>
  );
}
