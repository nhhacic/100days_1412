import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertCircle } from 'lucide-react';
import notificationService from '../services/notificationService';

function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      
      // Refresh mỗi 30 giây
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!userId) {
      console.log('NotificationBell: No userId provided');
      return;
    }
    
    console.log('NotificationBell: Loading notifications for user:', userId);
    setLoading(true);
    try {
      const notifs = await notificationService.getNotificationsForUser(userId);
      console.log('NotificationBell: Received notifications:', notifs);
      setNotifications(notifs);
      
      const unread = notifs.filter(n => !n.readBy?.includes(userId)).length;
      setUnreadCount(unread);
      console.log('NotificationBell: Unread count:', unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await notificationService.markAsRead(notificationId, userId);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(userId);
    loadNotifications();
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Ngăn event click lan ra ngoài
    if (window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
      await notificationService.deleteNotification(notificationId);
      loadNotifications();
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-4 border-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-4 border-gray-300 bg-gray-50';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Thông báo
                {unreadCount > 0 && (
                  <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded flex items-center"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Đọc tất cả
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500 text-sm">Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const isRead = notification.readBy?.includes(userId);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !isRead ? getPriorityStyles(notification.priority) : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3 text-2xl">
                          {notificationService.getPriorityIcon(notification.priority)}
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => !isRead && handleMarkAsRead(notification.id)}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${!isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                              {notification.title}
                            </p>
                            {!isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${!isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-400">
                            <span>{notificationService.formatTime(notification.createdAt)}</span>
                            {notification.type === 'individual' && (
                              <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                Riêng tư
                              </span>
                            )}
                            {notification.priority === 'urgent' && (
                              <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Khẩn cấp
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Nút xóa - chỉ hiển thị khi đã đọc */}
                        {isRead && (
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="flex-shrink-0 ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Xóa thông báo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50 text-center">
              <button
                onClick={loadNotifications}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Làm mới
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
