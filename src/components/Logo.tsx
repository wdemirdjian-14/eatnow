import { GREETINGS, SPIRAL_PATH } from './spiralPath'

/**
 * Logo Eatnow : une assiette bleu canard, une fourchette et un couteau,
 * et « bonjour » écrit en spirale dans toutes les langues de l'application.
 */
export function Logo({ size = 40, id = 'en', className }: { size?: number; id?: string; className?: string }) {
  const spiral = `${id}-spiral`
  const grad = `${id}-plate`
  // En dessous de 64 px les salutations deviennent illisibles : on ne garde
  // que le tracé de la spirale, qui reste reconnaissable jusqu'en favicon.
  const withText = size >= 64
  return (
    <svg
      width={size} height={size} viewBox="0 0 200 200" className={className}
      role="img" aria-label="Eatnow"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12959F" />
          <stop offset="1" stopColor="#084C55" />
        </linearGradient>
        <path id={spiral} d={SPIRAL_PATH} />
      </defs>
      <circle cx="100" cy="100" r="88" fill={`url(#${grad})`} />
      <circle cx="100" cy="100" r="74" fill="none" stroke="#F4C95D" strokeWidth="2.5" opacity=".7" />
      <g fill="#F6FBFB">
        <rect x="20" y="72" width="6.4" height="34" rx="3.2" />
        <rect x="28.6" y="72" width="6.4" height="34" rx="3.2" />
        <path d="M17 100h21c0 8-3.6 12-6.4 13.6V166a4.1 4.1 0 1 1-8.2 0v-52.4C20.6 112 17 108 17 100Z" />
        <path d="M183 72c-8 4-13 14-13 26s5 16 9 16.6V166a4.1 4.1 0 1 1-8.2 0V72Z" />
      </g>
      {withText ? (
        <text
          fontFamily="Inter, Outfit, Helvetica, Arial, sans-serif"
          fontSize="7.4" fontWeight="600" letterSpacing=".4" fill="#EAF7F8"
        >
          <textPath href={`#${spiral}`} startOffset="0">{GREETINGS}</textPath>
        </text>
      ) : (
        <use href={`#${spiral}`} fill="none" stroke="#EAF7F8" strokeWidth="5" strokeLinecap="round" opacity=".9" />
      )}
    </svg>
  )
}
