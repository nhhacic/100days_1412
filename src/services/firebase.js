import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase Config cho Development (localhost)
const firebaseConfig = {
  apiKey: "AIzaSyB9ctND7j15oNimr_ZXkDSPQqDmnqkDNLk",
  authDomain: "challenge-100days-deepseek.firebaseapp.com",
  projectId: "challenge-100days-deepseek",
  storageBucket: "challenge-100days-deepseek.appspot.com",
  messagingSenderId: "131170472318",
  appId: "1:131170472318:web:9f21305a2428e5c22e909a"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
