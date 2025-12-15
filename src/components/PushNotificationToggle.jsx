/**
 * PushNotificationToggle Component
 * Cho phép user bật/tắt push notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader } from 'lucide-react';

function PushNotificationToggle({ userId }) {
  const [status, setStatus] = useState('loading'); // loading, unsupported, denied, default, granted, error
  const [enabling, setEnabling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pushService, setPushService] = useState(null);

  useEffect(() => {
    // Dynamic import để tránh lỗi SSR
    const loadService = async () => {
      try {
        const module = await import('../services/pushNotificationService');
        const service = module.pushNotificationService || module.default;
        setPushService(service);
        
        if (!service.isSupported()) {
          setStatus('unsupported');
          return;
        }
        setStatus(service.getPermissionStatus());
      } catch (error) {
        console.error('Error loading push service:', error);
        setStatus('error');
        setErrorMsg(error.message);
      }
    };
    
    loadService();
  }, []);

  const handleEnable = async () => {
    if (!userId || !pushService) return;
    
    setEnabling(true);
    try {
      const token = await pushService.requestPermissionAndGetToken(userId);
      if (token) {
        setStatus('granted');
        // Test notification
        setTimeout(() => {
          pushService.sendTestNotification();
        }, 1000);
      } else {
        setStatus(pushService.getPermissionStatus());
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setErrorMsg(error.message);
    }
    setEnabling(false);
  };

  if (status === 'loading') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center text-gray-500">
          <Loader className="w-4 h-4 mr-2 animate-spin" />
          Đang kiểm tra thông báo...
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-center text-red-700">
          <X className="w-4 h-4 mr-2" />
          <span className="text-sm">Lỗi khởi tạo thông báo</span>
        </div>
        <p className="text-xs text-red-600 mt-1">{errorMsg || 'Vui lòng thử lại sau'}</p>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center text-yellow-700">
          <BellOff className="w-4 h-4 mr-2" />
          <span className="text-sm">Trình duyệt không hỗ trợ push notifications</span>
        </div>
        <p className="text-xs text-yellow-600 mt-1">
          Để nhận thông báo, hãy dùng Chrome, Firefox, Edge hoặc Safari trên macOS
        </p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-center text-red-700">
          <X className="w-4 h-4 mr-2" />
          <span className="text-sm">Thông báo đã bị chặn</span>
        </div>
        <p className="text-xs text-red-600 mt-1">
          Vào cài đặt trình duyệt để cho phép thông báo từ trang này
        </p>
      </div>
    );
  }

  if (status === 'granted') {
    return null;
  }

  // status === 'default' - chưa cho phép
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-blue-700">
          <Bell className="w-4 h-4 mr-2" />
          <span className="text-sm">Bật thông báo đẩy</span>
        </div>
        <button
          onClick={handleEnable}
          disabled={enabling}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {enabling ? (
            <>
              <Loader className="w-3 h-3 mr-1 animate-spin" />
              Đang bật...
            </>
          ) : (
            'Bật ngay'
          )}
        </button>
      </div>
      <p className="text-xs text-blue-600 mt-2">
        Nhận thông báo khi có hoạt động mới được ghi nhận hoặc tin nhắn từ Admin
      </p>
    </div>
  );
}

export default PushNotificationToggle;
