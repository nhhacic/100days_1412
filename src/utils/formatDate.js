export function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toJSDate(input) {
  if (!input && input !== 0) return null;
  if (input instanceof Date) return input;
  // Firestore Timestamp
  if (typeof input === 'object' && typeof input.toDate === 'function') return input.toDate();
  const d = new Date(input);
  return isNaN(d) ? null : d;
}

export function formatDate(input) {
  const d = toJSDate(input);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(input) {
  const d = toJSDate(input);
  if (!d) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default formatDate;

export function formatMonthYear(input) {
  const d = toJSDate(input);
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `Tháng ${mm}/${yyyy}`;
}
