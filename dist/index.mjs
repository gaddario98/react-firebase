import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@gaddario98/react-notifications';
import { signInWithEmailAndPassword, getAuth, signOut, GoogleAuthProvider, signInWithPopup, OAuthProvider, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, getIdTokenResult, onIdTokenChanged, getIdToken } from 'firebase/auth';
import { isSupported, getAnalytics, setUserId } from 'firebase/analytics';
import { getApps, deleteApp, getApp, initializeApp } from 'firebase/app';

const ERROR_KEYS = {
    EMAIL_ALREADY_IN_USE: "errors.emailAlreadyInUse",
    INVALID_EMAIL: "errors.invalidEmail",
    OPERATION_NOT_ALLOWED: "errors.operationNotAllowed",
    WEAK_PASSWORD: "errors.weakPassword",
    USER_DISABLED: "errors.userDisabled",
    USER_NOT_FOUND: "errors.userNotFound",
    WRONG_PASSWORD: "errors.wrongPassword",
    UNEXPECTED_ERROR: "errors.unexpectedError",
    SIGN_OUT_ERROR: "errors.signOutError",
    GOOGLE_SIGN_IN_FAILED: "errors.googleSignInFailed",
    APPLE_SIGN_IN_FAILED: "errors.appleSignInFailed",
    PLAY_SERVICES_NOT_AVAILABLE: "errors.playServicesNotAvailable",
};
const useFirebaseAuthCommon = () => {
    const { t } = useTranslation("auth");
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleAuthError = useCallback((error) => {
        if (error instanceof Error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorCode = error.code;
            if (errorCode) {
                switch (errorCode) {
                    case "auth/email-already-in-use":
                        return t("errors.emailAlreadyInUse");
                    case "auth/invalid-email":
                        return t("errors.invalidEmail");
                    case "auth/operation-not-allowed":
                        return t("errors.operationNotAllowed");
                    case "auth/weak-password":
                        return t("errors.weakPassword");
                    case "auth/user-disabled":
                        return t("errors.userDisabled");
                    case "auth/user-not-found":
                        return t("errors.userNotFound");
                    case "auth/wrong-password":
                        return t("errors.wrongPassword");
                    default:
                        return t("errors.unexpectedError");
                }
            }
            return t("errors.unexpectedError");
        }
        return t("errors.unexpectedError");
    }, [t]);
    useEffect(() => {
        if (error)
            showNotification({ message: error, type: "error" });
    }, [error, showNotification]);
    return {
        loading,
        setLoading,
        error,
        setError,
        handleAuthError,
    };
};

const useFirebaseAuth = () => {
    const { loading, setLoading, error, setError, handleAuthError } = useFirebaseAuthCommon();
    const { i18n } = useTranslation();
    const withErrorHandling = useCallback(async (operation) => {
        setError(null);
        setLoading(true);
        try {
            const result = await operation();
            return { success: true, user: result === null || result === void 0 ? void 0 : result.user };
        }
        catch (error) {
            const errorMessage = handleAuthError(error);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
        finally {
            setLoading(false);
        }
    }, [handleAuthError, setError, setLoading]);
    const loginWithEmail = useCallback(async ({ email, password }) => withErrorHandling(() => signInWithEmailAndPassword(getAuth(), email, password)), [withErrorHandling]);
    const registerWithEmail = async (email, password, name) => withErrorHandling(async () => {
        const credential = await createUserWithEmailAndPassword(getAuth(), email, password);
        await updateProfile(credential.user, { displayName: name });
        await sendEmailVerification(credential.user);
        return credential;
    });
    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await signOut(getAuth());
        }
        finally {
            setLoading(false);
        }
    }, [setLoading]);
    const loginWithGoogle = useCallback(async () => {
        return withErrorHandling(async () => {
            const authInstance = getAuth();
            const provider = new GoogleAuthProvider();
            authInstance.languageCode = i18n.language;
            return await signInWithPopup(authInstance, provider);
        });
    }, [withErrorHandling]);
    const loginWithApple = useCallback(async () => {
        return withErrorHandling(async () => {
            const authInstance = getAuth();
            const provider = new OAuthProvider("apple.com");
            provider.addScope("email");
            provider.addScope("name");
            provider.setCustomParameters({
                locale: i18n.language,
            });
            return await signInWithPopup(authInstance, provider);
        });
    }, [withErrorHandling]);
    return {
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        logout,
        loginWithGoogle,
        loginWithApple,
    };
};

const useFirebaseAuthProviderCommon = () => {
    const [loading, setLoading] = useState(true);
    const authRef = useRef(undefined);
    return {
        loading,
        setLoading,
        authRef
    };
};

let firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
};
let analyticsInstance;
const inizialize = () => {
    if (firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        isSupported().then((supported) => {
            if (supported)
                analyticsInstance = getAnalytics(app);
        });
        return app;
    }
};
const setFirebaseConfig = async (config) => {
    firebaseConfig = config;
    if (getApps().length) {
        await deleteApp(getApp());
    }
    return inizialize();
};

// Calculate next refresh delay from token result with safety bounds
const nextRefreshDelayMs = (expirationTimeISO) => {
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
const useFirebaseAuthProvider = ({ initializeNotifications, setFirebaseAuth, }) => {
    const { loading, setLoading, authRef } = useFirebaseAuthProviderCommon();
    const [, setAuthState] = useState(undefined);
    const refreshTimeoutRef = useRef(null);
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
                }
                catch (err) {
                    console.error("Fallback token refresh error:", err);
                }
            }, delay);
        }
        catch (err) {
            console.error("Error scheduling fallback token refresh:", err);
        }
    }, [clearRefreshTimeout]);
    // Update and propagate AuthState (memoized)
    const updateAuthState = useCallback(async (uidChanged, user) => {
        var _a, _b;
        const tokenResult = await getIdTokenResult(user, false);
        const newAuthState = {
            accountVerified: user.emailVerified || !!user.phoneNumber,
            id: user.uid,
            isLogged: true,
            token: tokenResult.token,
            phoneNumber: (_a = user.phoneNumber) !== null && _a !== void 0 ? _a : "",
            email: (_b = user.email) !== null && _b !== void 0 ? _b : "",
        };
        setFirebaseAuth === null || setFirebaseAuth === void 0 ? void 0 : setFirebaseAuth(newAuthState);
        setAuthState(newAuthState);
        authRef.current = newAuthState;
        try {
            await initializeNotifications(newAuthState.id);
        }
        catch (e) {
            console.error("initializeNotifications error:", e);
        }
        if (uidChanged) {
            if (analyticsInstance) {
                setUserId(analyticsInstance, newAuthState.id);
            }
        }
        await scheduleFallbackRefresh();
    }, [initializeNotifications, setFirebaseAuth, authRef, scheduleFallbackRefresh]);
    useEffect(() => {
        const auth = getAuth();
        let initialized = false;
        const unsubscribe = onIdTokenChanged(auth, async (user) => {
            try {
                if (user) {
                    const prev = authRef.current;
                    const uidChanged = (prev === null || prev === void 0 ? void 0 : prev.id) !== user.uid;
                    await updateAuthState(uidChanged, user);
                }
                else {
                    // Logged out
                    clearRefreshTimeout();
                    setAuthState(undefined);
                    authRef.current = undefined;
                    setFirebaseAuth === null || setFirebaseAuth === void 0 ? void 0 : setFirebaseAuth(undefined);
                }
            }
            catch (error) {
                console.error("onIdTokenChanged handler error:", error);
            }
            finally {
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

const getToken = async () => {
    const user = getAuth();
    if (user === null || user === void 0 ? void 0 : user.currentUser) {
        const token = await getIdToken(user.currentUser);
        return `Bearer ${token}`;
    }
    return '';
};

const logout = async () => {
    await signOut(getAuth());
};

export { ERROR_KEYS, analyticsInstance, firebaseConfig, getToken, logout, setFirebaseConfig, useFirebaseAuth, useFirebaseAuthCommon, useFirebaseAuthProvider, useFirebaseAuthProviderCommon };
//# sourceMappingURL=index.mjs.map
