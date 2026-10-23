/** Pin artwork, lifted unchanged from the single-file page: one SVG per category and
 *  a hand-drawn one for the places Sai will recognise by their silhouette.  Kept as
 *  markup strings because that is what the pin's inner HTML is. */
const sv = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

export const ICONS: Record<string, string> = {
  stay:sv('<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>'),
  see:sv('<path d="m12 3 2.9 5.9 6.1.9-4.4 4.3 1 6.1-5.6-2.9-5.6 2.9 1-6.1L3 9.8l6.1-.9L12 3z"/>'),
  show:sv('<path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><path d="M13 5v14"/>'),
  free:sv('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  park:sv('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  beach:sv('<path d="M12 10V2M5 11l1.5 1.5M2 18h2M20 18h2M17.5 12.5 19 11M22 22H2M16 6l-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>'),
  nature:sv('<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'),
  travel:sv('<path d="m3 11 19-9-9 19-2-8-8-2z"/>'),
  extra:sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
};

/* "free" alone covers 9 places, so the landmarks get their own icon and only the
   leftovers fall back to the category above. */
export const PLACEICONS: Record<string, string> = {
  airport:sv('<path d="m22 2-7 20-4-9-9-4 20-7z"/>'),
  dtla:sv('<path d="M4 17V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9M2 17h20M4 11h16M8 6v5M16 6v5"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>'),
  sphere:sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>'),
  highroller:sv('<circle cx="12" cy="10" r="6"/><path d="M12 4v12M6 10h12M8.2 5.8l7.6 8.4M15.8 5.8 8.2 14.2M12 16l-4 6M12 16l4 6"/>'),
  bellagio:sv('<path d="M12 22a6 6 0 0 0 6-6c0-4-6-10-6-10S6 12 6 16a6 6 0 0 0 6 6z"/>'),
  caesars:sv('<path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4H6zM4 6h16M16 10a4 4 0 0 1-8 0"/>'),
  venetian:sv('<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10h20L12 3 2 10z"/>'),
  wynn:sv('<path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path d="m19 15 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>'),
  south:sv('<path d="M3 21h18M5 21V7l6-4v18M11 21V11h8v10M14 14h2M14 17h2"/>'),
  welcome:sv('<path d="M12 2v20M5 6h14l2 3-2 3H5z"/>'),
  fremont:sv('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>'),
  strat:sv('<path d="M12 2v20M7 22l5-20 5 20M8.5 12h7M6.5 17h11"/>'),
  paris:sv('<path d="M12 2v20M7 22l5-20 5 20M8.5 12h7M6.5 17h11"/>'),
  lvcity:sv('<path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/>'),
  lacity:sv('<path d="M12 22V10M12 10c0-3 3-5 6-4-1 3-3 4-6 4zm0 0c0-3-3-5-6-4 1 3 3 4 6 4zM3 19c2 1 3 1 4.5 0s2.5-1 4.5 0 3 1 4.5 0 2.5-1 4.5 0"/>'),
  sevenmm:sv('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  hoover:sv('<path d="M3 7c6 0 6 4 9 4s3-4 9-4M3 13c6 0 6 4 9 4s3-4 9-4M3 19c6 0 6 3 9 3"/>'),
  universal:sv('<path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9zM4 11 3 6l17-3 1 5M9.5 5.2 8 10.4M14.5 4.3 13 9.5"/>'),
  sign:sv('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'),
  griffith:sv('<path d="M4 20h16M6 20a6 6 0 0 1 12 0M12 8V4M10 6h4"/>'),
  promenade:sv('<path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9zM3 9l2-5h14l2 5M9 21v-7h6v7"/>'),
  venice:sv('<path d="M12 22V10M12 10c0-3 3-5 6-4-1 3-3 4-6 4zm0 0c0-3-3-5-6-4 1 3 3 4 6 4zM3 19c2 1 3 1 4.5 0s2.5-1 4.5 0 3 1 4.5 0 2.5-1 4.5 0"/>')
};
