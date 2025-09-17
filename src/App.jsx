import React, { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import TourPage from "./pages/TourPage";

export default function App() {
  const [route, setRoute] = useState("home"); // home | login | signup | dashboard | tour
  const [user, setUser] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: u.email, name: u.displayName } : null);
      setRoute(u ? "dashboard" : "home");
    });
    return () => unsub && unsub();
  }, []);

  // Actions
  const onGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      alert(e?.message || "Google sign-in failed");
    }
  };
  const onEmailSignIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert(e?.message || "Email sign-in failed");
    }
  };
  const onEmailSignUp = async (email, password, fullName) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName) {
        try {
          await updateProfile(res.user, { displayName: fullName });
        } catch {}
      }
    } catch (e) {
      alert(e?.message || "Email sign-up failed");
    }
  };
  const signOutAll = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    setUser(null);
    setRoute("home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <Header
        user={user}
        goHome={() => setRoute("home")}
        goLogin={() => setRoute("login")}
        goSignup={() => setRoute("signup")}
        onSignOut={signOutAll}
      />

      {route === "home" && (
        <HomePage
          goLogin={() => setRoute("login")}
          goSignup={() => setRoute("signup")}
          goTour={() => setRoute("tour")}
        />
      )}

      {route === "login" && (
        <LoginPage onGoogle={onGoogle} onEmail={onEmailSignIn} />
      )}

      {route === "signup" && (
        <SignupPage onGoogle={onGoogle} onEmail={onEmailSignUp} />
      )}

      {route === "dashboard" && (
        <Dashboard user={user} goHome={() => setRoute("home")} />
      )}

      {route === "tour" && (
        <TourPage
          goHome={() => setRoute("home")}
          goSignup={() => setRoute("signup")}
          goLogin={() => setRoute("login")}
        />
      )}
    </div>
  );
}
