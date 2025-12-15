/**
 * InstallPrompt Component
 * Hiển thị nút cài đặt app PWA
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Kiểm tra đã cài đặt chưa
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Kiểm tra iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Kiểm tra đã dismiss chưa
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Đã dismiss trong 7 ngày gần đây
    }

    // Lắng nghe sự kiện beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hiển thị hướng dẫn cho iOS sau 3 giây
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Không hiện nếu đã cài hoặc không có prompt
  if (isStandalone || !showPrompt) {
    return null;
  }

  // Hướng dẫn cho iOS
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Smartphone className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Cài đặt ứng dụng</h3>
            <p className="text-sm text-gray-600 mt-1">
              Nhấn <span className="inline-flex items-center px-1 bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v6.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 9.586V3a1 1 0 011-1z"/>
                  <path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                </svg>
              </span> rồi chọn <strong>"Thêm vào Màn hình chính"</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Install button cho Android/Desktop
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/70 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Cài đặt ứng dụng</h3>
            <p className="text-sm text-white/80">Truy cập nhanh hơn từ màn hình chính</p>
          </div>
        </div>
        
        <button
          onClick={handleInstall}
          className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Cài đặt
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
