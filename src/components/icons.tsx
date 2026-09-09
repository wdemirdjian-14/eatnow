/**
 * Pictogrammes de navigation.
 *
 * Les maquettes emploient des glyphes blancs pleins ; les émojis, eux,
 * imposent leurs propres couleurs — une étoile dorée et un buste bleu sur le
 * rouge de la marque. Ces tracés héritent de `currentColor` et suivent donc
 * l'état actif comme le reste de la barre.
 */
const box = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const

export function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...box}>
      <path d="M12 3 2.6 11.1a1 1 0 0 0 .65 1.76H5v7.2a.94.94 0 0 0 .94.94h3.5v-5.3h5.12V21h3.5a.94.94 0 0 0 .94-.94v-7.2h1.75a1 1 0 0 0 .65-1.76Z" />
    </svg>
  )
}

export function MapIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...box}>
      <path d="M9.1 3.2 3.6 5.05A.9.9 0 0 0 3 5.9v14.2c0 .62.6 1.05 1.18.86L9.1 19.3Z" />
      <path d="M10.6 3.2v16.1l4.8 1.5V4.7Z" />
      <path d="M16.9 4.7v16.1l4.92-1.85a.9.9 0 0 0 .58-.85V3.9c0-.62-.6-1.05-1.18-.86Z" />
    </svg>
  )
}

export function StarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...box}>
      <path d="m12 3.1 2.63 5.63 5.87.8-4.28 4.3 1.06 6.07L12 17.02l-5.28 2.88 1.06-6.07-4.28-4.3 5.87-.8Z" />
    </svg>
  )
}

export function UserIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...box}>
      <circle cx="12" cy="7.4" r="4.4" />
      <path d="M12 13.6c-4.1 0-7.4 2.5-7.4 5.6 0 .99.8 1.8 1.8 1.8h11.2c1 0 1.8-.81 1.8-1.8 0-3.1-3.3-5.6-7.4-5.6Z" />
    </svg>
  )
}
