import test from "node:test";
import assert from "node:assert/strict";
import { getLaunchStatus, launchResponse } from "../server/launch.ts";
import {
  anchorLaunchClock,
  countdownParts,
  readLaunchStatus,
  remainingSeconds,
} from "../launch-preview/launch-state.ts";

const deadline = Date.parse("2026-10-31T00:00:00-03:00");
const enabled = { LAUNCH_GATE_ENABLED: "true" };

test("public launch is enabled by default and can be explicitly disabled", () => {
  assert.equal(getLaunchStatus({}, deadline + 86_400_000).enabled, true);
  assert.equal(getLaunchStatus({}, deadline + 86_400_000).isOpen, true);
  assert.equal(
    getLaunchStatus({ LAUNCH_GATE_ENABLED: "false" }, deadline).isOpen,
    false,
  );
});
test("Brasilia midnight is 03:00 UTC and the server opens only at the exact deadline", () => {
  assert.equal(getLaunchStatus(enabled, deadline - 1).isOpen, false);
  assert.equal(getLaunchStatus(enabled, deadline).isOpen, true);
  assert.equal(getLaunchStatus(enabled, deadline + 1).isOpen, true);
  assert.equal(
    getLaunchStatus(enabled, deadline).opensAt,
    "2026-10-31T03:00:00.000Z",
  );
});
test("an invalid configured date fails closed; postponement replaces the old deadline", () => {
  const invalid = getLaunchStatus(
    { ...enabled, LAUNCH_OPENS_AT: "not-a-date" },
    deadline,
  );
  assert.equal(invalid.opensAt, null);
  assert.equal(invalid.isOpen, false);
  assert.equal(
    getLaunchStatus(
      { ...enabled, LAUNCH_OPENS_AT: "2026-10-31T00:00:00" },
      deadline,
    ).isOpen,
    false,
  );
  assert.equal(
    getLaunchStatus(
      { ...enabled, LAUNCH_OPENS_AT: "2026-11-02T00:00:00-03:00" },
      deadline,
    ).isOpen,
    false,
  );
});
test("total hours do not wrap after 24 hours; minute, hour, day transitions stay correct", () => {
  for (const [seconds, expected] of [
    [172801, ["48", "00", "01"]],
    [86400, ["24", "00", "00"]],
    [86399, ["23", "59", "59"]],
    [3600, ["01", "00", "00"]],
    [3599, ["00", "59", "59"]],
    [60, ["00", "01", "00"]],
    [59, ["00", "00", "59"]],
    [0, ["00", "00", "00"]],
    [-100, ["00", "00", "00"]],
  ] as const)
    assert.deepEqual(Object.values(countdownParts(seconds)), expected);
});
test("monotonic server anchor ignores a changed device clock and catches up after a suspended tab", () => {
  const status = getLaunchStatus(enabled, deadline - 60_000);
  const clock = anchorLaunchClock(status, 1000, 1200)!;
  assert.equal(remainingSeconds(clock, 1200), 60);
  // Only elapsed monotonic time enters the calculation, not Date.now().
  assert.equal(remainingSeconds(clock, 31_200), 30);
  assert.equal(remainingSeconds(clock, 121_200), 0);
  assert.equal(remainingSeconds(clock, 1000), 60);
  assert.equal(
    status.isOpen,
    false,
    "a client countdown reaching zero is not server authorization",
  );
});
test("server response validation rejects forged, malformed, premature and disabled release responses", () => {
  const before = getLaunchStatus(enabled, deadline - 1000);
  assert.deepEqual(readLaunchStatus(before), before);
  for (const value of [
    { ...before, isOpen: true },
    { ...before, serverNow: "bad" },
    { ...before, enabled: "true" },
    { ...getLaunchStatus(enabled, deadline), enabled: false },
    null,
  ])
    assert.throws(() => readLaunchStatus(value));
  assert.equal(
    readLaunchStatus(getLaunchStatus(enabled, deadline)).isOpen,
    true,
  );
});
test("launch endpoint has no cache and does not depend on commerce/database configuration", async () => {
  const response = launchResponse({}, deadline);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const status = readLaunchStatus(await response.json());
  assert.equal(status.enabled, true);
  assert.equal(status.isOpen, true);
});
