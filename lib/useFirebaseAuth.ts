import { useCallback } from "react";
import {
  useFirebaseAuthCommon,
  UseFirebaseAuth,
  AuthResponse,
  LoginProps,
} from "./useFirebaseAuth.common";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from "firebase/auth";
import { useTranslation } from "react-i18next";

export const useFirebaseAuth = (): UseFirebaseAuth<User> => {
  const { loading, setLoading, error, setError, handleAuthError } =
    useFirebaseAuthCommon();
  const { i18n } = useTranslation();

  const withErrorHandling = useCallback(
    async <T extends AuthResponse<User>>(
      operation: () => Promise<UserCredential>
    ): Promise<T> => {
      setError(null);
      setLoading(true);
      try {
        const result = await operation();
        return { success: true, user: result?.user } as T;
      } catch (error) {
        const errorMessage = handleAuthError(error);
        setError(errorMessage);
        return { success: false, error: errorMessage } as T;
      } finally {
        setLoading(false);
      }
    },
    [handleAuthError, setError, setLoading]
  );

  const loginWithEmail = useCallback(
    async ({ email, password }: LoginProps) =>
      withErrorHandling(() =>
        signInWithEmailAndPassword(getAuth(), email, password)
      ),
    [withErrorHandling]
  );

  const registerWithEmail = async (
    email: string,
    password: string,
    name: string
  ) =>
    withErrorHandling(async () => {
      const credential = await createUserWithEmailAndPassword(
        getAuth(),
        email,
        password
      );
      await updateProfile(credential.user, { displayName: name });
      await sendEmailVerification(credential.user);
      return credential;
    });

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut(getAuth());
    } finally {
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
