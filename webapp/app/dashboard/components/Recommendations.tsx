import { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
  onSelect: (recommendation: Recommendation) => void;
}

export function Recommendations({ recommendations, onSelect }: RecommendationsProps) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Recent Recommendations
      </h2>
      <p className="mt-1 text-xs text-gray-500">Click to ask the assistant for details.</p>
      <div className="mt-2 space-y-1.5">
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.id}
            onClick={() => onSelect(recommendation)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-left text-sm text-gray-200 transition hover:border-cyan-400/40 hover:bg-gray-700"
          >
            {recommendation.title}
          </button>
        ))}
      </div>
    </section>
  );
}
