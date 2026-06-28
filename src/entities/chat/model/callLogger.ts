const CALL_LOG_PREFIX = "[matterhorn-call]";

export function logMatterhornCall(event: string, details: Record<string, unknown> = {}): void {
  try {
    console.info(CALL_LOG_PREFIX, `mosh.${event}`, {
      at: new Date().toISOString(),
      ...details
    });
  } catch {
    // Logging must not affect calls.
  }
}
