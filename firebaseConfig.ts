import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace the following configuration with your Firebase project's config keys.
// You can find these in the Firebase Console -> Project Settings.
const firebaseConfig = {
 apiKey: "AIzaSyBGclBeDeodA3zWjFp4_mG99lKYr6HTOj4",
  authDomain: "paper-plane-drift.firebaseapp.com",
  projectId: "paper-plane-drift",
  storageBucket: "paper-plane-drift.firebasestorage.app",
  messagingSenderId: "1098293968754",
  appId: "1:1098293968754:web:8892b4bd4ad77231a2a7eb",
  measurementId: "G-7NW92V91T5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };