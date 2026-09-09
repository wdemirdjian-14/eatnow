import { GREETINGS, SPIRAL_PATH } from './spiralPath'

/**
 * Logo Eatnow : une assiette rouge brique, une fourchette et un couteau,
 * et « bonjour » écrit en spirale dans toutes les langues de l'application.
 *
 * L'assiette est plus sombre que le bandeau (--brand-600) pour rester lisible
 * lorsqu'elle est posée dessus, sans devenir terne sur fond clair.
 */
export function Logo({ size = 40, id = 'en', className, tone = 'brand' }: {
  size?: number
  id?: string
  className?: string
  /**
   * `light` : tracé blanc sans assiette pleine, pour le bandeau rouge, où les
   * maquettes posent la marque en trait blanc plutôt qu'en pastille.
   */
  tone?: 'brand' | 'light'
}) {
  const spiral = `${id}-spiral`
  const grad = `${id}-plate`
  const light = tone === 'light'
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
          <stop offset="0" stopColor="#9E1024" />
          <stop offset="1" stopColor="#5C0B18" />
        </linearGradient>
        <path id={spiral} d={SPIRAL_PATH} />
      </defs>
      <circle
        cx="100" cy="100" r="88"
        fill={light ? 'none' : `url(#${grad})`}
        stroke={light ? '#FFFFFF' : 'none'} strokeWidth="7"
      />
      {!light && (
        <circle cx="100" cy="100" r="74" fill="none" stroke="#F4C95D" strokeWidth="2.5" opacity=".7" />
      )}
      <g fill="#FFFFFF">
        <rect x="20" y="72" width="6.4" height="34" rx="3.2" />
        <rect x="28.6" y="72" width="6.4" height="34" rx="3.2" />
        <path d="M17 100h21c0 8-3.6 12-6.4 13.6V166a4.1 4.1 0 1 1-8.2 0v-52.4C20.6 112 17 108 17 100Z" />
        <path d="M183 72c-8 4-13 14-13 26s5 16 9 16.6V166a4.1 4.1 0 1 1-8.2 0V72Z" />
      </g>
      {withText ? (
        <text
          fontFamily="Inter, Outfit, Helvetica, Arial, sans-serif"
          fontSize="7.4" fontWeight="600" letterSpacing=".4" fill="#FFF3F4"
        >
          <textPath href={`#${spiral}`} startOffset="0">{GREETINGS}</textPath>
        </text>
      ) : (
        <use href={`#${spiral}`} fill="none" stroke={light ? '#FFFFFF' : '#FFF3F4'} strokeWidth="5" strokeLinecap="round" opacity=".9" />
      )}
    </svg>
  )
}
