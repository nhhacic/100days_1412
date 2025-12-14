import React, { useState, useEffect } from 'react';
import { db, auth, presenceService } from '../services/firebase';
import { 
  collection, getDocs, query, where, orderBy, updateDoc, doc,
  limit, startAfter, Timestamp, deleteDoc, getDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import challengeConfig from '../services/challengeConfig';
import stravaService from '../services/stravaService';
import { RoleManager, ROLES } from '../services/roleManager';
import { 
  Shield, Users, CheckCircle, XCircle, Clock, AlertCircle,
  Filter, Search, RefreshCw, Eye, Download, DollarSign,
  TrendingUp, TrendingDown, BarChart3, FileText, Settings,
  Home, LogOut, ChevronLeft, ChevronRight, User, Calendar,
  Waves, Activity, Award, CreditCard, Image as ImageIcon,
  CheckSquare, Square, Mail, Target, LineChart, TrendingUp as TrendingUpIcon,
  Timer, Heart, Map, Flag, Star, Shield as ShieldIcon,
  ChevronDown, ChevronUp, BarChart, PieChart, Layers,
  Wifi, WifiOff, Cloud, CloudOff, Database, Server,
  ActivitySquare, CalendarDays, TargetIcon, Trophy,
  FileBarChart, FileSpreadsheet, FileJson, FileText as FileTextIcon,
  Calculator, Percent, Hash, Thermometer, Gauge,
  Battery, BatteryCharging, BatteryFull, BatteryLow,
  Footprints, Bike
} from 'lucide-react';

function AdminIntegratedDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [presenceData, setPresenceData] = useState({}); // Lưu trạng thái online của users
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    online: 0, // Thêm số người online
    totalDeposit: 0,
    totalPenalty: 0,
    totalActivities: 0,
    totalDistance: 0
  });
  
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserActivities, setSelectedUserActivities] = useState([]);
  const [selectedUserMonthlyStats, setSelectedUserMonthlyStats] = useState([]);
  const [selectedUser30DayChart, setSelectedUser30DayChart] = useState([]);
  const [showDepositImages, setShowDepositImages] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details'
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [systemConfig, setSystemConfig] = useState({
    kpiTargets: config.monthlyTargets,
    dailyLimits: config.dailyLimits,
    penalties: config.penalties,
    conversion: config.conversion
  });

  const itemsPerPage = 12;

  useEffect(() => {
    loadUsers();
    loadPresenceData();
    setConfig(challengeConfig.getConfig());
    
    // Refresh presence data mỗi 30 giây
    const presenceInterval = setInterval(() => {
      loadPresenceData();
    }, 30000);
    
    return () => clearInterval(presenceInterval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allUsers, filter, search]);

  // Load trạng thái presence (online/offline) của tất cả users
  const loadPresenceData = async () => {
    try {
      const presenceRef = collection(db, 'presence');
      const presenceSnapshot = await getDocs(presenceRef);
      
      const presence = {};
      let onlineCount = 0;
      
      presenceSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        presence[docSnap.id] = data;
        
        // Đếm số người online
        if (presenceService.isOnline(data)) {
          onlineCount++;
        }
      });
      
      setPresenceData(presence);
      setStats(prev => ({ ...prev, online: onlineCount }));
    } catch (error) {
      console.error('Error loading presence data:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(500));
      const querySnapshot = await getDocs(q);
      
      const userList = [];
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let activeCount = 0;
      let totalDeposit = 0;
      let totalPenalty = 0;
      let totalActivities = 0;
      let totalDistance = 0;

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const user = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt ? new Date(data.approvedAt) : null,
          challengeStart: data.challengeStart?.toDate ? data.challengeStart.toDate() : new Date(data.challengeStart)
        };

        // Tính toán KPI và phạt (có thể tích hợp với Strava API thực tế)
        const metrics = await calculateUserMetrics(user);
        user.metrics = metrics;

        userList.push(user);

        // Thống kê
        if (user.status === 'pending_approval') pendingCount++;
        else if (user.status === 'approved') approvedCount++;
        else if (user.status === 'rejected') rejectedCount++;
        
        if (user.isActive) activeCount++;
        if (user.depositPaid) totalDeposit += 500000;
        totalPenalty += metrics.penalty;
        totalActivities += metrics.activityCount;
        totalDistance += metrics.totalDistance;
      }

      setAllUsers(userList);
      setStats({
        total: userList.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount,
        totalDeposit,
        totalPenalty,
        totalActivities,
        totalDistance: parseFloat(totalDistance.toFixed(1))
      });

    } catch (error) {
      console.error('Error loading users:', error);
      alert('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserMetrics = async (user) => {
    // Lấy activities THẬT từ Firestore (đã được sync từ Strava)
    const target = config.monthlyTargets[user.gender || 'male'];
    
    // Lấy activities từ user document trong Firestore
    const userActivities = user.strava_activities || [];
    
    // Lọc activities trong tháng hiện tại
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Tính toán distance từ activities thật
    let runDistance = 0;
    let swimDistance = 0;
    let totalDistance = 0;
    let activityCount = 0;
    
    const thirtyDayActivities = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    userActivities.forEach(activity => {
      const activityDate = new Date(activity.start_date);
      const distanceKm = (activity.distance || 0) / 1000;
      const type = (activity.type || activity.sport_type || '').toLowerCase();
      
      // Tính cho tháng hiện tại
      if (activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear) {
        if (type.includes('run') || type.includes('walk')) {
          runDistance += distanceKm;
        } else if (type.includes('swim')) {
          swimDistance += distanceKm;
        }
        totalDistance += distanceKm;
        activityCount++;
      }
      
      // Lấy activities 30 ngày gần đây
      if (activityDate >= thirtyDaysAgo) {
        thirtyDayActivities.push({
          ...activity,
          distanceKm: distanceKm,
          activityType: type.includes('run') || type.includes('walk') ? 'Run' : 
                       type.includes('swim') ? 'Swim' : 
                       type.includes('ride') || type.includes('bike') ? 'Ride' : 'Other'
        });
      }
    });
    
    // Tính deficit và penalty
    const runDeficit = Math.max(0, target.run - runDistance);
    const swimDeficit = Math.max(0, target.swim - swimDistance);
    const penalty = challengeConfig.calculatePenalty(runDeficit, swimDeficit).total;
    
    // Tính progress
    const runProgress = Math.min(100, (runDistance / target.run) * 100);
    const swimProgress = Math.min(100, (swimDistance / target.swim) * 100);
    
    // Tính streak (số ngày liên tiếp có hoạt động)
    const streak = calculateStreak(userActivities);
    
    // Tính monthly stats từ activities thật
    const monthlyStats = calculateMonthlyStatsFromReal(userActivities);
    
    return {
      runDistance: parseFloat(runDistance.toFixed(1)),
      swimDistance: parseFloat(swimDistance.toFixed(1)),
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      activityCount,
      runProgress: parseFloat(runProgress.toFixed(1)),
      swimProgress: parseFloat(swimProgress.toFixed(1)),
      penalty,
      runDeficit: parseFloat(runDeficit.toFixed(1)),
      swimDeficit: parseFloat(swimDeficit.toFixed(1)),
      streak,
      thirtyDayActivities,
      monthlyStats,
      thirtyDayChart: generateThirtyDayChartFromReal(thirtyDayActivities)
    };
  };

  // Tính streak từ activities thật
  const calculateStreak = (activities) => {
    if (!activities || activities.length === 0) return 0;
    
    // Sắp xếp theo ngày mới nhất
    const sorted = [...activities].sort((a, b) => 
      new Date(b.start_date) - new Date(a.start_date)
    );
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const activity of sorted) {
      const activityDate = new Date(activity.start_date);
      activityDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streak++;
        currentDate = activityDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Tính monthly stats từ activities thật
  const calculateMonthlyStatsFromReal = (activities) => {
    const monthlyStats = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          runDistance: 0,
          swimDistance: 0,
          rideDistance: 0,
          activityCount: 0,
          totalDistance: 0,
          totalTime: 0
        };
      }
      
      const stat = monthlyStats[monthKey];
      const distanceKm = (activity.distance || 0) / 1000;
      const type = (activity.type || activity.sport_type || '').toLowerCase();
      
      if (type.includes('run') || type.includes('walk')) {
        stat.runDistance += distanceKm;
      } else if (type.includes('swim')) {
        stat.swimDistance += distanceKm;
      } else if (type.includes('ride') || type.includes('bike')) {
        stat.rideDistance += distanceKm;
      }
      
      stat.activityCount++;
      stat.totalDistance += distanceKm;
      stat.totalTime += (activity.moving_time || 0);
    });
    
    // Round numbers
    Object.values(monthlyStats).forEach(stat => {
      stat.runDistance = parseFloat(stat.runDistance.toFixed(1));
      stat.swimDistance = parseFloat(stat.swimDistance.toFixed(1));
      stat.rideDistance = parseFloat(stat.rideDistance.toFixed(1));
      stat.totalDistance = parseFloat(stat.totalDistance.toFixed(1));
    });
    
    return Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month));
  };

  // Generate chart data từ activities thật
  const generateThirtyDayChartFromReal = (activities) => {
    const chartData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayActivities = activities.filter(a => {
        const actDate = new Date(a.start_date);
        actDate.setHours(0, 0, 0, 0);
        return actDate.getTime() === date.getTime();
      });
      
      let runKm = 0;
      let swimKm = 0;
      
      dayActivities.forEach(a => {
        const type = (a.type || a.sport_type || '').toLowerCase();
        const km = (a.distance || 0) / 1000;
        if (type.includes('run') || type.includes('walk')) runKm += km;
        else if (type.includes('swim')) swimKm += km;
      });
      
      chartData.push({
        date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        run: parseFloat(runKm.toFixed(1)),
        swim: parseFloat(swimKm.toFixed(1)),
        total: parseFloat((runKm + swimKm).toFixed(1))
      });
    }
    
    return chartData;
  };

  const applyFilters = () => {
    let filtered = [...allUsers];
    
    if (filter !== 'all') {
      filtered = filtered.filter(user => user.status === filter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.id?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredUsers(filtered);
    setCurrentPage(1);
    setSelectedUsers([]);
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Xác nhận duyệt người dùng này?')) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        isActive: true,
        approvedBy: auth.currentUser?.email || 'admin',
        approvedAt: new Date(),
        approvedByUID: auth.currentUser?.uid
      });
      
      alert('✅ Đã duyệt người dùng thành công!');
      loadUsers();
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (error) {
      console.error('Error approving user:', error);
      alert('❌ Lỗi khi duyệt người dùng');
    }
  };

  const handleBulkApprove = async () => {
    const pendingUsers = filteredUsers.filter(u => u.status === 'pending_approval');
    const selectedPending = pendingUsers.filter(u => selectedUsers.includes(u.id));
    
    if (selectedPending.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng chờ duyệt');
      return;
    }
    
    if (!window.confirm(`Xác nhận duyệt ${selectedPending.length} người dùng?`)) return;
    
    try {
      const batch = selectedPending.map(user => 
        updateDoc(doc(db, 'users', user.id), {
          status: 'approved',
          isActive: true,
          approvedBy: auth.currentUser?.email || 'admin',
          approvedAt: new Date(),
          approvedByUID: auth.currentUser?.uid
        })
      );
      
      await Promise.all(batch);
      alert(`✅ Đã duyệt ${selectedPending.length} người dùng thành công!`);
      loadUsers();
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error bulk approving users:', error);
      alert('❌ Lỗi khi duyệt nhiều người dùng');
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected',
        isActive: false,
        rejectionReason: reason,
        approvedBy: auth.currentUser?.email || 'admin',
        approvedAt: new Date(),
        approvedByUID: auth.currentUser?.uid
      });
      
      alert('✅ Đã từ chối người dùng!');
      loadUsers();
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('❌ Lỗi khi từ chối người dùng');
    }
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setSelectedUserActivities(user.metrics?.thirtyDayActivities || []);
    setSelectedUserMonthlyStats(user.metrics?.monthlyStats || []);
    setSelectedUser30DayChart(user.metrics?.thirtyDayChart || []);
    setViewMode('details');
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageUsers = getCurrentPageUsers().map(u => u.id);
    if (selectedUsers.length === currentPageUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentPageUsers);
    }
  };

  const toggleDepositImage = (userId) => {
    setShowDepositImages(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (date) => 
    date ? date.toLocaleDateString('vi-VN') : 'N/A';

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending_approval':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">⏳ Chờ duyệt</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Đã duyệt</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">❌ Từ chối</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">-</span>;
    }
  };

  const getDepositBadge = (user) => {
    if (user.depositPaid) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">💰 Đã nộp</span>;
    }
    if (user.previousSeasonTransfer) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">🔄 Chuyển mùa</span>;
    }
    return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">❌ Chưa nộp</span>;
  };

  const getActivityValidityBadge = (activity) => {
    if (activity.flagged) {
      return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">🚫 Phạm quy</span>;
    }
    if (!activity.isValid) {
      return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">⚠️ Không hợp lệ</span>;
    }
    if (activity.quotaExceeded) {
      return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">📊 Vượt quota</span>;
    }
    return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">✅ Hợp lệ</span>;
  };

  const calculateActivityStats = (activities) => {
    const totalDistance = activities.reduce((sum, act) => sum + (act.distance / 1000), 0);
    const totalTime = activities.reduce((sum, act) => sum + act.moving_time, 0);
    const validActivities = activities.filter(act => act.isValid).length;
    const flaggedActivities = activities.filter(act => act.flagged).length;
    const quotaExceeded = activities.filter(act => act.quotaExceeded).length;
    
    return {
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      totalTime: Math.round(totalTime / 3600 * 10) / 10, // hours
      validActivities,
      flaggedActivities,
      quotaExceeded,
      averagePace: activities.length > 0 ? 
        parseFloat((activities.reduce((sum, act) => sum + act.pace, 0) / activities.length).toFixed(1)) : 0,
      averageHeartRate: activities.length > 0 ? 
        Math.round(activities.reduce((sum, act) => sum + act.average_heartrate, 0) / activities.length) : 0
    };
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = getCurrentPageUsers();
  const selectedUserStats = selectedUserActivities.length > 0 ? 
    calculateActivityStats(selectedUserActivities) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Shield className="w-8 h-8 mr-3" />
                Bảng Điều Khiển Quản Trị Tích Hợp
              </h1>
              <p className="opacity-90">Quản lý người dùng, duyệt đăng ký & theo dõi tracklog</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">Tổng người dùng</div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-4">
              {viewMode === 'details' ? (
                <button
                  onClick={() => setViewMode('list')}
                  className="flex items-center text-white hover:text-gray-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Quay lại danh sách
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-white hover:text-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Dashboard cá nhân
                  </button>
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center text-white hover:text-gray-200"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Cấu hình hệ thống
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadUsers}
                className="flex items-center bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Làm mới
              </button>
              <button
                onClick={() => { if (window.confirm('Bạn có chắc muốn đăng xuất không?')) auth.signOut(); }}
                className="flex items-center bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - List View */}
        {viewMode === 'list' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <div className="text-gray-600 text-sm">Chờ duyệt</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.approved}</div>
                    <div className="text-gray-600 text-sm">Đã duyệt</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.rejected}</div>
                    <div className="text-gray-600 text-sm">Đã từ chối</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalActivities}</div>
                    <div className="text-gray-600 text-sm">Hoạt động</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Online Stats Bar */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-6 shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white">
                  <div className="relative mr-3">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">{stats.online}</span>
                    <span className="ml-2 text-white/90">người đang online</span>
                  </div>
                </div>
                <button
                  onClick={loadPresenceData}
                  className="flex items-center bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Cập nhật
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {filteredUsers.some(u => u.status === 'pending_approval') && (
              <div className="bg-white rounded-xl shadow p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center text-gray-700 hover:text-gray-900"
                    >
                      {selectedUsers.length === currentUsers.length ? 
                        <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                      <span className="ml-2">Chọn tất cả</span>
                    </button>
                    <span className="text-gray-600">
                      Đã chọn {selectedUsers.length} người dùng
                    </span>
                  </div>
                  
                  <div className="space-x-3">
                    <button
                      onClick={handleBulkApprove}
                      disabled={selectedUsers.length === 0}
                      className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                        selectedUsers.length > 0
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Duyệt đã chọn
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <select 
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="border rounded-lg px-3 py-2"
                    >
                      <option value="all">📋 Tất cả người dùng</option>
                      <option value="pending_approval">⏳ Chờ duyệt</option>
                      <option value="approved">✅ Đã duyệt</option>
                      <option value="rejected">❌ Đã từ chối</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={loadUsers}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Làm mới
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo email, tên hoặc ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải danh sách người dùng...</p>
                </div>
              ) : currentUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Không có người dùng nào</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                            <input
                              type="checkbox"
                              checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Người dùng
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Online
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phân quyền
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kết quả
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phạt
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={() => toggleSelectUser(user.id)}
                                disabled={user.status !== 'pending_approval'}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{user.fullName || 'Chưa có tên'}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  <span className="inline-flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {user.gender === 'male' ? 'Nam' : 'Nữ'} • {user.birthYear || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              {presenceService.isOnline(presenceData[user.id]) ? (
                                <div className="flex flex-col items-center">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                  </span>
                                  <span className="text-xs text-green-600 mt-1">Online</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="inline-flex rounded-full h-3 w-3 bg-gray-300"></span>
                                  <span className="text-xs text-gray-400 mt-1" title={presenceService.formatLastSeen(presenceData[user.id])}>
                                    {presenceData[user.id] ? presenceService.formatLastSeen(presenceData[user.id]) : 'Offline'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={RoleManager.getRoleBadge(user.role || 'user').className}>
                                {RoleManager.getRoleBadge(user.role || 'user').text}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(user.status)}
                              <div className="mt-2">
                                {getDepositBadge(user)}
                              </div>
                              {user.depositProof && user.depositProof !== 'previous_season' && (
                                <button
                                  onClick={() => toggleDepositImage(user.id)}
                                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  {showDepositImages[user.id] ? 'Ẩn ảnh' : 'Xem ảnh'}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <span className="mr-1">🏃</span>
                                  <span className="text-xs">{user.metrics.runDistance}km</span>
                                  <div className="ml-2 w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500" 
                                      style={{ width: `${user.metrics.runProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <span className="mr-1">🏊</span>
                                  <span className="text-xs">{user.metrics.swimDistance}km</span>
                                  <div className="ml-2 w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500" 
                                      style={{ width: `${user.metrics.swimProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {user.metrics.activityCount} hoạt động
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className={`font-medium ${user.metrics.penalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(user.metrics.penalty)}
                                </div>
                                {user.metrics.runDeficit > 0 && (
                                  <div className="text-xs text-gray-600">
                                    Thiếu chạy: {user.metrics.runDeficit}km
                                  </div>
                                )}
                                {user.metrics.swimDeficit > 0 && (
                                  <div className="text-xs text-gray-600">
                                    Thiếu bơi: {user.metrics.swimDeficit}km
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => viewUserDetails(user)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 flex items-center"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Chi tiết
                                </button>
                                
                                {user.status === 'pending_approval' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(user.id)}
                                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 flex items-center"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Duyệt
                                    </button>
                                    <button
                                      onClick={() => handleReject(user.id)}
                                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 flex items-center"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} của {filteredUsers.length}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg ${currentPage === 1 ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-10 h-10 rounded-lg ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* Details View */
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* User Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <button
                      onClick={() => setViewMode('list')}
                      className="mr-4 text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedUser?.fullName || 'Chưa có tên'}
                    </h2>
                    <div className="ml-4 flex space-x-2">
                      {getStatusBadge(selectedUser?.status)}
                      {getDepositBadge(selectedUser)}
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1">{selectedUser?.email}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {selectedUser?.gender === 'male' ? 'Nam' : 'Nữ'} • {selectedUser?.birthYear || 'N/A'}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Đăng ký: {formatDate(selectedUser?.createdAt)}
                    </span>
                    {selectedUser?.approvedAt && (
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        Duyệt: {formatDate(selectedUser?.approvedAt)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-x-3">
                  {selectedUser?.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedUser.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleReject(selectedUser.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Từ chối
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Stats */}
                <div className="lg:col-span-1 space-y-6">
                  {/* KPIs */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      KPI Mục Tiêu
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Chạy bộ</span>
                          <span className="font-medium">
                            {selectedUser?.metrics?.runDistance || 0} / {config.monthlyTargets[selectedUser?.gender || 'male'].run}km
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${selectedUser?.metrics?.runProgress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Bơi lội</span>
                          <span className="font-medium">
                            {selectedUser?.metrics?.swimDistance || 0} / {config.monthlyTargets[selectedUser?.gender || 'male'].swim}km
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500" 
                            style={{ width: `${selectedUser?.metrics?.swimProgress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Tài Chính
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tiền cọc:</span>
                        <span className={`font-medium ${selectedUser?.depositPaid ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser?.depositPaid ? '✅ Đã nộp 500k' : '❌ Chưa nộp'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tiền phạt:</span>
                        <span className={`font-medium ${selectedUser?.metrics?.penalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(selectedUser?.metrics?.penalty || 0)}
                        </span>
                      </div>
                      {selectedUser?.metrics?.runDeficit > 0 && (
                        <div className="text-sm text-red-600">
                          Thiếu chạy: {selectedUser.metrics.runDeficit}km
                        </div>
                      )}
                      {selectedUser?.metrics?.swimDeficit > 0 && (
                        <div className="text-sm text-red-600">
                          Thiếu bơi: {selectedUser.metrics.swimDeficit}km
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Stats */}
                  {selectedUserStats && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Thống Kê 30 Ngày
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tổng cự ly:</span>
                          <span className="font-medium">{selectedUserStats.totalDistance}km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tổng thời gian:</span>
                          <span className="font-medium">{selectedUserStats.totalTime} giờ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hoạt động hợp lệ:</span>
                          <span className="font-medium text-green-600">{selectedUserStats.validActivities}/{selectedUserActivities.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pace trung bình:</span>
                          <span className="font-medium">{selectedUserStats.averagePace} phút/km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nhịp tim TB:</span>
                          <span className="font-medium">{selectedUserStats.averageHeartRate} bpm</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Monthly Stats */}
                  {selectedUserMonthlyStats.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Theo Tháng
                      </h3>
                      <div className="space-y-3">
                        {selectedUserMonthlyStats.map((month, idx) => (
                          <div key={idx} className="border-l-4 border-blue-500 pl-3">
                            <div className="font-medium text-sm">{month.month}</div>
                            <div className="text-xs text-gray-600">
                              {month.runDistance.toFixed(1)}km chạy • {month.swimDistance.toFixed(1)}km bơi
                            </div>
                            <div className="text-xs text-gray-500">
                              {month.activityCount} hoạt động • {month.validActivities} hợp lệ
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Charts & Activities */}
                <div className="lg:col-span-2 space-y-6">
                  {/* 30-Day Chart */}
                  {selectedUser30DayChart.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                        <LineChart className="w-4 h-4 mr-2" />
                        Biểu Đồ 30 Ngày Gần Đây
                      </h3>
                      <div className="h-48 flex items-end space-x-1">
                        {selectedUser30DayChart.map((day, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-6 rounded-t ${day.hasActivity ? 'bg-blue-500' : 'bg-gray-200'}`}
                              style={{ height: `${Math.min(100, day.totalDistance * 10)}%` }}
                              title={`${day.date}: ${day.totalDistance}km`}
                            ></div>
                            <div className="text-xs text-gray-500 mt-1">
                              {day.day}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-4">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                          <span>Có hoạt động</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-200 rounded mr-1"></div>
                          <span>Không hoạt động</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Tracklogs */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-700 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Tracklogs Gần Đây
                      </h3>
                      <span className="text-sm text-gray-500">
                        {selectedUserActivities.length} hoạt động
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedUserActivities.slice(0, 10).map((activity, idx) => (
                        <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center">
                                <span className="mr-2">
                                  {activity.type === 'Run' ? '🏃' : activity.type === 'Ride' ? '🚴' : '🏊'}
                                </span>
                                <span className="font-medium">{activity.name}</span>
                                <span className="ml-2">{getActivityValidityBadge(activity)}</span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formatDateTime(activity.start_date)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{(activity.distance / 1000).toFixed(2)} km</div>
                              <div className="text-xs text-gray-500">
                                Tính: {activity.countedDistance.toFixed(2)}km
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                            <div className="flex items-center">
                              <Timer className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{Math.floor(activity.moving_time / 60)} phút</span>
                            </div>
                            <div className="flex items-center">
                              <Gauge className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{activity.pace} phút/km</span>
                            </div>
                            <div className="flex items-center">
                              <Heart className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{activity.average_heartrate} bpm</span>
                            </div>
                            <div className="flex items-center">
                              <Target className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{activity.average_speed.toFixed(1)} km/h</span>
                            </div>
                          </div>
                          
                          {activity.quotaExceeded && (
                            <div className="text-xs text-orange-600 mt-2">
                              ⚠️ Vượt quota ngày ({activity.dailyQuota}km) - Chỉ tính {activity.countedDistance}km
                            </div>
                          )}
                          
                          {activity.flagged && (
                            <div className="text-xs text-red-600 mt-2">
                              🚫 Bị flag - Không tính vào KPI
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {selectedUserActivities.length > 10 && (
                      <div className="text-center mt-4">
                        <button className="text-blue-600 text-sm hover:text-blue-800">
                          Xem thêm {selectedUserActivities.length - 10} tracklogs...
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminIntegratedDashboard;
