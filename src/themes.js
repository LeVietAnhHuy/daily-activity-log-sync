/**
 * Theme definitions — 8 distinct moods:
 * 1. Cosmic        → vibrant dark navy  (dark)
 * 2. Rose Taupe    → warm light cream   (light)
 * 3. Desert        → sandy parchment    (light)
 * 4. Sienna        → rich warm brown    (dark warm)
 * 5. Neon Grape    → electric violet    (dark vivid)
 * 6. Powder        → soft blush pastel  (light)
 * 7. Lagoon        → ocean teal vivid   (dark vibrant)
 * 8. Noir          → bold black & red   (dark dramatic)
 */
export const themes = [
  // ── 1. Cosmic ──────────────────────────────────────────
  {
    id: "cosmic",
    name: "Cosmic",
    preview: ["#061d40", "#27C0FE", "#00C489", "#FCDC4C"],
    vars: {
      "--bg-color":        "#061d40",
      "--surface-color":   "#0d3166",
      "--surface-hover":   "#123d80",
      "--border-color":    "rgba(39,192,254,0.2)",
      "--text-primary":    "#e8f4ff",
      "--text-secondary":  "rgba(232,244,255,0.5)",
      "--spiro":           "#27C0FE",
      "--accent-color":    "#27C0FE",
      "--accent-glow":     "rgba(39,192,254,0.2)",
      "--caribbean-green": "#00C489",
      "--gargoyle-gas":    "#FCDC4C",
      "--cool-black":      "#061d40",
      "--title-grad-from": "#27C0FE",
      "--title-grad-to":   "#FCDC4C",
      "--card-shadow":     "0 4px 16px rgba(6,29,64,0.55)",
    },
  },

  // ── 2. Rose Taupe ───────────────────────────────────────
  {
    id: "rose",
    name: "Rose Taupe",
    preview: ["#FFF5EE", "#995757", "#428C8B", "#FFDBB0"],
    vars: {
      "--bg-color":        "#FFF5EE",
      "--surface-color":   "#FAE8DC",
      "--surface-hover":   "#F0D4C4",
      "--border-color":    "rgba(153,87,87,0.18)",
      "--text-primary":    "#4A1A1A",
      "--text-secondary":  "rgba(74,26,26,0.5)",
      // Rose Taupe theme — light cream bg → accent colors must be DARK
      "--spiro":           "#995757",
      "--accent-color":    "#995757",
      "--accent-glow":     "rgba(153,87,87,0.18)",
      "--caribbean-green": "#2E6B6A",   /* dark teal — readable on cream */
      "--gargoyle-gas":    "#7A2E2E",   /* dark rose — readable on cream */
      "--cool-black":      "#4A1A1A",
      "--title-grad-from": "#995757",
      "--title-grad-to":   "#2E6B6A",
      "--card-shadow":     "0 1px 4px rgba(153,87,87,0.12)",
      "--badge-text":      "#FFF5EE",   /* light text on dark teal badge */
    },
  },

  // ── 3. Desert ───────────────────────────────────────────
  {
    id: "desert",
    name: "Desert",
    preview: ["#F9DEBB", "#5C5E6A", "#BAA782", "#E8BCA0"],
    vars: {
      "--bg-color":        "#F9DEBB",
      "--surface-color":   "#F0D0A0",
      "--surface-hover":   "#E4BF8A",
      "--border-color":    "rgba(92,94,106,0.18)",
      "--text-primary":    "#2A2010",
      "--text-secondary":  "rgba(42,32,16,0.5)",
      // Desert theme — sandy parchment bg → accent colors must be DARK
      "--spiro":           "#5C5E6A",
      "--accent-color":    "#5C5E6A",
      "--accent-glow":     "rgba(92,94,106,0.18)",
      "--caribbean-green": "#4A3D28",   /* dark warm brown — readable on sand */
      "--gargoyle-gas":    "#7A4F18",   /* dark amber — readable on sand */
      "--cool-black":      "#2A2010",
      "--title-grad-from": "#5C5E6A",
      "--title-grad-to":   "#7A4F18",
      "--card-shadow":     "0 1px 4px rgba(42,32,16,0.1)",
      "--badge-text":      "#F9DEBB",   /* light text on dark brown badge */
    },
  },

  // ── 4. Sienna ───────────────────────────────────────────
  {
    id: "sienna",
    name: "Sienna",
    preview: ["#2a1a0c", "#00A499", "#F29F7C", "#F5D7AB"],
    vars: {
      "--bg-color":        "#2a1a0c",
      "--surface-color":   "#3C2410",
      "--surface-hover":   "#522e15",
      "--border-color":    "rgba(0,164,153,0.25)",
      "--text-primary":    "#F5D7AB",
      "--text-secondary":  "rgba(245,215,171,0.55)",
      "--spiro":           "#00A499",
      "--accent-color":    "#00A499",
      "--accent-glow":     "rgba(0,164,153,0.22)",
      "--caribbean-green": "#00A499",
      "--gargoyle-gas":    "#F5D7AB",
      "--cool-black":      "#3C2410",
      "--title-grad-from": "#00A499",
      "--title-grad-to":   "#F5D7AB",
      "--card-shadow":     "0 4px 16px rgba(20,10,4,0.6)",
    },
  },

  // ── 5. Neon Grape ───────────────────────────────────────
  {
    id: "neon",
    name: "Neon Grape",
    preview: ["#200438", "#3BCEAC", "#EE4266", "#FFD23F"],
    vars: {
      "--bg-color":        "#200438",
      "--surface-color":   "#330756",
      "--surface-hover":   "#44097a",
      "--border-color":    "rgba(59,206,172,0.22)",
      "--text-primary":    "#E8FFFA",
      "--text-secondary":  "rgba(232,255,250,0.5)",
      "--spiro":           "#3BCEAC",
      "--accent-color":    "#3BCEAC",
      "--accent-glow":     "rgba(59,206,172,0.22)",
      "--caribbean-green": "#EE4266",
      "--gargoyle-gas":    "#FFD23F",
      "--cool-black":      "#200438",
      "--title-grad-from": "#EE4266",
      "--title-grad-to":   "#FFD23F",
      "--card-shadow":     "0 4px 20px rgba(16,2,30,0.6)",
    },
  },

  // ── 6. Powder ───────────────────────────────────────────
  {
    id: "powder",
    name: "Powder",
    preview: ["#F7E8D8", "#6E82B7", "#F492A5", "#F9CBD0"],
    vars: {
      "--bg-color":        "#F7E8D8",
      "--surface-color":   "#F0D8C4",
      "--surface-hover":   "#E8C8AE",
      "--border-color":    "rgba(110,130,183,0.2)",
      "--text-primary":    "#2A2040",
      "--text-secondary":  "rgba(42,32,64,0.5)",
      // Powder theme — antique white bg → accent colors must be DARK
      "--spiro":           "#6E82B7",
      "--accent-color":    "#6E82B7",
      "--accent-glow":     "rgba(110,130,183,0.2)",
      "--caribbean-green": "#C4365A",   /* deep fuchsia — readable on cream */
      "--gargoyle-gas":    "#A82060",   /* deep magenta — readable on cream */
      "--cool-black":      "#2A2040",
      "--title-grad-from": "#6E82B7",
      "--title-grad-to":   "#C4365A",
      "--card-shadow":     "0 1px 4px rgba(110,130,183,0.12)",
      "--badge-text":      "#F7E8D8",   /* light text on fuchsia badge */
    },
  },

  // ── 7. Lagoon ───────────────────────────────────────────
  {
    id: "lagoon",
    name: "Lagoon",
    preview: ["#012038", "#08B6CE", "#BBCE5B", "#FADE70"],
    vars: {
      "--bg-color":        "#012038",
      "--surface-color":   "#023b60",
      "--surface-hover":   "#035380",
      "--border-color":    "rgba(8,182,206,0.22)",
      "--text-primary":    "#E0FAFA",
      "--text-secondary":  "rgba(224,250,250,0.5)",
      "--spiro":           "#08B6CE",
      "--accent-color":    "#08B6CE",
      "--accent-glow":     "rgba(8,182,206,0.22)",
      "--caribbean-green": "#2B8256",   /* Darker green for white text */
      "--gargoyle-gas":    "#FADE70",
      "--cool-black":      "#012038",
      "--title-grad-from": "#08B6CE",
      "--title-grad-to":   "#BBCE5B",
      "--card-shadow":     "0 4px 16px rgba(1,20,40,0.6)",
      "--badge-text":      "#FFFFFF",
    },
  },

  // ── 8. Noir ─────────────────────────────────────────────
  {
    id: "noir",
    name: "Noir",
    preview: ["#1A1B22", "#EF233C", "#8D99AE", "#E4E4F4"],
    vars: {
      "--bg-color":        "#1A1B22",
      "--surface-color":   "#252631",
      "--surface-hover":   "#31323f",
      "--border-color":    "rgba(239,35,60,0.22)",
      "--text-primary":    "#E4E4F4",
      "--text-secondary":  "rgba(228,228,244,0.5)",
      "--spiro":           "#EF233C",
      "--accent-color":    "#EF233C",
      "--accent-glow":     "rgba(239,35,60,0.2)",
      "--caribbean-green": "#5C677D",   /* Darker cool grey for white text */
      "--gargoyle-gas":    "#E4E4F4",
      "--cool-black":      "#1A1B22",
      "--title-grad-from": "#EF233C",
      "--title-grad-to":   "#E4E4F4",
      "--card-shadow":     "0 4px 16px rgba(0,0,0,0.5)",
      "--badge-text":      "#FFFFFF",
    },
  },
];

export function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem("daily-log-theme", theme.id);
}

export function getStoredTheme() {
  const id = localStorage.getItem("daily-log-theme") || "cosmic";
  return themes.find((t) => t.id === id) || themes[0];
}
