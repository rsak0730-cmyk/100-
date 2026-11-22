// AETHER Particle Lab — curated color palettes (multi-stop gradients)

export interface Palette {
  id: string;
  name: string;
  /** Gradient stops ordered cold→hot or core→edge depending on effect. */
  stops: string[];
}

export const PALETTES: Palette[] = [
  { id: 'inferno',   name: 'Inferno',    stops: ['#2b0a3d', '#7a1e5a', '#c43d3d', '#f4882e', '#ffc857', '#fff3b0'] },
  { id: 'nebula',    name: 'Nebula',     stops: ['#12063b', '#3d2c8d', '#7b4dff', '#c44dff', '#ff6fd8', '#ffc6ff'] },
  { id: 'oceanic',   name: 'Oceanic',    stops: ['#02141f', '#063a4e', '#0a6b7a', '#12a89d', '#4ef0c0', '#d5ffef'] },
  { id: 'aurora',    name: 'Aurora',     stops: ['#031b2e', '#064e63', '#0f9b8e', '#3ddc97', '#a7f070', '#e9ffb0'] },
  { id: 'monochrome',name: 'Silver',     stops: ['#05070c', '#1b2230', '#3a465e', '#6b7c9c', '#b8c6e0', '#ffffff'] },
  { id: 'cyberpunk', name: 'Cyberpunk',  stops: ['#0b0326', '#31135e', '#7a1fa2', '#ff2ec4', '#ff7ae0', '#00e5ff'] },
];

export const DEFAULT_PALETTE = 'nebula';

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[1];
}
