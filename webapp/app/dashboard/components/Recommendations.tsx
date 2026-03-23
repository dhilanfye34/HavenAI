import { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
  onSelect: (recommendation: Recommendation) => void;
}

export function Recommendations({ recommendations, onSelect }: RecommendationsProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Recommendations
      </h2>
      <p className="mt-0.5 text-[11px] text-gray-600">Click to ask the assistant for details.</p>
      <div className="mt-3 space-y-1.5">
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.id}
            onClick={() => onSelect(recommendation)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left text-sm text-gray-300 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.04] hover:text-white"
          >
            {recommendation.title}
          </button>
        ))}
      </div>
    </section>
  );
}
