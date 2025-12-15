// Firebase Messaging Service Worker
// Xử lý push notifications khi app ở background

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyB9ctND7j15oNimr_ZXkDSPQqDmnqkDNLk",
  authDomain: "challenge-100days-deepseek.firebaseapp.com",
  projectId: "challenge-100days-deepseek",
  storageBucket: "challenge-100days-deepseek.appspot.com",
  messagingSenderId: "131170472318",
  appId: "1:131170472318:web:9f21305a2428e5c22e909a"
});

const messaging = firebase.messaging();

// Xử lý background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Challenge 100 Ngày';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Mở app' },
      { action: 'close', title: 'Đóng' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý click vào notification
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Mở app hoặc focus vào tab đang mở
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tìm tab đang mở
      for (const client of clientList) {
        if (client.url.includes('100ngay.web.app') || client.url.includes('localhost')) {
          return client.focus();
        }
      }
      // Nếu không có tab nào mở, mở tab mới
      return clients.openWindow('/');
    })
  );
});

// Xử lý push event (fallback)
self.addEventListener('push', (event) => {
  console.log('📬 Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const title = data.notification?.title || 'Challenge 100 Ngày';
    const options = {
      body: data.notification?.body || 'Bạn có thông báo mới',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: data.data
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

console.log('✅ Firebase Messaging Service Worker loaded');
