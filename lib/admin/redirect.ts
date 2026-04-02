const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;
const DEFAULT_ADMIN_REDIRECT_PATH = "/admin";

function firstStringValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

export function resolveAdminNextPath(
  value: string | string[] | undefined
): string {
  const candidate = firstStringValue(value)?.trim();

  if (!candidate) {
    return DEFAULT_ADMIN_REDIRECT_PATH;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_ADMIN_REDIRECT_PATH;
  }

  if (!ADMIN_PATH_PATTERN.test(candidate)) {
    return DEFAULT_ADMIN_REDIRECT_PATH;
  }

  return candidate;
}
