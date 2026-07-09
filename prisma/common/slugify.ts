
// Lives in one place so the seed script AND the products service both use it.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric runs become a dash
    .replace(/^-+|-+$/g, '');    // trim leading/trailing dashes
}