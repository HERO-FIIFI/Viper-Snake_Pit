interface IconProps {
  className?: string;
}

export function SnakeLogo({ className = "w-8 h-8" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 24c0-3 2.5-5 6-5h10c2.2 0 4-1.6 4-3.8S23.2 11 21 11H9"
        stroke="#a4ec43"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="4.4" fill="#d9ff8a" />
      <circle cx="6.8" cy="10" r="1.1" fill="#12300f" />
      <path
        className="tongue"
        d="M3.6 11H1.2M1.2 11l1-1.2M1.2 11l1 1.2"
        stroke="#ff5449"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="25" cy="24.5" r="3.4" fill="#ff5449" />
      <path d="M25 20.4v-1.6" stroke="#8a5a2b" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="27.2" cy="19.4" rx="2" ry="1" fill="#7cc32a" transform="rotate(-28 27.2 19.4)" />
    </svg>
  );
}

export function PlayIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4 2.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

export function PauseIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <rect x="3" y="2.5" width="3.6" height="11" />
      <rect x="9.4" y="2.5" width="3.6" height="11" />
    </svg>
  );
}

export function RestartIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" />
      <path d="M13.7 1.6v3.2h-3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SoundOnIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2 6v4h2.6L8 13V3L4.6 6H2z" fill="currentColor" stroke="none" />
      <path d="M10.5 5.5a3.4 3.4 0 0 1 0 5M12.4 3.6a6 6 0 0 1 0 8.8" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M2 6v4h2.6L8 13V3L4.6 6H2z" fill="currentColor" stroke="none" />
      <path d="M10.5 6l4 4m0-4l-4 4" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M5 2h6v4.2a3 3 0 0 1-6 0V2z" />
      <path d="M5 3H2.6v1.4A2.6 2.6 0 0 0 5.2 7M11 3h2.4v1.4A2.6 2.6 0 0 1 10.8 7" strokeLinecap="round" />
      <path d="M8 9.4V11m-2.6 3h5.2M6.6 14c0-1.7.6-3 1.4-3s1.4 1.3 1.4 3" strokeLinecap="round" />
    </svg>
  );
}

export function AppleIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.2c-2.4-1.6-5.4.2-5.4 3.3 0 2.7 2 5.5 4 5.5.6 0 1-.3 1.4-.3s.8.3 1.4.3c2 0 4-2.8 4-5.5 0-3.1-3-4.9-5.4-3.3z" />
      <path d="M8 5V3.2M8 3.4c.2-1 1-1.6 2-1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BoltIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.5 1L3 9h3.6L5.5 15 13 6.6H8.6L9.5 1z" />
    </svg>
  );
}

export function SkullIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a5.5 5.5 0 0 0-5.5 5.5c0 2 .9 3.4 2 4.3V14h2v-1.6h1V14h1v-1.6h1V14h2v-2.7c1.1-.9 2-2.3 2-4.3A5.5 5.5 0 0 0 8 1.5zM5.8 9A1.5 1.5 0 1 1 5.8 6a1.5 1.5 0 0 1 0 3zm4.4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );
}

export function TimerIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="9" r="5.4" />
      <path d="M8 6.4V9l1.9 1.2M6.4 1.5h3.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path d="M10 3.5l6.5 8h-13l6.5-8z" />
    </svg>
  );
}

export function SwipeIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 10h9m0 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 4.5v11" strokeLinecap="round" strokeDasharray="2 2.4" />
    </svg>
  );
}

export function CrownIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2 5l3 3 3-4.5L11 8l3-3v6.5H2V5zM2 13h12v1.5H2z" />
    </svg>
  );
}
