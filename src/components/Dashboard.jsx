import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import stravaService from '../services/stravaService';
import challengeConfig from '../services/challengeConfig';
import { 
  Trophy, Activity, Timer, TrendingUp, Calendar, DollarSign,
  Target, BarChart3, LogOut, RefreshCw, User,
  AlertCircle, Heart, Zap, Waves, Settings,
  Shield, Clock, CheckCircle, XCircle, Users,
  FileText, Award, Flame, Home
} from 'lucide-react';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          
          const isUserAdmin = data.role === 'admin' || data.email === 'admin@example.com' || data.email === 'admin@challenge.com';
          setIsAdmin(isUserAdmin);
          
          if (data.status === 'approved' && data.isActive) {
            loadActivities();
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
    setStravaConnected(stravaService.isAuthenticated());
    setConfig(challengeConfig.getConfig());
  }, [user]);

  const loadActivities = async () => {
    if (stravaService.isAuthenticated()) {
      try {
        const stravaActivities = await stravaService.getActivities();
        setActivities(stravaActivities || []);
      } catch (error) {
        console.error('Error loading Strava activities:', error);
      }
    }
  };

  const connectStrava = () => {
    stravaService.redirectToStravaAuth();
  };

  const syncActivities = async () => {
    if (!stravaService.isAuthenticated()) {
      alert('Vui lòng kết nối Strava trước!');
      return;
    }
    
    setLoading(true);
    try {
      await loadActivities();
      alert('✅ Đã đồng bộ dữ liệu từ Strava!');
    } catch (error) {
      alert('❌ Lỗi khi đồng bộ dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIMetrics = () => {
    if (!userData || activities.length === 0) {
      return {
        runDistance: 0,
        swimDistance: 0,
        totalDistance: 0,
        activityCount: 0,
        kpiProgress: { run: 0, swim: 0 },
        penalty: 0,
        runDeficit: 0,
        swimDeficit: 0
      };
    }

    const target = config.monthlyTargets[userData.gender || 'male'];
    const currentMonth = new Date().getMonth();
    
    const monthActivities = activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate.getMonth() === currentMonth;
    });

    let runDistance = 0;
    let swimDistance = 0;

    monthActivities.forEach(activity => {
      const distanceKm = activity.distance / 1000;
      const type = activity.type?.toLowerCase() || activity.sport_type?.toLowerCase() || '';
      
      if (type.includes('run')) {
        runDistance += distanceKm;
      } else if (type.includes('swim')) {
        swimDistance += distanceKm;
      }
    });

    const runDeficit = Math.max(0, target.run - runDistance);
    const swimDeficit = Math.max(0, target.swim - swimDistance);
    const penalty = challengeConfig.calculatePenalty(runDeficit, swimDeficit).total;

    return {
      runDistance: parseFloat(runDistance.toFixed(1)),
      swimDistance: parseFloat(swimDistance.toFixed(1)),
      totalDistance: parseFloat((runDistance + swimDistance).toFixed(1)),
      activityCount: monthActivities.length,
      kpiProgress: {
        run: Math.min(100, (runDistance / target.run) * 100),
        swim: Math.min(100, (swimDistance / target.swim) * 100)
      },
      penalty,
      runDeficit: parseFloat(runDeficit.toFixed(1)),
      swimDeficit: parseFloat(swimDeficit.toFixed(1))
    };
  };

  const formatCurrency = (amount) => challengeConfig.formatCurrency(amount);
  const formatDate = (date) => challengeConfig.formatDate(date);

  const metrics = calculateKPIMetrics();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (userData?.status === 'pending_approval') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ⏳ Đang chờ phê duyệt
          </h1>
          <p className="text-gray-600 mb-6">
            Đăng ký của bạn đang được admin xem xét. 
            Vui lòng kiểm tra email để biết kết quả trong vòng 24h.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => auth.signOut()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userData?.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ❌ Đăng ký bị từ chối
          </h1>
          <p className="text-gray-600 mb-6">
            Đăng ký của bạn đã bị admin từ chối.
          </p>
          {userData?.rejectionReason && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
              <p className="text-red-700">
                <strong>Lý do:</strong> {userData.rejectionReason}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => auth.signOut()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 mr-3" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Challenge Dashboard
                </h1>
                <p className="opacity-90 mt-1 text-sm">
                  {config.seasonName} • {formatDate(config.startDate)} - {formatDate(config.seasonEndDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {isAdmin && (
                <a 
                  href="#/admin-dashboard" 
                  className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin Dashboard
                </a>
              )}
              <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">{userData?.fullName || user?.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="flex items-center bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition shadow"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Strava Connection */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">🔗 Kết nối Strava</h3>
              <p className="text-gray-600">
                {stravaConnected 
                  ? '✅ Đã kết nối với Strava' 
                  : '❌ Chưa kết nối với Strava'}
              </p>
            </div>
            <div className="space-x-3">
              {!stravaConnected && (
                <button
                  onClick={connectStrava}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition shadow"
                >
                  Kết nối Strava
                </button>
              )}
              <button
                onClick={syncActivities}
                disabled={!stravaConnected}
                className={`px-6 py-2 rounded-lg font-medium transition shadow ${
                  stravaConnected
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="inline w-4 h-4 mr-2" />
                Đồng bộ dữ liệu
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.runDistance.toFixed(1)} km</div>
                <div className="text-sm opacity-90">Chạy bộ tháng này</div>
              </div>
            </div>
            <div className="text-sm">
              Mục tiêu: {config.monthlyTargets[userData?.gender || 'male'].run}km
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Waves className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.swimDistance.toFixed(1)} km</div>
                <div className="text-sm opacity-90">Bơi lội tháng này</div>
              </div>
            </div>
            <div className="text-sm">
              Mục tiêu: {config.monthlyTargets[userData?.gender || 'male'].swim}km
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.activityCount}</div>
                <div className="text-sm opacity-90">Hoạt động</div>
              </div>
            </div>
            <div className="text-sm">
              Đã đồng bộ từ Strava
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(metrics.penalty)}</div>
                <div className="text-sm opacity-90">Phạt tháng này</div>
              </div>
            </div>
            <div className="text-sm">
              {metrics.runDeficit > 0 && `Chạy thiếu: ${metrics.runDeficit.toFixed(1)}km `}
              {metrics.swimDeficit > 0 && `Bơi thiếu: ${metrics.swimDeficit.toFixed(1)}km`}
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🏃‍♂️ Tiến độ chạy bộ</h3>
              <span className="text-blue-600 font-bold">{metrics.kpiProgress.run.toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" 
                style={{ width: `${metrics.kpiProgress.run}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>0 km</span>
              <span>{metrics.runDistance.toFixed(1)} / {config.monthlyTargets[userData?.gender || 'male'].run} km</span>
              <span>Mục tiêu</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🏊‍♂️ Tiến độ bơi lội</h3>
              <span className="text-teal-600 font-bold">{metrics.kpiProgress.swim.toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-green-500" 
                style={{ width: `${metrics.kpiProgress.swim}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>0 km</span>
              <span>{metrics.swimDistance.toFixed(1)} / {config.monthlyTargets[userData?.gender || 'male'].swim} km</span>
              <span>Mục tiêu</span>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📝 Hoạt động gần đây</h3>
            <button
              onClick={syncActivities}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Làm mới
            </button>
          </div>
          
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity, index) => (
                <div key={activity.id || index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    activity.type?.toLowerCase().includes('run') ? 'bg-blue-100' : 'bg-teal-100'
                  }`}>
                    {activity.type?.toLowerCase().includes('run') ? (
                      <Zap className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Waves className="w-5 h-5 text-teal-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.name}</h4>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(activity.start_date).toLocaleDateString('vi-VN')}
                      <span className="mx-2">•</span>
                      <Timer className="w-3 h-3 mr-1" />
                      {activity.moving_time ? Math.floor(activity.moving_time / 60) : 0} phút
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{(activity.distance / 1000).toFixed(2)} km</div>
                    <div className="text-sm text-gray-600">Quãng đường</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có hoạt động nào</p>
              {!stravaConnected && (
                <p className="text-sm text-blue-600 mt-2">
                  Kết nối Strava để xem hoạt động của bạn
                </p>
              )}
            </div>
          )}
        </div>

        {/* Challenge Timeline */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-purple-800 mb-4">📅 Timeline Challenge</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-600 mr-3"></div>
              <div>
                <p className="font-medium">{config.durationMonths} Tháng KPI</p>
                <p className="text-sm text-gray-600">{formatDate(config.startDate)} - {formatDate(config.kpiEndDate)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-3"></div>
              <div>
                <p className="font-medium">10 Ngày Cuối</p>
                <p className="text-sm text-gray-600">{formatDate(config.finalChallengeStart)} - {formatDate(config.finalChallengeEnd)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 text-sm">
              <p>Challenge được quản lý bởi: QUỸ CHALLENGE 100 NGÀY</p>
              <p>TK BIDV: 8856525377 - Liên hệ admin khi cần hỗ trợ</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {isAdmin && (
                <a
                  href="#/admin-dashboard"
                  className="flex items-center text-purple-600 hover:text-purple-800"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin Dashboard
                </a>
              )}
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Home className="w-4 h-4 mr-1" />
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
