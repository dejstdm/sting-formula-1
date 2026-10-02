/** URL for a file in public/. Vite rewrites imports, not these plain strings. */
export function publicUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${file.replace(/^\.?\//, '')}`;
}
