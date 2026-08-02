// Shared phone helpers (safe for client + server — no server-only imports).

/** Digits-only WhatsApp number, defaulting to India (+91) when no country code. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  let d = String(phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) d = "91" + d; // bare 10-digit Indian mobile
  else if (d.startsWith("0")) d = "91" + d.slice(1);
  return d;
}

/** Build a wa.me click-to-chat link with a pre-filled message. */
export function waMeLink(
  phone: string | null | undefined,
  text: string,
): string | null {
  const num = toWhatsAppNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
