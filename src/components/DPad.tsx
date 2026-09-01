import type { ReactNode } from "react";
import { PauseIcon, PlayIcon, ChevronIcon } from "./icons";

interface Props {
  onDir: (x: number, y: number) => void;
  onPauseToggle: () => void;
  playing: boolean;
}

function PadBtn({
  label,
  onPress,
  children,
  className = "",
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress();
      }}
      className={`dpad-btn chip-notch-sm flex items-center justify-center bg-pit-800 border border-pit-line text-venom-300 active:bg-pit-600 active:text-venom-400 shadow-[0_4px_0_rgba(0,0,0,0.4)] no-tap-highlight ${className}`}
    >
      {children}
    </button>
  );
}

export default function DPad({ onDir, onPauseToggle, playing }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 w-44 mx-auto select-none" style={{ touchAction: "none" }}>
      <span />
      <PadBtn label="Up" onPress={() => onDir(0, -1)} className="h-14">
        <ChevronIcon className="w-6 h-6" />
      </PadBtn>
      <span />
      <PadBtn label="Left" onPress={() => onDir(-1, 0)} className="h-14">
        <ChevronIcon className="w-6 h-6 -rotate-90" />
      </PadBtn>
      <PadBtn label={playing ? "Pause" : "Play"} onPress={onPauseToggle} className="h-14 text-amberglow-400">
        {playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
      </PadBtn>
      <PadBtn label="Right" onPress={() => onDir(1, 0)} className="h-14">
        <ChevronIcon className="w-6 h-6 rotate-90" />
      </PadBtn>
      <span />
      <PadBtn label="Down" onPress={() => onDir(0, 1)} className="h-14">
        <ChevronIcon className="w-6 h-6 rotate-180" />
      </PadBtn>
      <span />
    </div>
  );
}
