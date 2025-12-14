import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import stravaService from '../services/stravaService';

function StravaCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('StravaCallback: Handling callback...');
      
      // Lấy code từ URL hash
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const code = params.get('code');
      const error = params.get('error');

      console.log('Code:', code, 'Error:', error);

      if (error) {
        console.error('Strava auth error:', error);
        alert(`Lỗi kết nối Strava: ${error}`);
        navigate('/');
        return;
      }

      if (code) {
        try {
          console.log('Processing Strava callback with code:', code);
          await stravaService.handleCallback(code);
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
