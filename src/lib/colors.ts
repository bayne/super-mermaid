const COLORS = [
  "#E63946",
  "#457B9D",
  "#2A9D8F",
  "#E9C46A",
  "#F4A261",
  "#264653",
  "#A855F7",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
];

export function assignColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export { COLORS };
