/** The icon a stop gets on the map.  Chosen so that a glance at a day says what kind of
 *  day it is: where he sleeps, where he eats, what he is going to see.  Each one is the
 *  inner markup of a 24-unit SVG, the same shape the trip's own pins use. */

export type IconKey =
  | "hotel" | "restaurant" | "cafe" | "bar" | "sight" | "fountain" | "show" | "music"
  | "concert" | "amusement" | "museum" | "park" | "beach" | "nature" | "viewpoint"
  | "photo" | "shop" | "casino" | "sport" | "event" | "transport" | "airport" | "walk"
  | "pin";

export const ICON_PATH: Record<IconKey, string> = {
  hotel: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  restaurant: '<path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M18 3c-1.5 1.5-2 3.5-2 6s.5 3 2 3v9"/>',
  cafe: '<path d="M4 8h12v5a5 5 0 0 1-10 0zM16 9h3a2 2 0 0 1 0 5h-3M4 21h14"/>',
  bar: '<path d="M4 4h16l-8 8zM12 12v7M8 19h8"/>',
  sight: '<path d="m12 3 2.9 5.9 6.1.9-4.4 4.3 1 6.1-5.6-2.9-5.6 2.9 1-6.1L3 9.8l6.1-.9L12 3z"/>',
  fountain: '<path d="M12 21V9M12 9a4 4 0 0 0-4-4M12 9a4 4 0 0 1 4-4M5 21h14M8 13c0 2-1 3-2 4M16 13c0 2 1 3 2 4"/>',
  show: '<path d="M4 6h16v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM9 18v3M15 18v3M8 10h.01M16 10h.01M9 14c1.5 1.5 4.5 1.5 6 0"/>',
  music: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>',
  concert: '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M12 2v2"/><circle cx="12" cy="11" r="1.6"/>',
  amusement: '<path d="M12 3v9M3 21c3-6 15-6 18 0M5 9a7 7 0 0 1 14 0M12 12 5 9M12 12l7-3"/>',
  museum: '<path d="M3 9 12 4l9 5M5 9v9M19 9v9M9 9v9M15 9v9M3 21h18"/>',
  park: '<path d="M12 22v-6M12 16c-4 0-6-3-6-6a6 6 0 1 1 12 0c0 3-2 6-6 6z"/>',
  beach: '<path d="M3 20c2 1 3 1 4.5 0s2.5-1 4.5 0 3 1 4.5 0 2.5-1 4.5 0M12 17V8M12 8c3-3 7-2 8 1-3-1-6 0-8-1zm0 0C9 5 5 6 4 9c3-1 6 0 8-1z"/>',
  nature: '<path d="m3 18 6-9 4 6 2-3 6 6zM8 7a2 2 0 1 0 0-.01"/>',
  viewpoint: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  shop: '<path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 9l2-5h14l2 5M9 21v-7h6v7"/>',
  casino: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/>',
  sport: '<circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 3 15 0 18M3 12h18M5 6c4 2 10 2 14 0M5 18c4-2 10-2 14 0"/>',
  event: '<path d="M4 6h16v15H4zM4 10h16M9 3v4M15 3v4M9 15h6"/>',
  transport: '<path d="M5 3h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 10h14M8 22l1.5-4M16 22l-1.5-4"/><circle cx="8.6" cy="13.5" r="1"/><circle cx="15.4" cy="13.5" r="1"/>',
  airport: '<path d="M2 14 22 7l-3 10-6-2-3 4-2-4z"/>',
  walk: '<circle cx="13" cy="4.5" r="2"/><path d="M11 21l2-5-2.5-3 .5-4 3 2 2 1M10.5 9 8 11l-1 3"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
};

/** What the picker shows, grouped the way someone thinks about a day. */
export const ICON_GROUPS: { group: string; keys: IconKey[] }[] = [
  { group: "Stay & eat", keys: ["hotel", "restaurant", "cafe", "bar"] },
  { group: "See", keys: ["sight", "fountain", "viewpoint", "photo", "museum", "casino"] },
  { group: "Do", keys: ["show", "concert", "music", "event", "amusement", "sport", "shop"] },
  { group: "Outdoors", keys: ["park", "beach", "nature", "walk"] },
  { group: "Travel", keys: ["transport", "airport", "pin"] },
];

export const ICON_LABEL: Record<IconKey, string> = {
  hotel: "Hotel", restaurant: "Restaurant", cafe: "Café", bar: "Bar",
  sight: "Sight", fountain: "Fountain", show: "Show", music: "Live music",
  concert: "Concert", amusement: "Theme park", museum: "Museum", park: "Park",
  beach: "Beach", nature: "Nature", viewpoint: "Viewpoint", photo: "Photo spot",
  shop: "Shopping", casino: "Casino", sport: "Sport", event: "Event",
  transport: "Bus or train", airport: "Airport", walk: "Walk", pin: "Other",
};

/** The colour a stop's pin takes, so a day reads at a glance. */
export const ICON_COLOUR: Record<IconKey, string> = {
  hotel: "#c9b6ff", restaurant: "#ff9f6b", cafe: "#ff9f6b", bar: "#ff9f6b",
  sight: "#ff4fa3", fountain: "#3fe0e8", show: "#ff4fa3", music: "#ff4fa3",
  concert: "#ff4fa3", amusement: "#ffb547", museum: "#3fe0e8", park: "#5ee39a",
  beach: "#3fe0e8", nature: "#5ee39a", viewpoint: "#ffb547", photo: "#ffd166",
  shop: "#a89cc8", casino: "#ff4fa3", sport: "#5ee39a", event: "#ffd166",
  transport: "#a89cc8", airport: "#a89cc8", walk: "#5ee39a", pin: "#f3e7d3",
};

/** A pin's soft fill: the icon's own colour, faded. */
export const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const iconSvg = (k: IconKey) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATH[k] ?? ICON_PATH.pin}</svg>`;

/** The trip's own categories, mapped onto this set, so the Vegas plan can be saved as
 *  an ordinary plan like any other. */
export const CAT_ICON: Record<string, IconKey> = {
  stay: "hotel", see: "sight", show: "show", free: "sight", park: "amusement",
  beach: "beach", nature: "nature", travel: "transport", extra: "sight",
};
