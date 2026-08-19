export function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function customerCodeFromPhone(phone: string) {
  return normalizePhoneNumber(phone).replace(/\D/g, "");
}

export function formatCustomerCode(phone?: string | null) {
  if (!phone) return "No code";
  const code = customerCodeFromPhone(phone);
  return code ? `SKU ${code}` : "No code";
}

export function sameNormalizedPhone(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return normalizePhoneNumber(left) === normalizePhoneNumber(right);
}
