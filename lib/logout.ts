import { getAuth, signOut } from "firebase/auth";

export const logout = async () => {
  await signOut(getAuth());
};
