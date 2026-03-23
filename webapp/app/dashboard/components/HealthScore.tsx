interface HealthScoreProps {
  score: number;
}

function scoreColor(score: number) {
  if (score < 40) return 'text-red-400';
  if (score < 70) return 'text-amber-400';
  return 'text-emerald-400';
}

function scoreStrokeColor(score: number) {
  if (score < 40) return '#ef4444';
  if (score < 70) return '#f59e0b';
  return '#34d399';
}

function scoreLabel(score: number) {
  if (score < 40) return 'Critical';
  if (score < 70) return 'Needs Attention';
  return 'Good';
}

export function HealthScore({ score }: HealthScoreProps) {
  const normalized = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Security Health
      </h2>
      <div className="mt-3 flex items-center justify-center">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="44"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60" cy="60" r="44"
              stroke={`url(#healthGrad-${normalized})`}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
            <defs>
              <linearGradient id={`healthGrad-${normalized}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={scoreStrokeColor(normalized)} />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-2xl font-bold ${scoreColor(normalized)}`}>{normalized}</p>
            <p className="text-[10px] text-gray-500">{scoreLabel(normalized)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
