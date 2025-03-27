import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhs4vv7Ry1IuxDyCOBdHWuTnLtv1y_6kw",
  authDomain: "waterapp-ac2a4.firebaseapp.com",
  projectId: "waterapp-ac2a4",
  storageBucket: "waterapp-ac2a4.firebasestorage.app", // ✅ Fixed storage bucket URL
  messagingSenderId: "93959611450",
  appId: "1:93959611450:web:97259204627d49d6f44103",
  measurementId: "G-DFMGY91MLY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(undefined, "gs://waterapp-ac2a4.firebasestorage.app");

export default app;
