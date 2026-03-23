interface HealthScoreProps {
  score: number;
}

function scoreColor(score: number) {
  if (score < 40) return 'text-red-400';
  if (score < 70) return 'text-amber-400';
  return 'text-green-400';
}

function scoreStroke(score: number) {
  if (score < 40) return 'stroke-red-500';
  if (score < 70) return 'stroke-amber-500';
  return 'stroke-green-500';
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
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Security Health Score
      </h2>
      <div className="mt-2 flex items-center justify-center">
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="44"
              className="stroke-gray-700"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="44"
              className={scoreStroke(normalized)}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-xl font-bold ${scoreColor(normalized)}`}>{normalized}</p>
            <p className="text-[11px] text-gray-400">{scoreLabel(normalized)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
