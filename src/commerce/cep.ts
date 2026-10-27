import type { Address } from "./contracts";

// A delayed postal lookup must never overwrite a customer's subsequent edits.
export function mergeCepLookup(
  before: Address,
  current: Address,
  result: Partial<Address>,
): Partial<Address> {
  const normalize = (value: string) => value.replace(/\D/g, "");
  if (normalize(current.cep) !== normalize(before.cep)) return {};
  return Object.fromEntries(
    Object.entries(result).filter(
      ([key]) =>
        key === "cep" ||
        current[key as keyof Address] === before[key as keyof Address],
    ),
  );
}
