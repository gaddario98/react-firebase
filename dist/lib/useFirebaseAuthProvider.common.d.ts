import { AuthState } from "@gaddario98/react-auth";
export declare const useFirebaseAuthProviderCommon: () => {
    loading: boolean;
    setLoading: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    authRef: import("react").MutableRefObject<AuthState | undefined>;
};
