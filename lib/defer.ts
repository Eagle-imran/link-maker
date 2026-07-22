/** Run fn after the response in production (Next's `after`), inline otherwise
 * (vitest has no request scope — `after` throws, and awaiting keeps tests
 * deterministic). Errors are swallowed: deferred work must never break a response. */
export async function deferOrRun(fn: () => Promise<void>): Promise<void> {
  const safe = () => fn().catch(() => {});
  try {
    const { after } = await import("next/server");
    after(safe);
  } catch {
    await safe();
  }
}
