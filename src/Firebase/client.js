import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

const PROVIDER_GOOGLE = new GoogleAuthProvider();
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export function loginWithGoogle() {
  const auth = getAuth();
  signInWithPopup(auth, PROVIDER_GOOGLE)
    .then((result) => {
      console.log("Google sign-in successful:", result);
    })
    .catch((error) => {
      console.error("Error during Google sign-in:", error);
    });
}

console.log("Firebase initialized:", app);
