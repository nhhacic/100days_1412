import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, presenceService } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import stravaService from '../services/stravaService';
import challengeConfig from '../services/challengeConfig';
import { 
  Activity, Timer, TrendingUp, Calendar, DollarSign,
  Target, BarChart3, LogOut, RefreshCw, User,
  AlertCircle, Heart, Waves, Settings, Bike,
  Shield, Clock, CheckCircle, XCircle, Users,
  FileText, Award, Flame, Home, ArrowUp, Footprints
} from 'lucide-react';
import logo from '/logo.png?url';
import NotificationBell from './NotificationBell';


function Dashboard({ user }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);
  // State cho accordion tháng
  const [openMonth, setOpenMonth] = useState(null);
  // State cho auto-refresh
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // State cho nút scroll to top
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          
          const isUserAdmin = data.role === 'admin' || data.role === 'super_admin' || data.email === 'admin@example.com' || data.email === 'admin@challenge.com' || data.email === 'superadmin@challenge.com';
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
    

    // Khi user login, luôn sync token từ Firestore về localStorage
    const syncStravaTokens = async () => {
      if (user) {
        const authenticated = await stravaService.syncTokensFromFirebase(user.uid);
        setStravaConnected(authenticated);
      }
    };

    loadUserData();
    syncStravaTokens();
    setConfig(challengeConfig.getConfig());

    // Bắt đầu theo dõi presence (online status)
    let cleanupPresence = null;
    if (user) {
      cleanupPresence = presenceService.startTracking(user.uid);
    }

    // Auto-refresh mỗi 5 phút
    const autoRefreshInterval = setInterval(() => {
      if (user && stravaConnected) {
        loadActivities();
        setLastRefresh(new Date());
      }
    }, 5 * 60 * 1000); // 5 phút

    // Scroll listener cho nút scroll to top
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(autoRefreshInterval);
      window.removeEventListener('scroll', handleScroll);
      // Cleanup presence tracking
      if (cleanupPresence) cleanupPresence();
    };
  }, [user, stravaConnected]);


  // Ưu tiên lấy activities từ Firestore, chỉ gọi Strava nếu chưa có
  const loadActivities = async (showAlert = false) => {
    if (!user) return;
    try {
      // Lấy từ Firestore trước
      const cached = await stravaService.getActivitiesFromFirebase(user.uid);
      if (cached && cached.length > 0) {
        const previousCount = activities.length;
        setActivities(cached);
        
        // Thông báo nếu có activity mới
        if (showAlert && cached.length > previousCount) {
          alert(`🎉 Có ${cached.length - previousCount} hoạt động mới từ Strava!`);
        }
        return;
      }
      // Nếu chưa có, lấy từ Strava và lưu lại
      if (stravaService.isAuthenticated()) {
        const stravaActivities = await stravaService.getActivities();
        setActivities(stravaActivities || []);
        if (stravaActivities && stravaActivities.length > 0) {
          await stravaService.saveActivitiesToFirebase(user.uid, stravaActivities);
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const connectStrava = () => {
    stravaService.redirectToStravaAuth();
  };


  // Bắt buộc lấy mới từ Strava và lưu lại
  const syncActivities = async () => {
    if (!stravaService.isAuthenticated()) {
      alert('Vui lòng kết nối Strava trước!');
      return;
    }
    setLoading(true);
    try {
      const stravaActivities = await stravaService.getActivities();
      setActivities(stravaActivities || []);
      if (stravaActivities && stravaActivities.length > 0) {
        await stravaService.saveActivitiesToFirebase(user.uid, stravaActivities);
      }
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
              onClick={() => { if (window.confirm('Bạn có chắc muốn đăng xuất không?')) auth.signOut(); }}
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
          {/* Row 1: Logo + Title + Season Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <img src={logo} alt="logo" className="w-12 h-12 mr-3 rounded-lg bg-white p-1 object-contain" />
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-xl md:text-2xl font-bold">Challenge 100 Ngày</h1>
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                    MÙA {config.season}
                  </span>
                </div>
                <p className="opacity-80 text-xs md:text-sm">
                  {formatDate(config.startDate)} - {formatDate(config.seasonEndDate)}
                </p>
              </div>
            </div>
            
            {/* User info */}
            <div className="flex items-center bg-white/20 px-3 py-1.5 rounded-full">
              {userData?.strava_athlete?.profile || userData?.strava_athlete?.profile_medium ? (
                <img
                  src={userData.strava_athlete.profile_medium || userData.strava_athlete.profile}
                  alt="avatar"
                  className="w-7 h-7 rounded-full mr-2 border-2 border-white/50 object-cover"
                />
              ) : (
                <User className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm font-medium hidden sm:inline">{userData?.fullName || user?.email?.split('@')[0]}</span>
            </div>
          </div>
          
          {/* Row 2: Navigation buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a 
                href="#/welcome" 
                className="flex items-center bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                <Home className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Luật chơi</span>
              </a>
              {isAdmin && (
                <a 
                  href="#/admin-dashboard" 
                  className="flex items-center bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </a>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Notification Bell */}
              <NotificationBell userId={user?.uid} />
              
              <button
                onClick={() => { if (window.confirm('Bạn có chắc muốn đăng xuất không?')) auth.signOut(); }}
                className="flex items-center bg-white/90 text-gray-700 hover:bg-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Đăng xuất</span>
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

        {/* Stats Overview - Gộp stat + progress bar cùng loại */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Card Chạy bộ */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 text-2xl">
                🏃
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.runDistance.toFixed(1)} km</div>
                <div className="text-sm opacity-90">Chạy bộ tháng này</div>
              </div>
            </div>
            <div className="text-sm mb-3">
              Mục tiêu: {config.monthlyTargets[userData?.gender || 'male'].run}km
            </div>
            {/* Progress bar */}
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-white" 
                style={{ width: `${metrics.kpiProgress.run}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-2 opacity-90">
              <span>{metrics.kpiProgress.run.toFixed(1)}%</span>
              <span>{metrics.runDistance.toFixed(1)} / {config.monthlyTargets[userData?.gender || 'male'].run} km</span>
            </div>
          </div>

          {/* Card Bơi lội */}
          <div className="bg-gradient-to-br from-teal-500 to-green-500 text-white rounded-xl shadow p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4 text-2xl">
                🏊
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.swimDistance.toFixed(1)} km</div>
                <div className="text-sm opacity-90">Bơi lội tháng này</div>
              </div>
            </div>
            <div className="text-sm mb-3">
              Mục tiêu: {config.monthlyTargets[userData?.gender || 'male'].swim}km
            </div>
            {/* Progress bar */}
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-white" 
                style={{ width: `${metrics.kpiProgress.swim}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-2 opacity-90">
              <span>{metrics.kpiProgress.swim.toFixed(1)}%</span>
              <span>{metrics.swimDistance.toFixed(1)} / {config.monthlyTargets[userData?.gender || 'male'].swim} km</span>
            </div>
          </div>

          {/* Card Phạt */}
          <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white rounded-xl shadow p-6">
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
              {metrics.runDeficit > 0 && <div>🏃 Chạy thiếu: {metrics.runDeficit.toFixed(1)}km</div>}
              {metrics.swimDeficit > 0 && <div>🏊 Bơi thiếu: {metrics.swimDeficit.toFixed(1)}km</div>}
              {metrics.runDeficit === 0 && metrics.swimDeficit === 0 && <div>✅ Đạt KPI!</div>}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📝 Hoạt động gần đây</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
              </span>
              <button
                onClick={() => loadActivities(true)}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Làm mới
              </button>
            </div>
          </div>
          
          {activities.length > 0 ? (
            <div>
              {/* Gom theo tháng, accordion ngoài IIFE, dùng state openMonth */}
              {(() => {
                const sorted = [...activities].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                const grouped = {};
                sorted.forEach(act => {
                  const d = new Date(act.start_date);
                  const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(act);
                });
                return Object.keys(grouped).sort((a,b)=>b.localeCompare(a)).map(monthKey => {
                  const monthActs = grouped[monthKey];
                  const [year, month] = monthKey.split('-');
                  // Tính tổng chạy, bơi, phạt tháng này
                  let run = 0, swim = 0;
                  monthActs.forEach(act => {
                    const type = act.type?.toLowerCase() || act.sport_type?.toLowerCase() || '';
                    const dist = act.distance ? act.distance/1000 : 0;
                    if (type.includes('run')) run += dist;
                    if (type.includes('swim')) swim += dist;
                  });
                  const gender = userData?.gender || 'male';
                  const target = config.monthlyTargets[gender];
                  const runDeficit = Math.max(0, target.run - run);
                  const swimDeficit = Math.max(0, target.swim - swim);
                  const penalty = challengeConfig.calculatePenalty(runDeficit, swimDeficit).total;
                  const isOpen = openMonth === monthKey;
                  return (
                    <div key={monthKey} className="mb-8 border rounded-lg overflow-hidden">
                      <div 
                        className="cursor-pointer select-none px-4 py-3 bg-gray-50 hover:bg-gray-100" 
                        onClick={() => setOpenMonth(isOpen ? null : monthKey)}
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-bold text-lg text-blue-700">
                            {`Tháng ${month}/${year}`} 
                            <span className="text-sm font-normal text-gray-500 ml-2">({monthActs.length} hoạt động)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-red-600 font-semibold bg-red-50 rounded px-2 py-1">
                              Phạt: {challengeConfig.formatCurrency(penalty)}
                            </div>
                            <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        
                        {/* Progress bars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Run progress */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏃</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Chạy bộ</span>
                                <span className="font-medium">{run.toFixed(1)} / {target.run} km</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${run >= target.run ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, (run / target.run) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${run >= target.run ? 'text-green-600' : 'text-gray-500'}`}>
                              {((run / target.run) * 100).toFixed(0)}%
                            </span>
                          </div>
                          
                          {/* Swim progress */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏊</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Bơi lội</span>
                                <span className="font-medium">{swim.toFixed(1)} / {target.swim} km</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${swim >= target.swim ? 'bg-green-500' : 'bg-teal-500'}`}
                                  style={{ width: `${Math.min(100, (swim / target.swim) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${swim >= target.swim ? 'text-green-600' : 'text-gray-500'}`}>
                              {((swim / target.swim) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isOpen && (
                        <div className="space-y-4 px-2 pt-2 pb-4">
                          {monthActs.map((activity, idx) => {
                            // Tính toán các thông số
                            const startDate = new Date(activity.start_date);
                            const startTimeStr = startDate.toLocaleString('vi-VN', { hour12: false });
                            const movingTime = activity.moving_time || 0;
                            const totalTimeStr = `${Math.floor(movingTime/60)}:${(movingTime%60).toString().padStart(2,'0')} phút`;
                            const distanceKm = activity.distance ? activity.distance/1000 : 0;
                            const type = activity.type?.toLowerCase() || '';
                            let avgPace = '';
                            if (type.includes('run') && distanceKm > 0) {
                              avgPace = `${Math.floor(movingTime/(60*distanceKm))}:${(Math.round((movingTime/distanceKm)%60)).toString().padStart(2,'0')} /km`;
                            } else if (type.includes('swim') && activity.distance > 0) {
                              // pace swim: phút/100m
                              const pacePer100m = movingTime / (activity.distance/100);
                              const min = Math.floor(pacePer100m/60);
                              const sec = Math.round(pacePer100m%60).toString().padStart(2,'0');
                              avgPace = `${min}:${sec} /100m`;
                            }
                            const avgHr = activity.average_heartrate ? `${activity.average_heartrate} bpm` : '';
                            // Chọn icon đúng loại
                            let icon, iconBg;
                            if (type.includes('run')) {
                              icon = <span className="text-2xl">🏃‍♂️</span>;
                              iconBg = 'bg-blue-100';
                            } else if (type.includes('swim')) {
                              icon = <span className="text-2xl">🏊‍♂️</span>;
                              iconBg = 'bg-teal-100';
                            } else {
                              icon = <Activity className="w-5 h-5 text-orange-600" />;
                              iconBg = 'bg-orange-100';
                            }
                            return (
                              <div key={activity.id || idx} className={`flex flex-col md:flex-row md:items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 gap-4`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${iconBg}`}>
                                  {icon}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                  <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span>{startTimeStr}</span>
                                    <span className="mx-1">•</span>
                                    <Timer className="w-3 h-3 mr-1" />
                                    <span>{totalTimeStr}</span>
                                    {avgPace && <><span className="mx-1">•</span><span>Pace: {avgPace}</span></>}
                                    {avgHr && <><span className="mx-1">•</span><span>HR: {avgHr}</span></>}
                                  </div>
                                </div>
                                <div className="text-right min-w-[90px]">
                                  <div className="font-bold text-lg">{distanceKm.toFixed(2)} km</div>
                                  <div className="text-sm text-gray-600">Quãng đường</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
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

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition z-50"
          title="Lên đầu trang"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default Dashboard;
