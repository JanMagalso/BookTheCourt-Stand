function fnv1aHash(input: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).toUpperCase();
}

export function buildReceiptId(input: {
  playerId: string;
  paymentReference: string;
  bookingIds: string[];
}) {
  const normalizedReference = input.paymentReference.trim().toUpperCase();
  const ids = [...input.bookingIds].sort().join("|");
  const source = `${input.playerId}|${normalizedReference || "NOREF"}|${ids}`;
  const digest = fnv1aHash(source).slice(0, 8).padEnd(8, "0");

  return `BTC-${digest}`;
}

export function normalizeReceiptId(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");

  if (!compact) {
    return "";
  }

  if (compact.startsWith("BTC-")) {
    return compact;
  }

  if (compact.startsWith("BTC")) {
    return `BTC-${compact.slice(3).replace(/^-/, "")}`;
  }

  return `BTC-${compact}`;
}

export function buildBookingTransactionKey(input: {
  playerId: string;
  paymentReference?: string | null;
  paymentReceiptUrl?: string | null;
  fallbackBookingId: string;
}) {
  const normalizedReference = String(input.paymentReference ?? "")
    .trim()
    .toUpperCase();

  if (normalizedReference) {
    return `${input.playerId}|REF:${normalizedReference}`;
  }

  const normalizedReceiptUrl = String(input.paymentReceiptUrl ?? "")
    .trim()
    .toLowerCase();

  if (normalizedReceiptUrl) {
    return `${input.playerId}|PROOF:${normalizedReceiptUrl}`;
  }

  return `${input.playerId}|NOREF:${input.fallbackBookingId}`;
}
