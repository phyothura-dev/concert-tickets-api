export function toIsoString(date: Date | string): string {
  return typeof date === 'string' ? date : date.toISOString();
}
