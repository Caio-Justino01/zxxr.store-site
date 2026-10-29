import { launchConfig } from "../launch-preview/config.ts";
import type { LaunchStatus } from "../launch-preview/launch-state.ts";

export type LaunchEnv = {
  LAUNCH_GATE_ENABLED?: string;
  LAUNCH_OPENS_AT?: string;
};

export function getLaunchStatus(
  env: LaunchEnv = {},
  now = Date.now(),
): LaunchStatus {
  const candidate = env.LAUNCH_OPENS_AT ?? launchConfig.opensAt;
  // An explicit offset is mandatory; a server's local timezone must never shift midnight.
  const deadline = /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(candidate)
    ? Date.parse(candidate)
    : NaN;
  const opensAt = Number.isFinite(deadline)
    ? new Date(deadline).toISOString()
    : null;
  const enabled = env.LAUNCH_GATE_ENABLED !== "false";
  return {
    enabled,
    opensAt,
    serverNow: new Date(now).toISOString(),
    isOpen: enabled && opensAt !== null && now >= deadline,
  };
}

export function launchResponse(env: LaunchEnv = {}, now = Date.now()) {
  return new Response(JSON.stringify(getLaunchStatus(env, now)), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
