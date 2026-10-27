import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCepLookup } from "../src/commerce/cep.ts";

const address = {
  recipient: "Teste",
  cep: "30110000",
  street: "",
  number: "10",
  neighborhood: "",
  city: "",
  state: "MG" as const,
  complement: "",
  reference: "",
};
const result = {
  cep: "30110000",
  street: "Rua consultada",
  city: "Belo Horizonte",
};

test("postal lookup fills untouched address fields", () => {
  assert.deepEqual(mergeCepLookup(address, address, result), result);
});
test("late lookup preserves manually edited fields", () => {
  assert.deepEqual(
    mergeCepLookup(address, { ...address, street: "Rua digitada" }, result),
    { cep: "30110000", city: "Belo Horizonte" },
  );
});
test("lookup for an earlier postal code is discarded", () => {
  assert.deepEqual(
    mergeCepLookup(address, { ...address, cep: "01001000" }, result),
    {},
  );
});
