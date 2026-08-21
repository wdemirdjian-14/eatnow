/**
 * Illustrations de démonstration pour le champ « photo » des plats.
 *
 * Ce ne sont pas des photographies : ce sont des assiettes vues de dessus,
 * dessinées en SVG, qui permettent de voir la carte dans ses deux états
 * (plat avec visuel / plat sans visuel). En production, le champ `photo`
 * reçoit la photo réellement téléversée par le restaurateur.
 */
type Palette = [string, string, string]

const PALETTES: Record<string, { bg: string; plate: string; food: Palette }> = {
  viande: { bg: '#efe2d2', plate: '#fbf6ef', food: ['#8a4b2a', '#c98243', '#5d7a3a'] },
  poisson: { bg: '#dfeaee', plate: '#fbfdfd', food: ['#e5b7a0', '#7fb0c4', '#7ea653'] },
  vegetal: { bg: '#e3ecdb', plate: '#fbfdf8', food: ['#5d8c3e', '#a8c15c', '#d8663f'] },
  dessert: { bg: '#f1e3e6', plate: '#fefbfb', food: ['#5b3326', '#d99a86', '#f0d7a8'] },
}

/** Positions des « aliments » : [cx, cy, r, indice de couleur]. */
const SHAPES: [number, number, number, number][][] = [
  [[168, 132, 46, 0], [232, 118, 30, 1], [214, 176, 26, 2]],
  [[200, 120, 52, 1], [160, 178, 28, 0], [238, 172, 24, 2]],
  [[176, 118, 34, 2], [226, 140, 40, 0], [188, 180, 30, 1]],
]

export function demoArt(kind: keyof typeof PALETTES, variant = 0): string {
  const p = PALETTES[kind]
  const shapes = SHAPES[variant % SHAPES.length]
  const blobs = shapes
    .map(([cx, cy, r, ci]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.food[ci]}" opacity=".92"/>`)
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<rect width="400" height="300" fill="${p.bg}"/>` +
    `<circle cx="200" cy="150" r="112" fill="${p.plate}"/>` +
    `<circle cx="200" cy="150" r="112" fill="none" stroke="#0000000f" stroke-width="2"/>` +
    `<circle cx="200" cy="150" r="92" fill="none" stroke="#00000010" stroke-width="1.5"/>` +
    `<g>${blobs}</g>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
