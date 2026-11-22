export const cameraViews: Record<
  string,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  "Central Vehicle": { position: [7, 3.2, 8], target: [0, 0.8, 0] },
  Entrance: { position: [0, 3.3, 12], target: [0, 1, -3] },
  "Main Showroom": { position: [12, 5.5, 12], target: [0, 1, -2] },
  "Wide Architecture": { position: [16, 6.2, 12], target: [-2, 1.5, -4] },
  Reception: { position: [-4, 2.8, -4], target: [-9, 1, -9.5] },
  Lounge: { position: [5.5, 2.3, -3], target: [10, 0.9, -9] },
  Ceiling: { position: [3, 2.1, 5], target: [0, 6, -2] },
  Cinematic: { position: [-7, 1.5, 6], target: [0, 0.8, 0] },
  "West Island": { position: [-12, 3.5, 10], target: [-8, 0.5, 3] },
  "East Island": { position: [13, 3.5, 10], target: [8, 0.5, 3] },
};
