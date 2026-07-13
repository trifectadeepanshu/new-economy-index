type HeaderReader = Pick<Headers, "get">;

export function isBearerAuthorized(headers: HeaderReader, secret: string | undefined) {
  if (!secret) return false;
  return headers.get("authorization") === `Bearer ${secret}`;
}
