import photos from "./photos-v2.json" with { type: "json" };
/** Approved public opening: midnight in Brasilia, 31 October 2026. */
export const launchConfig = {
  opensAt: "2026-10-31T00:00:00-03:00",
  timeZone: "America/Sao_Paulo",
  sessionKey: "zxxr-launch-preview-intro-v3",
  float: {
    src: "/media/launch-v2/unicorn-clock-steel-v2-900.webp",
    srcSet:
      "/media/launch-v2/unicorn-clock-steel-v2-480.webp 480w, /media/launch-v2/unicorn-clock-steel-v2-900.webp 900w, /media/launch-v2/unicorn-clock-steel-v2-1254.webp 1254w",
    width: 1254,
    height: 1254,
    // Relative to the full image, so both digits and art resize together.
    screen: { left: 25.0, top: 50.0, width: 50.0, height: 16.0 },
  },
  photos,
} as const;
