export function tryParseJSON(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str || undefined;
  }
}

export function normalizeHeaders(
  headers: Record<string, string | string[] | number | undefined | null>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (val != null) {
      result[key] = Array.isArray(val) ? val.join(', ') : String(val);
    }
  }
  return result;
}
