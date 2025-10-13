import { useCallback, useEffect, useRef, useState } from "react";
import { useFirebaseAuthProviderCommon } from "./useFirebaseAuthProvider.common";
import { getAuth, getIdTokenResult, onIdTokenChanged } from "firebase/auth";
import { setUserId } from "firebase/analytics";
import { analyticsInstance } from "./config";
import { AuthState } from "@gaddario98/react-auth";

// Calculate next refresh delay from token result with safety bounds
const nextRefreshDelayMs = (expirationTimeISO: string): number => {
  const now = Date.now();
  const expirationTime = Date.parse(expirationTimeISO);
  const timeUntilExp = Math.max(0, expirationTime - now);
  // refresh 30s before expiry; clamp between 30s and 55m
  const SAFETY = 30 * 1000;
  const MIN = 30 * 1000;
  const MAX = 55 * 60 * 1000;
  const desired = Math.max(MIN, timeUntilExp - SAFETY);
  return Math.min(MAX, desired);
};

export interface FirebaseProviderProps {
  initializeNotifications: (id: string) => Promise<void>;
  setFirebaseAuth: (auth?: AuthState) => void;
}
export const useFirebaseAuthProvider = ({
  initializeNotifications,
  setFirebaseAuth,
}: FirebaseProviderProps) => {
  const { loading, setLoading, authRef } = useFirebaseAuthProviderCommon();
  const [, setAuthState] = useState<AuthState | undefined>(undefined);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to clear any scheduled fallback refresh (memoized)
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Schedule a safe fallback refresh slightly before token expiration. (memoized)
  const scheduleFallbackRefresh = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        clearRefreshTimeout();
        return;
      }
      const tokenResult = await getIdTokenResult(user, false);
      const delay = nextRefreshDelayMs(tokenResult.expirationTime);
      clearRefreshTimeout();
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          // Force a refresh; onIdTokenChanged will fire and reschedule.
          await user.getIdToken(true);
        } catch (err) {
          console.error("Fallback token refresh error:", err);
        }
      }, delay);
    } catch (err) {
      console.error("Error scheduling fallback token refresh:", err);
    }
  }, [clearRefreshTimeout]);

  // Update and propagate AuthState (memoized)
  const updateAuthState = useCallback(
    async (
      uidChanged: boolean,
      user: NonNullable<ReturnType<typeof getAuth>["currentUser"]>
    ) => {
      const tokenResult = await getIdTokenResult(user, false);
      const newAuthState: AuthState = {
        accountVerified: user.emailVerified || !!user.phoneNumber,
        id: user.uid,
        isLogged: true,
        token: tokenResult.token,
        phoneNumber: user.phoneNumber ?? "",
        email: user.email ?? "",
      };

      setFirebaseAuth?.(newAuthState);
      setAuthState(newAuthState);
      authRef.current = newAuthState;

      try {
        await initializeNotifications(newAuthState.id);
      } catch (e) {
        console.error("initializeNotifications error:", e);
      }
      if (uidChanged) {
        if (analyticsInstance) {
          setUserId(analyticsInstance, newAuthState.id);
        }
      }

      await scheduleFallbackRefresh();
    },
    [initializeNotifications, setFirebaseAuth, authRef, scheduleFallbackRefresh]
  );

  useEffect(() => {
    const auth = getAuth();
    let initialized = false;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      try {
        if (user) {
          const prev = authRef.current;
          const uidChanged = prev?.id !== user.uid;
          await updateAuthState(uidChanged, user);
        } else {
          // Logged out
          clearRefreshTimeout();
          setAuthState(undefined);
          authRef.current = undefined;
          setFirebaseAuth?.(undefined);
        }
      } catch (error) {
        console.error("onIdTokenChanged handler error:", error);
      } finally {
        if (!initialized) {
          initialized = true;
          // Small delay to keep UX parity with previous behavior
          setTimeout(() => setLoading(false), 300);
        }
      }
    });

    return () => {
      unsubscribe();
      clearRefreshTimeout();
    };
  }, [
    setLoading,
    updateAuthState,
    scheduleFallbackRefresh,
    clearRefreshTimeout,
  ]);

  return { loading };
};
