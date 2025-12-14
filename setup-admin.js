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

async function createSuperAdminUser() {
  try {
    // Thay YOUR_SUPER_ADMIN_UID bằng UID của user super admin từ Firebase Authentication
    const superAdminUID = 'krXpTyFXaxNKeHsGH9LTWVTcdPl2'; // Lấy từ Firebase Console > Authentication
    
    await setDoc(doc(db, 'users', superAdminUID), {
      email: 'hoanghamail@gmail.com',
      fullName: 'Shark Hà',
      role: 'super_admin', // SUPER_ADMIN role
      status: 'approved',
      isActive: true,
      gender: 'male',
      birthYear: 1977,
      challengeStart: new Date('2025-11-01'),
      createdAt: new Date(),
      depositPaid: true,
      previousSeasonTransfer: false,
      stravaConnected: false,
      monthlyTarget: { run: 100, swim: 20 }
    });
    
    console.log('✅ Super Admin user created successfully!');
    console.log('📧 Email: hoanghamail@gmail.com');
    console.log('🔑 Role: super_admin (toàn quyền)');
  } catch (error) {
    console.error('❌ Error creating super admin user:', error);
  }
}

async function createRegularAdminUser() {
  try {
    // Thay YOUR_ADMIN_UID bằng UID của user admin từ Firebase Authentication
    const adminUID = '8siDohm3CpexBmJ26e1Oppo8xyv1'; // Lấy từ Firebase Console > Authentication
    
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
    
    console.log('✅ Regular Admin user created successfully!');
    console.log('📧 Email: admin@challenge.com');
    console.log('🔑 Role: admin');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Chạy cả hai hàm
async function setupAdmins() {
  console.log('🚀 Setting up admin accounts...');
  await createSuperAdminUser();
  await createRegularAdminUser();
  console.log('✨ Setup completed!');
}

setupAdmins();
