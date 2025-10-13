import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotification } from "@gaddario98/react-notifications";

export interface AuthResponse<T> {
  success: boolean;
  error?: string;
  user?: T;
}

export interface LoginProps {
  email: string;
  password: string;
}

export type UseFirebaseAuth<T> = {
  loading: boolean;
  error: string | null;
  loginWithEmail: (props: LoginProps) => Promise<AuthResponse<T>>;
  registerWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<AuthResponse<T>>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<AuthResponse<T>>;
  loginWithApple: () => Promise<AuthResponse<T>>;
};

export const ERROR_KEYS = {
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
} as const;

export const useFirebaseAuthCommon = () => {
  const { t } = useTranslation("auth");
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (error: unknown): string => {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorCode = (error as any).code;
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
    },
    [t]
  );

  useEffect(() => {
    if (error) showNotification({ message: error, type: "error" });
  }, [error, showNotification]);

  return {
    loading,
    setLoading,
    error,
    setError,
    handleAuthError,
  };
};
