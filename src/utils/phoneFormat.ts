import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

export interface PhoneInfo {
  raw: string;
  valid: boolean;
  /** +14155552671 — full number with country code */
  e164: string;
  /** +1 415 555 2671 */
  international: string;
  national: string;
  /** ISO-3166 alpha-2, e.g. "US" */
  country?: CountryCode;
  /** Country calling code without "+", e.g. "1" */
  callingCode?: string;
  type?: string;
  /** Digits only, for wa.me links */
  waDigits: string;
  whatsappUrl: string;
  flag: string;
}

const EMPTY: PhoneInfo = {
  raw: "",
  valid: false,
  e164: "",
  international: "",
  national: "",
  waDigits: "",
  whatsappUrl: "",
  flag: "",
};

export const countryFlag = (iso?: string): string => {
  if (!iso || iso.length !== 2) return "";
  const up = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return "";
  return String.fromCodePoint(
    ...[...up].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
};

const isoHint = (hint?: string | null): CountryCode | undefined => {
  const v = (hint || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(v) && (getCountries() as string[]).includes(v)) {
    return v as CountryCode;
  }
  return undefined;
};

/**
 * Parse an arbitrary phone string, identify its region and return the full
 * number with country code plus a ready-to-use WhatsApp link.
 * `hintCountry` (ISO-2, e.g. the lead's channel country) is used when the
 * number has no country code of its own.
 */
export function analyzePhone(
  raw: string | null | undefined,
  hintCountry?: string | null,
): PhoneInfo {
  const input = String(raw || "").trim();
  if (!input || input.toUpperCase() === "NONE") return { ...EMPTY, raw: input };

  const cleaned = input.replace(/[^\d+]/g, (c) => (c === "+" ? "+" : " ")).trim();
  const hint = isoHint(hintCountry);

  const attempts: (CountryCode | undefined)[] = cleaned.startsWith("+")
    ? [undefined, hint]
    : [hint, undefined];

  for (const region of attempts) {
    const pn = parsePhoneNumberFromString(cleaned, region);
    if (pn && pn.isValid()) {
      const digits = pn.number.replace(/\D/g, "");
      return {
        raw: input,
        valid: true,
        e164: pn.number,
        international: pn.formatInternational(),
        national: pn.formatNational(),
        country: pn.country,
        callingCode: pn.countryCallingCode?.toString(),
        type: pn.getType(),
        waDigits: digits,
        whatsappUrl: `https://wa.me/${digits}`,
        flag: countryFlag(pn.country),
      };
    }
  }

  // Not strictly valid — still surface a best-effort full number.
  const digits = cleaned.replace(/\D/g, "");
  const guessed = cleaned.startsWith("+") ? `+${digits}` : "";
  return {
    ...EMPTY,
    raw: input,
    e164: guessed,
    international: guessed || input,
    national: input,
    waDigits: digits,
    whatsappUrl: digits.length >= 8 ? `https://wa.me/${digits}` : "",
  };
}

export const callingCodeFor = (iso: string): string => {
  try {
    return `+${getCountryCallingCode(iso.toUpperCase() as CountryCode)}`;
  } catch {
    return "";
  }
};
