import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const INLINE = {
  apiKey: "AIzaSyD53Cx6hU8tnjOOW9dA0X0tSAFPo_Kavw0",
  authDomain: "finance-tracker-app-1d491.firebaseapp.com",
  projectId: "finance-tracker-app-1d491",
  storageBucket: "finance-tracker-app-1d491.firebasestorage.app",
  messagingSenderId: "1052088057044",
  appId: "1:1052088057044:web:a6c9f641b72627340c8f41"
};

const FIREBASE_CONFIG =
  (typeof window !== "undefined" && window.__FIREBASE_CONFIG__) || INLINE;

if (!FIREBASE_CONFIG?.apiKey) {
  console.warn(
    "Missing Firebase config. Set window.__FIREBASE_CONFIG__ in index.html or edit src/firebase.js"
  );
}

const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app); 