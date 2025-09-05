import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

const PROVIDER_GOOGLE = new GoogleAuthProvider();
const firebaseConfig = {
  apiKey: "AIzaSyAkVQbqTSbIho9R9DPAz-IEb_CHEZfNhVI",
  authDomain: "bytedental-6701e.firebaseapp.com",
  projectId: "bytedental-6701e",
  storageBucket: "bytedental-6701e.firebasestorage.app",
  messagingSenderId: "1098321355660",
  appId: "1:1098321355660:web:b929537b391edb5fdaaca9",
  measurementId: "G-F9GNXQLJEH"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export function loginWithGoogle() {
    const auth = getAuth();
    signInWithPopup(auth, PROVIDER_GOOGLE)
        .then((result) => { console.log('Google sign-in successful:', result); })
        .catch((error) => { console.error('Error during Google sign-in:', error); });

}

console.log('Firebase initialized:', app);
