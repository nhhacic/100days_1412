/**
 * Push Notification Service
 * Quản lý FCM tokens và gửi push notifications
 */

import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// VAPID Key - Public key cho Web Push (từ Firebase Console)
const VAPID_KEY = 'BEMMrdZQJJ9nT2SjUogOzwBzMzlmrYPi5XhsgRvJC_8n5I0zIGlYBB1JGk_ny4sVErZY5WFaNPqsRwSgVJar7Ew';

export const pushNotificationService = {
  /**
   * Kiểm tra browser có hỗ trợ push notifications không
   */
  isSupported: () => {
    try {
      return typeof window !== 'undefined' &&
             'Notification' in window && 
             'serviceWorker' in navigator && 
             'PushManager' in window;
    } catch (e) {
      console.error('Error checking support:', e);
      return false;
    }
  },

  /**
   * Lấy trạng thái permission hiện tại
   */
  getPermissionStatus: () => {
    try {
      if (!pushNotificationService.isSupported()) return 'unsupported';
      return Notification.permission; // 'granted', 'denied', 'default'
    } catch (e) {
      return 'unsupported';
    }
  },

  /**
   * Xin quyền notification và lấy FCM token
   * @param {string} userId - User ID để lưu token
   * @returns {Promise<string|null>} FCM token hoặc null
   */
  requestPermissionAndGetToken: async (userId) => {
    if (!pushNotificationService.isSupported()) {
      console.log('Push notifications not supported');
      return null;
    }

    try {
      // Xin quyền notification
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Đăng ký service worker
      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      
      // Đợi service worker ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');

      // Lấy FCM token qua dynamic import
      const { getMessaging, getToken } = await import('firebase/messaging');
      const app = (await import('./firebase')).default;
      
      const messaging = getMessaging(app);
      console.log('Messaging initialized');

      // Lấy FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Lưu token vào Firestore
        await pushNotificationService.saveTokenToFirestore(userId, token);
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  },

  /**
   * Lưu FCM token vào Firestore
   */
  saveTokenToFirestore: async (userId, token) => {
    if (!userId || !token) return;

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Thêm token vào mảng fcmTokens (tránh trùng lặp)
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          lastFcmTokenUpdate: new Date().toISOString(),
          pushNotificationsEnabled: true
        });
      } else {
        // Tạo document mới với token
        await setDoc(userRef, {
          fcmTokens: [token],
          lastFcmTokenUpdate: new Date().toISOString(),
          pushNotificationsEnabled: true
        }, { merge: true });
      }
      
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  },

  /**
   * Xóa FCM token (khi user tắt notifications)
   */
  removeToken: async (userId, token) => {
    if (!userId || !token) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(token),
        pushNotificationsEnabled: false
      });
      console.log('FCM token removed');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  },

  /**
   * Gửi test notification (local)
   */
  sendTestNotification: () => {
    if (Notification.permission === 'granted') {
      new Notification('🎉 Thông báo đã bật!', {
        body: 'Bạn sẽ nhận được thông báo từ Challenge 100 Ngày',
        icon: '/logo192.png'
      });
    }
  }
};

export default pushNotificationService;