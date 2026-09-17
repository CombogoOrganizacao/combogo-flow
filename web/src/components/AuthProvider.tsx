"use client";

import { useEffect } from "react";
import { subscribeToAuthChanges } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(setUser);
    return unsubscribe;
  }, [setUser]);

  return <>{children}</>;
}
