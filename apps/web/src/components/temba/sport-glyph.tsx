import { sportGlyph } from "@repo/domain/sport";

const STROKE = 1.8;
const DOT_STROKE = 2.2;

export function SportGlyph({
  sport,
  className,
}: {
  sport: string;
  className?: string;
}) {
  const glyph = sportGlyph(sport);
  if (glyph === "goal") {
    return <FootballIcon className={className} />;
  }
  if (glyph === "circle-dot") {
    return <PadelIcon className={className} />;
  }
  return null;
}

function GlyphSvg({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function PadelIcon({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <path d="M12 1.5c4.2 0 7 3.3 7 7.5 0 3.6-2.3 6.4-5.3 7.1v2.4a1.7 1.7 0 0 1-3.4 0v-2.4C7.3 15.4 5 12.6 5 9c0-4.2 2.8-7.5 7-7.5Z" />
      <path
        d="M9.6 6.6h.01M12 6.6h.01M14.4 6.6h.01M9.6 9.3h.01M12 9.3h.01M14.4 9.3h.01M10.8 12h.01M13.2 12h.01"
        strokeWidth={DOT_STROKE}
      />
      <path d="M10 20.5h4" />
    </GlyphSvg>
  );
}

function FootballIcon({ className }: { className?: string }) {
  return (
    <GlyphSvg className={className}>
      <circle cx="12" cy="12" r="10" />
      <path
        d="M12 8l3.8 2.76-1.45 4.48h-4.7L8.2 10.76Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 8V2M15.8 10.76l5.7-1.86M14.35 15.24l3.55 4.86M9.65 15.24 6.1 20.1M8.2 10.76 2.5 8.9" />
    </GlyphSvg>
  );
}
