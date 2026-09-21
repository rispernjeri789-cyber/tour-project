import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";
import { AuthCtx } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (creds) => {
      const u = await authApi.login(creds);
      // Drop any cached bookings/payments/notifications/etc. left over from
      // a previous account signed in on this same browser tab.
      queryClient.clear();
      setUser(u);
      return u;
    },
    [queryClient],
  );

  const signup = useCallback(
    async (creds) => {
      const u = await authApi.signup(creds);
      queryClient.clear();
      setUser(u);
      return u;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    // Purge cached data immediately so it can never be shown to whoever
    // logs in next on this tab.
    queryClient.clear();
  }, [queryClient]);

  const updateProfile = useCallback(async (payload) => {
    const u = await authApi.updateMe(payload);
    setUser(u);
    return u;
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}
