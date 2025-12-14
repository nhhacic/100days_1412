import { db } from './firebase';
import { 
  collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, arrayUnion, onSnapshot
} from 'firebase/firestore';

class NotificationService {
  constructor() {
    this.collectionName = 'notifications';
  }

  // Tạo thông báo mới
  async createNotification({ title, message, type = 'all', targetUserIds = [], priority = 'normal', createdBy }) {
    try {
      const notificationData = {
        title,
        message,
        type, // 'all' | 'individual' | 'group'
        targetUserIds, // Mảng user IDs nếu type = 'individual' hoặc 'group'
        priority, // 'low' | 'normal' | 'high' | 'urgent'
        createdAt: serverTimestamp(),
        createdBy,
        readBy: [], // Mảng user IDs đã đọc
        isActive: true
      };

      const docRef = await addDoc(collection(db, this.collectionName), notificationData);
      console.log('Notification created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Lấy thông báo cho user (cả thông báo chung và riêng)
  async getNotificationsForUser(userId, limitCount = 20) {
    try {
      // Query đơn giản - chỉ dùng 1 where clause để tránh cần composite index
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        
        // Skip các thông báo đã bị xóa
        if (!data.isActive) return;
        
        // Thông báo cho tất cả
        if (data.type === 'all') {
          notifications.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date()
          });
        }
        // Thông báo riêng cho user này
        else if ((data.type === 'individual' || data.type === 'group') && 
                 data.targetUserIds?.includes(userId)) {
          notifications.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date()
          });
        }
      });

      // Sắp xếp theo thời gian mới nhất
      notifications.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log(`Found ${notifications.length} notifications for user ${userId}`);
      return notifications.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(notificationId, userId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        readBy: arrayUnion(userId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(userId) {
    try {
      const notifications = await this.getNotificationsForUser(userId);
      const promises = notifications
        .filter(n => !n.readBy?.includes(userId))
        .map(n => this.markAsRead(n.id, userId));
      
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Đếm số thông báo chưa đọc
  async getUnreadCount(userId) {
    try {
      const notifications = await this.getNotificationsForUser(userId);
      return notifications.filter(n => !n.readBy?.includes(userId)).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Lấy tất cả thông báo (cho Admin)
  async getAllNotifications(limitCount = 50) {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const notifications = [];
      
      snapshot.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        });
      });
      
      return notifications;
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return [];
    }
  }

  // Xóa thông báo (soft delete)
  async deleteNotification(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        isActive: false
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Xóa vĩnh viễn
  async permanentDelete(notificationId) {
    try {
      await deleteDoc(doc(db, this.collectionName, notificationId));
      return { success: true };
    } catch (error) {
      console.error('Error permanently deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscribe để nhận thông báo realtime
  subscribeToNotifications(userId, callback) {
    // Query cho thông báo "all"
    const allQuery = query(
      collection(db, this.collectionName),
      where('type', '==', 'all'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(allQuery, (snapshot) => {
      const notifications = [];
      snapshot.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        });
      });
      callback(notifications);
    });

    return unsubscribe;
  }

  // Format thời gian
  formatTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }

  // Lấy màu theo priority
  getPriorityColor(priority) {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'blue';
    }
  }

  // Lấy icon theo priority
  getPriorityIcon(priority) {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'normal': return '📢';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  }
}

export default new NotificationService();
