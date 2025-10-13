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
    registerWithEmail: (email: string, password: string, name: string) => Promise<AuthResponse<T>>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<AuthResponse<T>>;
    loginWithApple: () => Promise<AuthResponse<T>>;
};
export declare const ERROR_KEYS: {
    readonly EMAIL_ALREADY_IN_USE: "errors.emailAlreadyInUse";
    readonly INVALID_EMAIL: "errors.invalidEmail";
    readonly OPERATION_NOT_ALLOWED: "errors.operationNotAllowed";
    readonly WEAK_PASSWORD: "errors.weakPassword";
    readonly USER_DISABLED: "errors.userDisabled";
    readonly USER_NOT_FOUND: "errors.userNotFound";
    readonly WRONG_PASSWORD: "errors.wrongPassword";
    readonly UNEXPECTED_ERROR: "errors.unexpectedError";
    readonly SIGN_OUT_ERROR: "errors.signOutError";
    readonly GOOGLE_SIGN_IN_FAILED: "errors.googleSignInFailed";
    readonly APPLE_SIGN_IN_FAILED: "errors.appleSignInFailed";
    readonly PLAY_SERVICES_NOT_AVAILABLE: "errors.playServicesNotAvailable";
};
export declare const useFirebaseAuthCommon: () => {
    loading: boolean;
    setLoading: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    error: string | null;
    setError: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    handleAuthError: (error: unknown) => string;
};
