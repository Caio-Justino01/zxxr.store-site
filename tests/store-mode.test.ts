import test from "node:test";
import assert from "node:assert/strict";
import { storeModesMatch } from "../server/store-mode.ts";

test("live orders require live server and database modes; previews cannot write live data", () => {
  assert.equal(storeModesMatch("live", false), true);
  assert.equal(storeModesMatch("test", true), true);
  assert.equal(storeModesMatch(undefined, true), true);
  assert.equal(storeModesMatch("live", true), false);
  assert.equal(storeModesMatch("test", false), false);
  assert.equal(storeModesMatch(undefined, false), false);
  for (const invalid of [undefined, null, "false", 0])
    assert.equal(storeModesMatch("live", invalid), false);
});
