export function withAlpha(color: string, alpha: number) {
  if (color.startsWith("rgba")) {
    return color.replace(
      /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
      `rgba($1,$2,$3,${alpha})`
    );
  }

  if (color.startsWith("rgb")) {
    return color.replace("rgb", "rgba").replace(")", `,${alpha})`);
  }

  return color; // fallback
}

export function brighten(color: string, amount = 30) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return color;

  const r = Math.min(+m[1] + amount, 255);
  const g = Math.min(+m[2] + amount, 255);
  const b = Math.min(+m[3] + amount, 255);

  return `rgb(${r}, ${g}, ${b})`;
}
