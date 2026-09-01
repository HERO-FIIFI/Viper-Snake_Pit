import { DIFFICULTIES, type DifficultyKey } from "../game/engine";

interface Props {
  value: DifficultyKey;
  onChange: (k: DifficultyKey) => void;
  bests: Record<DifficultyKey, number>;
  compact?: boolean;
}

const ORDER: DifficultyKey[] = ["chill", "classic", "turbo"];

export default function DifficultyPicker({ value, onChange, bests, compact }: Props) {
  return (
    <div className={compact ? "grid grid-cols-3 gap-1.5" : "flex flex-col gap-2"} role="radiogroup" aria-label="Difficulty">
      {ORDER.map((k) => {
        const d = DIFFICULTIES[k];
        const active = value === k;
        return (
          <button
            key={k}
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              e.stopPropagation();
              onChange(k);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`btn-arcade chip-notch-sm text-left border transition-colors no-tap-highlight ${
              compact ? "px-2 py-2 flex flex-col items-center gap-1" : "px-3 py-2.5 flex items-center gap-3"
            } ${
              active
                ? "bg-pit-700 border-pit-line shadow-[inset_0_0_18px_rgba(164,236,67,0.08)]"
                : "bg-pit-850 border-pit-600/40 hover:bg-pit-800 hover:border-pit-line"
            }`}
          >
            <span
              className={`shrink-0 h-2.5 w-2.5 rotate-45 border ${active ? "" : "border-moss/50"}`}
              style={active ? { backgroundColor: d.color, borderColor: d.color, boxShadow: `0 0 8px ${d.color}` } : undefined}
            />
            <span className="flex-1 min-w-0">
              <span
                className="font-display block leading-none"
                style={{ fontSize: compact ? 9 : 11, color: active ? d.color : "#eef7e4" }}
              >
                {d.label}
              </span>
              {!compact && <span className="block text-[11px] text-moss mt-1 leading-tight">{d.tagline}</span>}
            </span>
            <span
              className={`font-display shrink-0 ${compact ? "text-[8px]" : "text-[9px]"} px-1.5 py-1 border border-pit-line bg-pit-900`}
              style={{ color: bests[k] > 0 ? "#ffbd4d" : "#5f7d6a" }}
            >
              {bests[k] > 0 ? bests[k] : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
