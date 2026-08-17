import { secureStringEqual } from "@/lib/admin-auth";

type HeaderReader = Pick<Headers, "get">;

export function isBearerAuthorized(headers: HeaderReader, secret: string | undefined) {
  if (!secret) return false;
  const authorization = headers.get("authorization");
  return !!authorization && secureStringEqual(authorization, `Bearer ${secret}`);
}
