// Shared pin styling for every Leaflet map in the app, so a location always
// looks the same whether you're picking it or viewing it later.
export const BEAURITY_PINK = "#e6007e";

export function pinSvg(color: string = BEAURITY_PINK) {
  return `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 31S1 18.8 1 12a11 11 0 1 1 22 0c0 6.8-11 19-11 19Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.2" fill="white"/>
  </svg>`;
}
