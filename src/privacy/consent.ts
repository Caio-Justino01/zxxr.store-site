export const CONSENT_KEY = "zxxr-privacy-v1";
export const CONSENT_VERSION = 1;
export type ConsentChoices = { analytics: boolean; external: boolean };
export type ConsentRecord = ConsentChoices & {
  version: number;
  updatedAt: string;
};
export function readConsent(raw: string | null): ConsentRecord | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<ConsentRecord>;
    if (
      record.version !== CONSENT_VERSION ||
      typeof record.analytics !== "boolean" ||
      typeof record.external !== "boolean" ||
      typeof record.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(record.updatedAt))
    )
      return null;
    return record as ConsentRecord;
  } catch {
    return null;
  }
}
export function createConsent(
  choices: ConsentChoices,
  now = new Date(),
): ConsentRecord {
  return {
    analytics: choices.analytics === true,
    external: choices.external === true,
    version: CONSENT_VERSION,
    updatedAt: now.toISOString(),
  };
}
export function writeConsent(
  storage: Pick<Storage, "setItem">,
  choices: ConsentChoices,
): ConsentRecord | null {
  const record = createConsent(choices);
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}
