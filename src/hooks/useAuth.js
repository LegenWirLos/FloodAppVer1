// Thin React wrapper around Firebase Auth: tracks the signed-in user and exposes
// sign up / in / out helpers. Safe no-op when Firebase isn't configured yet.
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth, firebaseReady } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    ready: firebaseReady,
    signUp: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signInGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
    signOutUser: () => signOut(auth),
  };
}
