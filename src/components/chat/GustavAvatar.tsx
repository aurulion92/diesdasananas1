interface GustavAvatarProps {
  size?: number;
  className?: string;
  isActive?: boolean;
}

export const GustavAvatar = ({ size = 64, className = '', isActive = false }: GustavAvatarProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Glasfaserkabel-Körper */}
      <defs>
        <linearGradient id="fiberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(28, 100%, 55%)" />
          <stop offset="50%" stopColor="hsl(28, 100%, 50%)" />
          <stop offset="100%" stopColor="hsl(28, 90%, 45%)" />
        </linearGradient>
        <linearGradient id="fiberShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Körper (abgerundetes Rechteck - wie ein Kabel) */}
      <rect
        x="25"
        y="20"
        width="50"
        height="60"
        rx="20"
        ry="20"
        fill="url(#fiberGradient)"
      />
      
      {/* Glanzeffekt */}
      <rect
        x="30"
        y="22"
        width="20"
        height="40"
        rx="10"
        ry="10"
        fill="url(#fiberShine)"
      />
      
      {/* Augen */}
      <g className={isActive ? 'animate-blink' : ''}>
        {/* Linkes Auge */}
        <ellipse cx="40" cy="42" rx="6" ry="7" fill="white" />
        <ellipse cx="41" cy="43" rx="3" ry="3.5" fill="hsl(230, 60%, 20%)" />
        <circle cx="42" cy="41" r="1.5" fill="white" />
        
        {/* Rechtes Auge */}
        <ellipse cx="60" cy="42" rx="6" ry="7" fill="white" />
        <ellipse cx="61" cy="43" rx="3" ry="3.5" fill="hsl(230, 60%, 20%)" />
        <circle cx="62" cy="41" r="1.5" fill="white" />
      </g>
      
      {/* Lächelnder Mund */}
      <path
        d="M 40 58 Q 50 68 60 58"
        stroke="hsl(230, 60%, 20%)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Kleine Wangen (Blush) */}
      <circle cx="32" cy="52" r="5" fill="hsl(0, 70%, 80%)" opacity="0.5" />
      <circle cx="68" cy="52" r="5" fill="hsl(0, 70%, 80%)" opacity="0.5" />
      
      {/* Kleine Antennen/Lichtpunkte oben (Glasfaser-Effekt) */}
      <circle cx="35" cy="15" r="4" fill="hsl(45, 100%, 60%)">
        <animate
          attributeName="opacity"
          values="1;0.5;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="50" cy="12" r="3" fill="hsl(180, 100%, 60%)">
        <animate
          attributeName="opacity"
          values="0.5;1;0.5"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="65" cy="15" r="4" fill="hsl(280, 100%, 70%)">
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="2.5s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Verbindungslinien zu den Lichtpunkten */}
      <line x1="35" y1="15" x2="35" y2="22" stroke="hsl(28, 100%, 45%)" strokeWidth="2" />
      <line x1="50" y1="12" x2="50" y2="22" stroke="hsl(28, 100%, 45%)" strokeWidth="2" />
      <line x1="65" y1="15" x2="65" y2="22" stroke="hsl(28, 100%, 45%)" strokeWidth="2" />
    </svg>
  );
};
