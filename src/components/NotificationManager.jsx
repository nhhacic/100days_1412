import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, Users, User, Trash2, X, Check, 
  AlertCircle, AlertTriangle, Info, Megaphone,
  RefreshCw, Search, Filter, ChevronDown, Eye
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import notificationService from '../services/notificationService';

function NotificationManager({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'all',
    priority: 'normal',
    targetUserIds: []
  });
  const [searchUser, setSearchUser] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUsers();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await notificationService.getAllNotifications();
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('fullName'), limit(200));
      const snapshot = await getDocs(q);
      
      const userList = [];
      snapshot.forEach(doc => {
        userList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung thông báo');
      return;
    }

    if (formData.type !== 'all' && formData.targetUserIds.length === 0) {
      alert('Vui lòng chọn ít nhất một người nhận');
      return;
    }

    setSending(true);
    try {
      const result = await notificationService.createNotification({
        ...formData,
        createdBy: {
          id: currentUser?.uid,
          email: currentUser?.email,
          name: currentUser?.displayName || currentUser?.email
        }
      });

      if (result.success) {
        alert('✅ Gửi thông báo thành công!');
        setShowCreateModal(false);
        setFormData({
          title: '',
          message: '',
          type: 'all',
          priority: 'normal',
          targetUserIds: []
        });
        loadNotifications();
      } else {
        alert('❌ Lỗi: ' + result.error);
      }
    } catch (error) {
      alert('❌ Lỗi khi gửi thông báo: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    
    const result = await notificationService.deleteNotification(notificationId);
    if (result.success) {
      loadNotifications();
    } else {
      alert('Lỗi khi xóa: ' + result.error);
    }
  };

  const toggleUserSelection = (userId) => {
    setFormData(prev => ({
      ...prev,
      targetUserIds: prev.targetUserIds.includes(userId)
        ? prev.targetUserIds.filter(id => id !== userId)
        : [...prev.targetUserIds, userId]
    }));
  };

  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      normal: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    const labels = {
      urgent: '🚨 Khẩn cấp',
      high: '⚠️ Cao',
      normal: '📢 Bình thường',
      low: 'ℹ️ Thấp'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    if (type === 'all') {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
          <Users className="w-3 h-3 inline mr-1" />
          Tất cả
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 border border-purple-200">
        <User className="w-3 h-3 inline mr-1" />
        Cá nhân
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quản lý thông báo</h2>
            <p className="text-sm text-gray-500">{notifications.length} thông báo</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadNotifications}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            <Send className="w-4 h-4 mr-2" />
            Tạo thông báo mới
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-500">Đang tải...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có thông báo nào</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Tạo thông báo đầu tiên →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !notification.isActive ? 'opacity-50 bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    {getPriorityBadge(notification.priority)}
                    {getTypeBadge(notification.type)}
                    {!notification.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                        Đã xóa
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                  <div className="flex items-center text-xs text-gray-400 space-x-4">
                    <span>{notificationService.formatTime(notification.createdAt)}</span>
                    <span>Bởi: {notification.createdBy?.name || notification.createdBy?.email}</span>
                    <span className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      {notification.readBy?.length || 0} đã đọc
                    </span>
                    {notification.type !== 'all' && (
                      <span>Gửi đến: {notification.targetUserIds?.length || 0} người</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedNotification(notification)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Xem chi tiết"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {notification.isActive && (
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Megaphone className="w-6 h-6 mr-3" />
                  <h3 className="text-xl font-bold">Tạo thông báo mới</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Nhập nội dung thông báo..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại thông báo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, targetUserIds: [] })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">📢 Gửi tất cả</option>
                    <option value="individual">👤 Gửi cá nhân</option>
                    <option value="group">👥 Gửi nhóm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">ℹ️ Thấp</option>
                    <option value="normal">📢 Bình thường</option>
                    <option value="high">⚠️ Cao</option>
                    <option value="urgent">🚨 Khẩn cấp</option>
                  </select>
                </div>
              </div>

              {/* User Selection (for individual/group) */}
              {formData.type !== 'all' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn người nhận ({formData.targetUserIds.length} đã chọn)
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      placeholder="Tìm kiếm theo tên hoặc email..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          formData.targetUserIds.includes(user.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                          formData.targetUserIds.includes(user.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {formData.targetUserIds.includes(user.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.fullName || 'Chưa có tên'}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Xem trước:</div>
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">
                      {notificationService.getPriorityIcon(formData.priority)}
                    </span>
                    <div>
                      <div className="font-semibold">{formData.title || 'Tiêu đề thông báo'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formData.message || 'Nội dung thông báo sẽ hiển thị ở đây...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sending}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 flex items-center"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Gửi thông báo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Chi tiết thông báo</h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                {getPriorityBadge(selectedNotification.priority)}
                {getTypeBadge(selectedNotification.type)}
              </div>
              <h4 className="text-xl font-bold mb-2">{selectedNotification.title}</h4>
              <p className="text-gray-600 mb-4">{selectedNotification.message}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian:</span>
                  <span>{selectedNotification.createdAt?.toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Người tạo:</span>
                  <span>{selectedNotification.createdBy?.name || selectedNotification.createdBy?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số người đã đọc:</span>
                  <span>{selectedNotification.readBy?.length || 0}</span>
                </div>
                {selectedNotification.type !== 'all' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số người nhận:</span>
                    <span>{selectedNotification.targetUserIds?.length || 0}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationManager;
