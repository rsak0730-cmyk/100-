export interface DisplayVehicle {
  id: string;
  name: string;
  generation: string;
  year: number;
  path: string;
  bytes: number;
  position: [number, number, number];
  camera: string;
  author: string;
  source: string;
  distribution: string;
  license: string;
}
export const additionalVehicles: DisplayVehicle[] = [
  {
    id: "m5-f10",
    name: "BMW M5",
    generation: "F10",
    year: 2013,
    path: "models/m5-f10-2013.glb",
    bytes: 1062736,
    position: [-8, 0, 3],
    camera: "West Island",
    author: "Galaxy Car Showroom",
    source:
      "https://sketchfab.com/3d-models/2013-bmw-m5-f10-70e0780ffa784b82982921869cb2a370",
    distribution: "https://github.com/iodiot/bmw-driver",
    license: "CC-BY-4.0",
  },
  {
    id: "m4-csl-g82",
    name: "BMW M4 CSL",
    generation: "G82",
    year: 2023,
    path: "models/m4-csl-2023.glb",
    bytes: 3502516,
    position: [8, 0, 3],
    camera: "East Island",
    author: "Black Snow",
    source:
      "https://sketchfab.com/3d-models/bmw-m4-csl-2023-26d05968e63b4fc28205cbb9abb0ea41",
    distribution: "https://github.com/AshishB2000/bmw-m4-csl-configurator",
    license: "CC-BY-4.0",
  },
];
