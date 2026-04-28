export type ViesResult = {
  checkedAt: string;
  source: "vies";
  uid: string;
  countryCode: string;
  vatNumber: string;
  isValid: boolean;
  name: string;
  address: string;
  requestIdentifier: string;
  userError?: string;
  raw: unknown;
};

type ViesResponse = {
  isValid?: boolean;
  requestDate?: string;
  userError?: string;
  name?: string;
  address?: string;
  requestIdentifier?: string;
  vatNumber?: string;
};

export async function checkVatNumber(uid: string): Promise<ViesResult> {
  const parsed = parseUid(uid);
  const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${parsed.countryCode}/vat/${encodeURIComponent(parsed.vatNumber)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`VIES request failed: ${response.status} ${await response.text()}`);
  }

  const raw = (await response.json()) as ViesResponse;
  return {
    checkedAt: raw.requestDate ?? new Date().toISOString(),
    source: "vies",
    uid: normalizeUid(uid),
    countryCode: parsed.countryCode,
    vatNumber: raw.vatNumber ?? parsed.vatNumber,
    isValid: Boolean(raw.isValid),
    name: raw.name && raw.name !== "---" ? raw.name : "",
    address: raw.address && raw.address !== "---" ? raw.address : "",
    requestIdentifier: raw.requestIdentifier ?? "",
    userError: raw.userError,
    raw,
  };
}

function parseUid(uid: string) {
  const normalized = normalizeUid(uid);
  const countryCode = normalized.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("UID muss mit Länderkennzeichen beginnen, z.B. ATU12345678.");
  return {
    countryCode,
    vatNumber: normalized.slice(2),
  };
}

function normalizeUid(uid: string) {
  return uid.replace(/\s/g, "").toUpperCase();
}
