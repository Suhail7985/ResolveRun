type LogFields = Record<string, unknown>;

function sanitize(fields: LogFields): LogFields {
  const redacted = { ...fields };
  for (const key of Object.keys(redacted)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("authorization") ||
      lower.includes("cookie") ||
      lower.includes("secret")
    ) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}

export const log = {
  info(message: string, fields?: LogFields) {
    console.log(JSON.stringify({ level: "info", message, ...sanitize(fields ?? {}) }));
  },
  warn(message: string, fields?: LogFields) {
    console.warn(JSON.stringify({ level: "warn", message, ...sanitize(fields ?? {}) }));
  },
  error(message: string, fields?: LogFields) {
    console.error(JSON.stringify({ level: "error", message, ...sanitize(fields ?? {}) }));
  },
};
