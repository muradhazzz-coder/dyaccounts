export function formatIqd(amount: number) {
  return `${new Intl.NumberFormat("ar-IQ").format(amount)} د.ع`;
}

export function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
