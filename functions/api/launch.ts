import { launchResponse, type LaunchEnv } from "../../server/launch.ts";

/** Informational only. This endpoint does not intercept or close any store route. */
export function onRequestGet(context: { env: LaunchEnv }) {
  return launchResponse(context.env);
}
