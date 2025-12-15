import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
export const storage = getStorage(app);

// Presence Service - theo dõi online/offline
export const presenceService = {
  // Cập nhật trạng thái online
  updatePresence: async (userId) => {
    if (!userId) return;
    
    try {
      const userStatusRef = doc(db, 'presence', userId);
      await setDoc(userStatusRef, {
        online: true,
        lastSeen: serverTimestamp(),
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  },

  // Đánh dấu offline khi rời đi
  setOffline: async (userId) => {
    if (!userId) return;
    
    try {
      const userStatusRef = doc(db, 'presence', userId);
      await setDoc(userStatusRef, {
        online: false,
        lastSeen: serverTimestamp(),
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error setting offline:', error);
    }
  },

  // Bắt đầu theo dõi presence (gọi khi user login)
  startTracking: (userId) => {
    if (!userId) return;

    // Cập nhật ngay khi bắt đầu
    presenceService.updatePresence(userId);

    // Cập nhật mỗi 30 giây
    const intervalId = setInterval(() => {
      presenceService.updatePresence(userId);
    }, 30000);

    // Lắng nghe sự kiện đóng tab/trình duyệt
    const handleBeforeUnload = () => {
      presenceService.setOffline(userId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        presenceService.setOffline(userId);
      } else {
        presenceService.updatePresence(userId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Trả về hàm cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      presenceService.setOffline(userId);
    };
  },

  // Kiểm tra user có online không (dựa trên lastSeen < 1 phút)
  isOnline: (presenceData) => {
    if (!presenceData || !presenceData.online) return false;
    
    const lastActive = presenceData.lastActive ? new Date(presenceData.lastActive) : null;
    if (!lastActive) return presenceData.online;
    
    const now = new Date();
    const diffMs = now - lastActive;
    const diffMinutes = diffMs / (1000 * 60);
    
    // Coi như online nếu hoạt động trong 2 phút gần đây
    return diffMinutes < 2;
  },

  // Format thời gian lastSeen
  formatLastSeen: (presenceData) => {
    if (!presenceData?.lastActive) return 'Chưa xác định';
    
    const lastActive = new Date(presenceData.lastActive);
    const now = new Date();
    const diffMs = now - lastActive;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return lastActive.toLocaleDateString('vi-VN');
  }
};

export default app;
