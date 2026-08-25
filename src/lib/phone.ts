export const phoneRegex = /^[0-9]{10,15}$/;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

export function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@academy.com`;
}