import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, presenceService } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import stravaService from '../services/stravaService';
import challengeConfig from '../services/challengeConfig';
import { 
  Activity, Timer, TrendingUp, Calendar, DollarSign,
  Target, BarChart3, LogOut, RefreshCw, User,
  AlertCircle, Heart, Waves, Settings, Bike,
  Shield, Clock, CheckCircle, XCircle, Users,
  FileText, Award, Flame, Home, ArrowUp, Footprints, Edit
} from 'lucide-react';
import logo from '/logo.png?url';
import NotificationBell from './NotificationBell';
import PushNotificationToggle from './PushNotificationToggle';
import KPIExceptionRequest from './KPIExceptionRequest';
import EventActivitySelector from './EventActivitySelector';
import UserProfile from './UserProfile';


function Dashboard({ user }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);
  // State cho event participations (sự kiện đặc biệt)
  const [eventParticipations, setEventParticipations] = useState([]);
  // State cho special_events (tất cả sự kiện tuỳ chỉnh đang diễn ra)
  const [specialEventsToday, setSpecialEventsToday] = useState([]);
  // State cho cài đặt sự kiện mặc định (bật/tắt)
  const [disabledDefaultEvents, setDisabledDefaultEvents] = useState({});
  // State cho accordion tháng
  const [openMonth, setOpenMonth] = useState(null);
  // State cho auto-refresh
  const [lastRefresh, setLastRefresh] = useState(new Date());
  // State cho KPI Exception modal
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  // State cho nút scroll to top
  const [showScrollTop, setShowScrollTop] = useState(false);
  // State cho Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load event participations của user
  const loadEventParticipations = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, 'event_participations'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const participations = [];
      snapshot.forEach(docSnap => {
        participations.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setEventParticipations(participations);
    } catch (err) {
      console.error('Error loading event participations:', err);
    }
  };

  // Load tất cả special_events đang diễn ra hôm nay (hỗ trợ cả string và Firestore Timestamp)
  const loadSpecialEventsToday = async () => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const todayStr = today.toISOString().split('T')[0];
      const q = query(collection(db, 'special_events'));
      const snapshot = await getDocs(q);
      const events = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        console.debug('loadSpecialEventsToday doc:', docSnap.id, data);
        // Helper: parse Firestore Timestamp or string date
        function getStartDate(d) {
          if (d.startDate && typeof d.startDate === 'object' && d.startDate.seconds) {
            return new Date(d.startDate.seconds * 1000);
          }
          if (d.eventStartDate) {
            return new Date(d.eventStartDate);
          }
          return null;
        }
        function getEndDate(d) {
          if (d.endDate && typeof d.endDate === 'object' && d.endDate.seconds) {
            return new Date(d.endDate.seconds * 1000);
          }
          if (d.eventEndDate) {
            return new Date(d.eventEndDate);
          }
          return null;
        }

        // Ưu tiên kiểm tra timestamp, sau đó đến string
        const start = getStartDate(data);
        const end = getEndDate(data);
        let isActiveToday = false;
        if (start && end) {
          isActiveToday = todayEnd >= start && todayStart <= end;
        } else if (data.eventStartDate && data.eventEndDate) {
          // Fallback: so sánh string YYYY-MM-DD
          isActiveToday = todayStr >= data.eventStartDate && todayStr <= data.eventEndDate;
        }
        if (isActiveToday && data.isActive !== false) {
          events.push({
            id: docSnap.id,
            name: data.name || data.eventName,
            description: data.description || data.eventDescription,
            icon: data.icon || data.eventIcon || '🎉',
            type: data.eventType || 'custom',
            color: data.color || data.eventColor || '#a855f7',
            genderTarget: data.genderTarget,
            startDate: start,
            endDate: end,
          });
        }
      });
      console.debug('loadSpecialEventsToday filtered events:', events);
      setSpecialEventsToday(events);
    } catch (err) {
      console.error('Error loading special_events:', err);
    }
  };

  // Load cài đặt sự kiện mặc định từ Firestore
  const loadDefaultEventsSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'default_events');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDisabledDefaultEvents(docSnap.data().events || {});
      }
    } catch (err) {
      console.error('Error loading default events settings:', err);
    }
  };

  useEffect(() => {
    const loadEverything = async () => {
      if (!user) return;

      try {
        // First, sync Strava tokens from Firestore for the current user so we don't accidentally use another user's tokens in localStorage
        const authenticated = await stravaService.syncTokensFromFirebase(user.uid);
        setStravaConnected(authenticated);

        // Then load user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);

          const isUserAdmin = data.role === 'admin' || data.role === 'super_admin' || data.email === 'admin@example.com' || data.email === 'admin@challenge.com' || data.email === 'superadmin@challenge.com';
          setIsAdmin(isUserAdmin);

          // Only load activities if user is approved/active AND they have a Strava connection (either tokens authenticated or stored athlete)
          const hasStravaConnection = authenticated || !!data.strava_athlete || !!data.strava_access_token;
          if (data.status === 'approved' && data.isActive && hasStravaConnection) {
            await loadActivities();
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEverything();
    loadEventParticipations();
    loadSpecialEventsToday();
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

  // State để lưu processed activities với quota và validation
  const [processedData, setProcessedData] = useState(null);
  const [metrics, setMetrics] = useState({
    runDistance: 0,
    swimDistance: 0,
    totalDistance: 0,
    activityCount: 0,
    kpiProgress: { run: 0, swim: 0 },
    penalty: 0,
    runDeficit: 0,
    swimDeficit: 0,
    penaltyDetails: null
  });

  // Recalculate khi activities hoặc userData hoặc eventParticipations thay đổi
  useEffect(() => {
    if (!userData || activities.length === 0) {
      setMetrics({
        runDistance: 0,
        swimDistance: 0,
        totalDistance: 0,
        activityCount: 0,
        kpiProgress: { run: 0, swim: 0 },
        penalty: 0,
        runDeficit: 0,
        swimDeficit: 0,
        penaltyDetails: null
      });
      return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter activities cho tháng hiện tại
    const monthActivities = activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
    });

    // Sử dụng hàm mới để xử lý với quota và validation (truyền thêm eventParticipations và disabledDefaultEvents)
    const result = challengeConfig.processActivitiesWithQuota(monthActivities, userData.gender || 'male', eventParticipations, disabledDefaultEvents);
    
    // Cập nhật processed data để hiển thị
    setProcessedData(result);

    setMetrics({
      runDistance: result.summary.totalRunCounted,
      swimDistance: result.summary.totalSwimCounted,
      totalDistance: parseFloat((result.summary.totalRunCounted + result.summary.totalSwimCounted).toFixed(1)),
      activityCount: monthActivities.length,
      kpiProgress: {
        run: result.summary.runProgress,
        swim: result.summary.swimProgress
      },
      penalty: result.summary.totalPenalty,
      runDeficit: result.summary.finalRunDeficit,
      swimDeficit: result.summary.finalSwimDeficit,
      penaltyDetails: result.summary
    });
  }, [activities, userData, eventParticipations, disabledDefaultEvents]);

  const formatCurrency = (amount) => challengeConfig.formatCurrency(amount);
  const formatDate = (date) => challengeConfig.formatDate(date);

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
              onClick={() => navigate('/welcome')}
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
              onClick={() => navigate('/welcome')}
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
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition cursor-pointer"
              title="Chỉnh sửa thông tin cá nhân"
            >
              {userData?.avatarUrl || userData?.strava_athlete?.profile || userData?.strava_athlete?.profile_medium ? (
                <img
                  src={userData.avatarUrl || userData.strava_athlete.profile_medium || userData.strava_athlete.profile}
                  alt="avatar"
                  className="w-7 h-7 rounded-full mr-2 border-2 border-white/50 object-cover"
                />
              ) : (
                <User className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm font-medium hidden sm:inline">{userData?.fullName || user?.email?.split('@')[0]}</span>
              <Edit className="w-3.5 h-3.5 ml-1.5 opacity-70" />
            </button>
          </div>
          
          {/* Row 2: Navigation buttons + Strava/Chấn thương */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <a 
                href="#/welcome" 
                className="flex items-center bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                <Home className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Luật chơi</span>
              </a>
              {!isAdmin && (
                <a
                  href="#/users-dashboard"
                  className="flex items-center bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Theo dõi đồng bọn</span>
                </a>
              )}
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
            <div className="flex items-center gap-2">
              {/* Kết nối Strava/Đồng bộ */}
              {!stravaConnected ? (
                <button
                  onClick={connectStrava}
                  className="flex items-center bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow"
                  title="Kết nối Strava"
                >
                  <svg className="w-4 h-4 mr-0 sm:mr-1 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M3 21L9.5 3h2.5l6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.5 3l1.8 6.5L12.9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="ml-1">Kết nối Strava</span>
                </button>
              ) : (
                <button
                  onClick={syncActivities}
                  className="flex items-center bg-gradient-to-r from-blue-500 to-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow"
                  title="Đồng bộ"
                >
                  <RefreshCw className="w-4 h-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">Đồng bộ</span>
                </button>
              )}
              {/* Gửi yêu cầu chấn thương */}
              <button
                onClick={() => setShowExceptionModal(true)}
                className="flex items-center bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow"
                title="Báo cáo"
              >
                <Heart className="w-4 h-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Báo cáo</span>
              </button>
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
        {/* Push Notification Toggle */}
        <div className="mb-6">
          <PushNotificationToggle userId={user?.uid} />
        </div>

        {/* Banner sự kiện: dùng EventActivitySelector làm banner chính */}
        <div className="mb-6">
          <EventActivitySelector
            user={user}
            activities={activities}
            onActivityLinked={() => {
              loadEventParticipations();
              loadSpecialEventsToday();
            }}
          />
        </div>

        {/* EventActivitySelector is rendered above as the single banner */}

        {/* Stats Overview - Gộp stat + progress bar cùng loại */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          {/* Card Chạy bộ */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl shadow p-4 md:p-6">
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center mr-3 md:mr-4 text-xl md:text-2xl">
                🏃
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{metrics.runDistance.toFixed(1)} km</div>
                <div className="text-xs md:text-sm opacity-90">Chạy bộ tháng này</div>
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
          <div className="bg-gradient-to-br from-teal-500 to-green-500 text-white rounded-xl shadow p-4 md:p-6">
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center mr-3 md:mr-4 text-xl md:text-2xl">
                🏊
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{metrics.swimDistance.toFixed(1)} km</div>
                <div className="text-xs md:text-sm opacity-90">Bơi lội tháng này</div>
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
          <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white rounded-xl shadow p-4 md:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg flex items-center justify-center mr-3 md:mr-4">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{formatCurrency(metrics.penalty)}</div>
                <div className="text-xs md:text-sm opacity-90">Phạt tháng này</div>
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
        <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900">📝 Hoạt động gần đây</h3>
            <div className="flex items-center gap-3 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-500">
                Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
              </span>
              <button
                onClick={() => loadActivities(true)}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
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
                // Xử lý activities với quota và validation
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
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
                  const gender = userData?.gender || 'male';
                  
                  // Xử lý với quota và validation cho tháng này (truyền thêm eventParticipations)
                  let monthResult;
                  try {
                    monthResult = challengeConfig.processActivitiesWithQuota(monthActs, gender, eventParticipations);
                  } catch (err) {
                    console.error('Error processing activities:', err);
                    monthResult = { activities: monthActs.map(a => ({...a, validation: {}})), summary: { totalRunCounted: 0, totalSwimCounted: 0, runTarget: 80, swimTarget: 16, runProgress: 0, swimProgress: 0, totalPenalty: 0, conversion: {} } };
                  }
                  const summary = monthResult?.summary || { totalRunCounted: 0, totalSwimCounted: 0, runTarget: 80, swimTarget: 16, runProgress: 0, swimProgress: 0, totalPenalty: 0, conversion: {} };
                  
                  const isOpen = openMonth === monthKey;
                  const isCurrentMonth = parseInt(month) === currentMonth + 1 && parseInt(year) === currentYear;
                  
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
                            {isCurrentMonth && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Tháng hiện tại</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-sm font-semibold rounded px-2 py-1 ${summary.totalPenalty > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                              {summary.totalPenalty > 0 ? `Phạt: ${challengeConfig.formatCurrency(summary.totalPenalty)}` : '✅ Đủ KPI'}
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
                                <span className="text-gray-600">Chạy bộ (đã tính quota)</span>
                                <span className="font-medium">{(summary.totalRunCounted || 0).toFixed(1)} / {summary.runTarget || 0} km</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${(summary.runProgress || 0) >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, summary.runProgress || 0)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${(summary.runProgress || 0) >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                              {(summary.runProgress || 0).toFixed(0)}%
                            </span>
                          </div>
                          
                          {/* Swim progress */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏊</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">Bơi lội (đã tính quota)</span>
                                <span className="font-medium">{(summary.totalSwimCounted || 0).toFixed(1)} / {summary.swimTarget || 0} km</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${(summary.swimProgress || 0) >= 100 ? 'bg-green-500' : 'bg-teal-500'}`}
                                  style={{ width: `${Math.min(100, summary.swimProgress || 0)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${(summary.swimProgress || 0) >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                              {(summary.swimProgress || 0).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Conversion info */}
                        {(summary.conversion?.runFromSwim > 0 || summary.conversion?.swimFromRun > 0) && (
                          <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                            🔄 {summary.message}
                          </div>
                        )}
                      </div>
                      
                      {isOpen && (
                        <div className="space-y-4 px-2 pt-2 pb-4">
                          {(monthResult?.activities || monthActs).map((activity, idx) => {
                            // Lấy validation data
                            const v = activity.validation || {};
                            const startDate = new Date(activity.start_date);
                            const startTimeStr = startDate.toLocaleString('vi-VN', { hour12: false });
                            const movingTime = activity.moving_time || 0;
                            const totalTimeStr = `${Math.floor(movingTime/60)}:${(movingTime%60).toString().padStart(2,'0')}`;
                            const distanceKm = activity.distance ? activity.distance/1000 : 0;
                            const type = activity.type?.toLowerCase() || '';
                            
                            // Format pace
                            let paceStr = '';
                            if (type.includes('run') && v.pace > 0) {
                              const paceMin = Math.floor(v.pace);
                              const paceSec = Math.round((v.pace % 1) * 60);
                              paceStr = `${paceMin}:${paceSec.toString().padStart(2,'0')} /km`;
                            } else if (type.includes('swim') && distanceKm > 0) {
                              const pacePer100m = movingTime / (activity.distance/100);
                              const min = Math.floor(pacePer100m/60);
                              const sec = Math.round(pacePer100m%60).toString().padStart(2,'0');
                              paceStr = `${min}:${sec} /100m`;
                            }
                            
                            const avgHr = activity.average_heartrate ? `${activity.average_heartrate} bpm` : '';
                            
                            // Icon và màu sắc
                            let icon, iconBg, borderColor;
                            if (!v.isValid) {
                              borderColor = 'border-red-300 bg-red-50';
                            } else if (v.isEventActivity) {
                              borderColor = 'border-purple-300 bg-purple-50'; // Event activity
                            } else if (v.isDefaultEventDay) {
                              borderColor = 'border-yellow-300 bg-yellow-50'; // Ngày lễ mặc định
                            } else if (v.quotaExceeded) {
                              borderColor = 'border-orange-300 bg-orange-50';
                            } else {
                              borderColor = 'border-gray-200';
                            }
                            
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
                              <div key={activity.id || idx} className={`flex flex-col p-4 border rounded-lg ${borderColor}`}>
                                {/* Main info row */}
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                    {icon}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{activity.name}</h4>
                                    <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1">
                                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{startTimeStr}</span>
                                      <span>•</span>
                                      <span className="flex items-center"><Timer className="w-3 h-3 mr-1" />{totalTimeStr} phút</span>
                                      {paceStr && <><span>•</span><span>Pace: {paceStr}</span></>}
                                      {v.avgSpeed > 0 && <><span>•</span><span>TB: {v.avgSpeed} km/h</span></>}
                                      {avgHr && <><span>•</span><span>HR: {avgHr}</span></>}
                                    </div>
                                  </div>
                                  
                                  {/* Distance info */}
                                  <div className="text-right min-w-[120px]">
                                    <div className="font-bold text-lg">{distanceKm.toFixed(2)} km</div>
                                    {v.countedDistance !== undefined && !v.notCounted && (
                                      <div className={`text-sm ${
                                        !v.isValid ? 'text-red-600' :
                                        v.isEventActivity ? 'text-purple-600' :
                                        v.isDefaultEventDay ? 'text-yellow-700' :
                                        v.quotaExceeded ? 'text-orange-600' : 'text-green-600'
                                      }`}>
                                        → Tính: {v.countedDistance.toFixed(2)} km
                                      </div>
                                    )}
                                    {v.notCounted && (
                                      <div className="text-sm text-gray-500">Không tính KPI</div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Validation & Quota details */}
                                <div className="mt-3 pt-3 border-t border-gray-200 text-xs space-y-1">
                                  {/* Event activity info - hiển thị khi là event activity */}
                                  {v.isEventActivity && (
                                    <div className="flex items-center bg-purple-100 text-purple-700 font-medium p-2 rounded-lg border border-purple-300">
                                      <span className="mr-2 text-lg">🎉</span>
                                      <span>
                                        {v.eventInfo?.eventName 
                                          ? `Sự kiện: ${v.eventInfo.eventName}` 
                                          : 'Sự kiện đặc biệt'
                                        } - <strong>Tính FULL {v.countedDistance || (v.distance/1000).toFixed(2)} km</strong> (không giới hạn quota ngày)
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Default event day info - ngày lễ mặc định */}
                                  {v.isDefaultEventDay && !v.isEventActivity && (
                                    <div className="flex items-center bg-yellow-100 text-yellow-700 font-medium p-2 rounded-lg border border-yellow-300">
                                      <span className="mr-2 text-lg">{v.defaultEvent?.icon || '🎊'}</span>
                                      <span>
                                        <strong>{v.defaultEvent?.name || 'Ngày lễ'}</strong> - Tính FULL {v.countedDistance || (v.distance/1000).toFixed(2)} km (không giới hạn quota)
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Quota info - chỉ hiện nếu không phải event activity và không phải ngày lễ */}
                                  {v.dailyQuota && !v.isEventActivity && !v.isDefaultEventDay && (
                                    <div className="flex items-center text-gray-600">
                                      <span className="mr-2">📊</span>
                                      <span>Quota ngày: {v.dailyQuota} km</span>
                                      {v.dayTotalBefore > 0 && (
                                        <span className="ml-2 text-gray-500">(đã có {v.dayTotalBefore} km trước đó)</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Quota exceeded warning */}
                                  {v.quotaExceeded && (
                                    <div className="flex items-center text-orange-600">
                                      <span className="mr-2">⚠️</span>
                                      <span>Vượt quota ngày! Chỉ tính {v.countedDistance} km (dư {v.quotaRemainder} km không tính)</span>
                                    </div>
                                  )}
                                  
                                  {/* Validity status */}
                                  {v.isValid ? (
                                    <div className="flex items-center text-green-600">
                                      <span className="mr-2">✅</span>
                                      <span>Hợp lệ - Tính vào KPI</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-red-600">
                                      <span className="mr-2">🚫</span>
                                      <span>Không hợp lệ - Không tính vào KPI</span>
                                    </div>
                                  )}
                                  
                                  {/* Issues list */}
                                  {v.issues && v.issues.length > 0 && (
                                    <div className="mt-2 p-2 bg-yellow-50 rounded text-yellow-800">
                                      {v.issues.map((issue, i) => (
                                        <div key={i} className="flex items-start">
                                          <span className="mr-1">{issue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                onClick={() => navigate('/welcome')}
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

      {/* KPI Exception Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] overflow-y-auto">
            <KPIExceptionRequest 
              user={user} 
              onClose={() => setShowExceptionModal(false)} 
            />
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] overflow-y-auto">
            <UserProfile 
              user={user}
              userData={userData}
              onClose={() => setShowProfileModal(false)}
              onUpdate={(updatedData) => {
                setUserData(prev => ({ ...prev, ...updatedData }));
                setShowProfileModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
