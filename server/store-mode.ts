// A preview must never write real orders through a production database.
export function storeModesMatch(
  mode: string | undefined,
  databaseTestMode: unknown,
) {
  return (
    typeof databaseTestMode === "boolean" &&
    (mode === "live") !== databaseTestMode
  );
}
