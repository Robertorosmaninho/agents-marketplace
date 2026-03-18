export function rawToDecimalString(rawAmount: string, decimals: number): string {
  const raw = rawAmount.replace(/^0+/, "") || "0";

  if (decimals === 0) {
    return raw;
  }

  const whole = raw.length > decimals ? raw.slice(0, -decimals) : "0";
  const fraction = raw.padStart(decimals, "0").slice(-decimals).replace(/0+$/, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function decimalToRawString(amount: string, decimals: number): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${amount}`);
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const safeFraction = fractionPart.padEnd(decimals, "0").slice(0, decimals);
  const joined = `${wholePart}${safeFraction}`.replace(/^0+/, "");
  return joined.length > 0 ? joined : "0";
}
