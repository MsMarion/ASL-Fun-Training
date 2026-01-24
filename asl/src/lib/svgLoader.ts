export interface SvgData {
  pathData: string;
  viewBox: string;
  transform: string;
}

export async function loadSignSvg(letter: string): Promise<SvgData> {
  const response = await fetch(`/sign-symbols/Plain-svg/${letter.toUpperCase()}.svg`);
  const text = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");

  const svg = doc.querySelector("svg");
  if (!svg) throw new Error(`Invalid SVG for letter ${letter}`);

  const viewBox =
    svg.getAttribute("viewBox") ?? "0 0 18000 21000";

  const path = doc.querySelector("path");
  const pathData = path?.getAttribute("d") ?? "";

  const g = doc.querySelector("g");
  const transform = g?.getAttribute("transform") ?? "";

  return { pathData, viewBox, transform };
}

export const AVAILABLE_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S",
  "T", "U", "V", "X", "Y",
] as const;

export type AvailableLetter = (typeof AVAILABLE_LETTERS)[number];
