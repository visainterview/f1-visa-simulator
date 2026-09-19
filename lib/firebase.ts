import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAwJYvraQZfYJmZhF64ckT14ZwGKCuSdmw",
  authDomain: "f1-visa-simulator.firebaseapp.com",
  projectId: "f1-visa-simulator",
  storageBucket: "f1-visa-simulator.firebasestorage.app",
  messagingSenderId: "689844087860",
  appId: "1:689844087860:web:ff58068ee248b39107ae61",
  measurementId: "G-Q663WJH4T9"
};

// Initialize Firebase safely without duplicate instances
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);