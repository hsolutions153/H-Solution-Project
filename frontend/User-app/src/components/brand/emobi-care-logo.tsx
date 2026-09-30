import React from "react";

interface EMobiCareLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  tagline?: string;
  textVariant?: "light" | "dark";
}

export function EMobiCareLogoIcon({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const gradId = React.useId();
  const glowId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F2FE" />
          <stop offset="0.45" stopColor="#0077B6" />
          <stop offset="1" stopColor="#0A2540" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#00F2FE" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Container squircle */}
      <rect width="40" height="40" rx="10.5" fill={`url(#${gradId})`} />
      {/* Decorative inner EV ring */}
      <circle
        cx="20"
        cy="20"
        r="16.5"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeDasharray="2.5 2.5"
      />
      {/* High-tech lightning bolt */}
      <path
        d="M22.5 6.5L11 21.5H19.5L17.5 33.5L29 18.5H20.5L22.5 6.5Z"
        fill="white"
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}

export function EMobiCareBrand({
  size = 32,
  className = "",
  showText = true,
  tagline,
  textVariant = "dark",
}: EMobiCareLogoProps) {
  const isDark = textVariant === "light"; // "light" means light text on dark background

  return (
    <div
      className={`emobi-brand-lockup ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      <EMobiCareLogoIcon size={size} />
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span
            style={{
              fontSize: size >= 32 ? "16.5px" : "14.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: isDark ? "#FFFFFF" : "#0D2137",
              fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            H-MOBILITY CARE
          </span>
          {tagline ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: isDark ? "rgba(255,255,255,0.7)" : "#0077B6",
                marginTop: "2px",
                whiteSpace: "nowrap",
              }}
            >
              {tagline}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
