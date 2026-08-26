/**
 * Test-only entry that resolves axios to its REAL browser distribution
 * (`dist/browser/axios.cjs`). Vitest's node-conditioned resolver otherwise
 * loads the node platform build, where `hasStandardBrowserEnv === false`
 * short-circuits cookie/XSRF handling — code paths we must genuinely exercise.
 * No behavior is mocked here; this is the exact bundle browsers execute.
 */
import axios from "axios/dist/browser/axios.cjs";

const { AxiosError, AxiosHeaders, CanceledError, HttpStatusCode } =
  axios as unknown as typeof import("axios");

export default axios;
export { AxiosError, AxiosHeaders, CanceledError, HttpStatusCode };
