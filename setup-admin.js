import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB9ctND7j15oNimr_ZXkDSPQqDmnqkDNLk",
  authDomain: "challenge-100days-deepseek.firebaseapp.com",
  projectId: "challenge-100days-deepseek",
  storageBucket: "challenge-100days-deepseek.appspot.com",
  messagingSenderId: "131170472318",
  appId: "1:131170472318:web:9f21305a2428e5c22e909a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createAdminUser() {
  try {
    // Thay YOUR_ADMIN_UID bằng UID của user admin từ Firebase Authentication
    const adminUID = 'YOUR_ADMIN_UID'; // Lấy từ Firebase Console > Authentication
    
    await setDoc(doc(db, 'users', adminUID), {
      email: 'admin@challenge.com',
      fullName: 'Quản Trị Viên',
      role: 'admin',
      status: 'approved',
      isActive: true,
      gender: 'male',
      birthYear: 1990,
      challengeStart: new Date('2026-01-01'),
      createdAt: new Date(),
      depositPaid: true,
      previousSeasonTransfer: false,
      stravaConnected: false,
      monthlyTarget: { run: 100, swim: 20 }
    });
    
    console.log('✅ Admin user created successfully!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
