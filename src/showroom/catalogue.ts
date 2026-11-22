export interface Vehicle {
  id: string;
  name: string;
  generation: string;
  series: string;
  body: string;
  category: string;
  model: string | null;
}
const groups: [string, string, string, string[]][] = [
  [
    "M2",
    "Full M",
    "Coupe",
    ["M2 F87", "M2 Competition F87", "M2 CS F87", "M2 G87"],
  ],
  [
    "M3",
    "Full M",
    "Sedan",
    [
      "M3 E30",
      "M3 E36",
      "M3 E46",
      "M3 E90",
      "M3 E92",
      "M3 F80",
      "M3 G80",
      "M3 Competition G80",
      "M3 CS G80",
      "M3 Touring G81",
    ],
  ],
  [
    "M4",
    "Full M",
    "Coupe",
    [
      "M4 F82",
      "M4 Competition F82",
      "M4 G82",
      "M4 Competition G82",
      "M4 CS G82",
      "M4 CSL G82",
      "M4 GTS F82",
      "M4 Convertible F83",
      "M4 Competition Convertible G83",
    ],
  ],
  [
    "M5",
    "Full M",
    "Sedan",
    [
      "M5 E28",
      "M5 E34",
      "M5 E39",
      "M5 E60",
      "M5 F10",
      "M5 F90",
      "M5 G90",
      "M5 Competition F90",
      "M5 CS F90",
      "M5 Touring G99",
    ],
  ],
  [
    "M6",
    "Full M",
    "Coupe",
    [
      "M6 E24",
      "M6 E63",
      "M6 Convertible E64",
      "M6 Convertible F12",
      "M6 F13",
      "M6 Gran Coupe F06",
    ],
  ],
  [
    "M8",
    "Full M",
    "Coupe",
    [
      "M8 Coupe F92",
      "M8 Competition Coupe F92",
      "M8 Convertible F91",
      "M8 Competition Convertible F91",
      "M8 Gran Coupe F93",
      "M8 Competition Gran Coupe F93",
    ],
  ],
  [
    "SUV",
    "Full M",
    "SUV",
    [
      "X3 M F97",
      "X3 M Competition F97",
      "X4 M F98",
      "X4 M Competition F98",
      "X5 M F95",
      "X5 M Competition F95",
      "X6 M F96",
      "X6 M Competition F96",
      "XM G09",
      "XM Label G09",
    ],
  ],
  [
    "Classic",
    "Classic & special",
    "Coupe",
    [
      "1M Coupe E82",
      "M Roadster E36/7",
      "M Coupe E36/8",
      "M2 CS Racing F87",
      "M3 GTR E46",
    ],
  ],
  [
    "Performance",
    "M Performance",
    "Mixed",
    [
      "M135i F40",
      "M240i G42",
      "M340i G20",
      "M440i G22",
      "M550i G30",
      "X3 M50 G45",
      "X5 M60i G05",
    ],
  ],
];
export const vehicles: Vehicle[] = groups.flatMap(
  ([series, category, body, names]) =>
    names.map((name) => ({
      id: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
      name: `BMW ${name.split(" ").slice(0, -1).join(" ")}`,
      generation: name.split(" ").at(-1)!,
      series,
      category,
      body:
        name.includes("Convertible") || name.includes("Roadster")
          ? "Convertible"
          : name.includes("Touring")
            ? "Touring"
            : name.includes("Gran Coupe")
              ? "Gran Coupe"
              : body,
      model: name === "M4 Competition G82" ? "models/m4.glb" : null,
    })),
);
