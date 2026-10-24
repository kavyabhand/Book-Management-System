export function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date
    .toLocaleDateString(undefined, { day: "numeric", month: "short" })
    .toLowerCase();
}
