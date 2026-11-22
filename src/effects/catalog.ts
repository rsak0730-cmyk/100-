// AETHER Particle Lab — UI-facing effect catalog (single source for the gallery)
export interface EffectMeta {
  id: string;
  name: string;
  tagline: string;
  /** 24×24 stroke icon path data */
  icon: string;
}

export const EFFECT_CATALOG: EffectMeta[] = [
  { id: 'galaxy',    name: 'Galaxy Spiral',  tagline: 'Spiral arms · core',          icon: 'M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M12 2a10 10 0 0 1 9.6 7.3 M12 22A10 10 0 0 1 2.4 14.7 M7.8 4.6a10 10 0 0 0 0 14.8 M16.2 4.6a10 10 0 0 1 0 14.8' },
  { id: 'explosion', name: 'Particle Explosion', tagline: 'Radial burst · shockwave', icon: 'M12 9V3 M12 21v-6 M9 12H3 M21 12h-6 M5.6 5.6l3 3 M18.4 5.6l-3 3 M5.6 18.4l3-3 M18.4 18.4l-3-3' },
  { id: 'blackhole', name: 'Black Hole',      tagline: 'Accretion · photon ring',     icon: 'M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0 M3 12c2.8-2.6 5.7-3.9 9-3.9s6.2 1.3 9 3.9c-2.8 2.6-5.7 3.9-9 3.9s-6.2-1.3-9-3.9 Z' },
  { id: 'liquid',    name: 'Liquid Cluster',  tagline: 'Cohesive · flowing',          icon: 'M12 3c3.2 4.4 6 8.2 6 11.6a6 6 0 0 1-12 0C6 11.2 8.8 7.4 12 3 Z M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5' },
  { id: 'magnetic',  name: 'Magnetic Field',  tagline: 'Dipole · field lines',        icon: 'M7 4v7a5 5 0 0 0 10 0V4 M7 4h4v4H7z M13 4h4v4h-4z M9.5 20h5' },
  { id: 'smokefire', name: 'Smoke & Fire',    tagline: 'Thermal · turbulent',         icon: 'M12 21c-3.3 0-5.5-2.2-5.5-5.2 0-2.1 1-3.6 2.2-5.4.6 1 1.4 1.6 2.3 1.9-.2-2.4 1-5.4 4-7.9.2 2.6 1.2 4 2.2 5.6 1 1.5 1.8 3 1.8 5.8 0 3-2.2 5.2-7 5.2 Z' },
  { id: 'nebula',    name: 'Nebula Drift',    tagline: 'Cosmic cloud · layers',       icon: 'M5 15a5 5 0 0 1 1-9.9A6 6 0 0 1 17 6.5 4.5 4.5 0 0 1 19 15.4 M5 15h14 M8 19h8' },
  { id: 'wave',      name: 'Wave Field',      tagline: 'Ripples · interference',      icon: 'M2 12c2-3.2 4-3.2 6 0s4 3.2 6 0 4-3.2 6 0 M2 18c2-3.2 4-3.2 6 0s4 3.2 6 0 4-3.2 6 0 M2 6c2-3.2 4-3.2 6 0s4 3.2 6 0 4-3.2 6 0' },
  { id: 'dna',       name: 'Molecular Helix', tagline: 'Springs · bonds',             icon: 'M8 3c0 6 8 6 8 12 M16 3c0 6-8 6-8 12 M8 21c0-6 8-6 8-12 M8 7h8 M8 17h8 M9.5 12h5' },
  { id: 'audio',     name: 'Audio Reactive',  tagline: 'FFT · beat drive',            icon: 'M4 10v4 M8.5 6v12 M13 9v6 M17.5 4v16 M21 10v4' },
];

export const EFFECT_IDS = EFFECT_CATALOG.map((e) => e.id);

export function getEffectMeta(id: string): EffectMeta | undefined {
  return EFFECT_CATALOG.find((e) => e.id === id);
}
