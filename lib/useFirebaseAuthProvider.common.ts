import { useRef, useState } from "react";
import { AuthState } from "@gaddario98/react-auth";

export const useFirebaseAuthProviderCommon = () => {
  const [loading, setLoading] = useState(true);
  const authRef = useRef<AuthState | undefined>(undefined);

  return {
    loading,
    setLoading,
    authRef
  };
};
