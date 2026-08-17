"use client";

import { useCallback, useEffect, useState } from "react";

type AdminSessionStatus = "checking" | "signed-out" | "signed-in";

export function useAdminSession() {
  const [status, setStatus] = useState<AdminSessionStatus>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((body: { authenticated?: boolean }) => {
        setStatus(body.authenticated ? "signed-in" : "signed-out");
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== "AbortError") {
          setStatus("signed-out");
          setError("Could not check the admin session");
        }
      });
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Sign-in failed");
        setStatus("signed-out");
        return false;
      }
      setPassword("");
      setStatus("signed-in");
      return true;
    } catch {
      setError("Could not sign in");
      setStatus("signed-out");
      return false;
    }
  }, [password]);

  const signOut = useCallback(async () => {
    const response = await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
    setError(response?.ok ? null : "The server could not confirm sign-out");
    setStatus("signed-out");
    setPassword("");
  }, []);

  const markSignedOut = useCallback(() => {
    setStatus("signed-out");
    setPassword("");
  }, []);

  return {
    status,
    password,
    setPassword,
    error,
    signIn,
    signOut,
    markSignedOut,
  };
}
