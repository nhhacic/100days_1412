import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import stravaService from '../services/stravaService';
import { auth } from '../services/firebase';

function StravaCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('StravaCallback: Handling callback...');
      console.log('Full URL:', window.location.href);
      
      // Kiểm tra code từ cả query string và hash
      // Strava trả về: /auth/callback?code=xxx&scope=xxx
      // Nhưng với HashRouter, URL có thể là: /#/auth/callback?code=xxx
      
      let code = null;
      let error = null;
      
      // Cách 1: Kiểm tra query string trực tiếp (sau hash)
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        code = hashParams.get('code');
        error = hashParams.get('error');
        console.log('Found in hash query:', { code, error });
      }
      
      // Cách 2: Kiểm tra query string của window.location
      if (!code) {
        const searchParams = new URLSearchParams(window.location.search);
        code = searchParams.get('code');
        error = searchParams.get('error');
        console.log('Found in search params:', { code, error });
      }
      
      // Cách 3: Parse toàn bộ URL để tìm code
      if (!code) {
        const fullUrl = window.location.href;
        const codeMatch = fullUrl.match(/[?&]code=([^&]+)/);
        if (codeMatch) {
          code = codeMatch[1];
          console.log('Found code via regex:', code);
        }
        const errorMatch = fullUrl.match(/[?&]error=([^&]+)/);
        if (errorMatch) {
          error = errorMatch[1];
        }
      }

      console.log('Final - Code:', code, 'Error:', error);

      if (error) {
        console.error('Strava auth error:', error);
        alert(`Lỗi kết nối Strava: ${error}`);
        navigate('/');
        return;
      }

      if (code) {
        try {
          console.log('Processing Strava callback with code:', code);
          const tokenData = await stravaService.handleCallback(code);
          // Lưu token lên Firebase nếu có user đăng nhập
          const user = auth.currentUser;
          console.log('Current user:', user);
          console.log('Token data:', tokenData);
          if (user && tokenData) {
            if (typeof stravaService.saveTokensToFirebase === 'function') {
              await stravaService.saveTokensToFirebase(user.uid, tokenData);
            } else {
              // Nếu chưa có hàm này, cần bổ sung vào stravaService.js
              console.warn('Chưa có hàm saveTokensToFirebase trong stravaService');
            }
          }
          // Redirect sẽ xảy ra trong stravaService
        } catch (err) {
          console.error('Error processing Strava callback:', err);
          alert('❌ Lỗi kết nối Strava. Vui lòng thử lại.');
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Đang kết nối với Strava
        </h1>
        <p className="text-gray-600 mb-4">
          Vui lòng đợi trong giây lát...
        </p>
        <div className="text-sm text-gray-500">
          <p>Đang xác thực và lấy dữ liệu từ Strava</p>
        </div>
      </div>
    </div>
  );
}

export default StravaCallback;
