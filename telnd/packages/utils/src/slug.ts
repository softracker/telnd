export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(base: string, existingSlugs: string[]): string {
  let slug = generateSlug(base);
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${generateSlug(base)}-${counter}`;
    counter++;
  }

  return slug;
}
