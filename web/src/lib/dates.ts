export function parseDate(d: string | null): Date {
  if (!d) return new Date();
  const [year, month] = d.split('-');
  return new Date(parseInt(year), month ? parseInt(month) - 1 : 0);
}

export function formatDate(d: string | null): string {
  if (!d) return 'Present';
  const [year, month] = d.split('-');
  if (!month) return year;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}
