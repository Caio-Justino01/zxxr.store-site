export type LaunchStatus = {
  enabled: boolean;
  opensAt: string | null;
  serverNow: string;
  isOpen: boolean;
};

export type LaunchClock = {
  deadline: number;
  anchor: number;
  serverTime: number;
};

/** Validate the response before it is allowed to authorize navigation. */
export function readLaunchStatus(value: unknown): LaunchStatus {
  if (!value || typeof value !== "object")
    throw new Error("Invalid launch response");
  const v = value as Record<string, unknown>;
  if (
    typeof v.enabled !== "boolean" ||
    typeof v.isOpen !== "boolean" ||
    typeof v.serverNow !== "string" ||
    !Number.isFinite(Date.parse(v.serverNow)) ||
    (v.opensAt !== null &&
      (typeof v.opensAt !== "string" ||
        !Number.isFinite(Date.parse(v.opensAt))))
  )
    throw new Error("Invalid launch response");
  if (
    v.isOpen &&
    (!v.enabled ||
      !v.opensAt ||
      Date.parse(v.serverNow) < Date.parse(v.opensAt as string))
  )
    throw new Error("Inconsistent launch authorization");
  return v as LaunchStatus;
}

export function anchorLaunchClock(
  status: LaunchStatus,
  sent: number,
  received: number,
): LaunchClock | null {
  if (!status.opensAt) return null;
  return {
    deadline: Date.parse(status.opensAt),
    anchor: received,
    serverTime: Date.parse(status.serverNow) + Math.max(0, received - sent) / 2,
  };
}

/** performance.now() is monotonic; changes to the computer clock cannot release the store. */
export function remainingSeconds(
  clock: LaunchClock,
  monotonicNow: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      (clock.deadline -
        clock.serverTime -
        Math.max(0, monotonicNow - clock.anchor)) /
        1000,
    ),
  );
}

export function countdownParts(seconds: number) {
  const total = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
  return {
    hours: String(Math.floor(total / 3600)).padStart(2, "0"),
    minutes: String(Math.floor(total / 60) % 60).padStart(2, "0"),
    seconds: String(total % 60).padStart(2, "0"),
  };
}
