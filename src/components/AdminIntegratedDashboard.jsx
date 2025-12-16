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
  Footprints, Bike, Bell, Edit, Trash2, Save, X
} from 'lucide-react';
import NotificationManager from './NotificationManager';
import SpecialEventsManager from './SpecialEventsManager';
import { formatDate, formatDateTime, formatMonthYear } from '../utils/formatDate';

function AdminIntegratedDashboard({ limitedMode = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [presenceData, setPresenceData] = useState({}); // Lưu trạng thái online của users
  const [allEventParticipations, setAllEventParticipations] = useState([]); // Tất cả event participations
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'notifications'
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
  const [advancedFilter, setAdvancedFilter] = useState('none'); // Bộ lọc nâng cao
  const [penaltyThreshold, setPenaltyThreshold] = useState(0); // Ngưỡng tiền phạt
  const [inactiveDays, setInactiveDays] = useState(7); // Số ngày không hoạt động
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState({ title: '', content: '', priority: 'normal' });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserActivities, setSelectedUserActivities] = useState([]);
  const [selectedUserMonthlyStats, setSelectedUserMonthlyStats] = useState([]);
  const [selectedUser30DayChart, setSelectedUser30DayChart] = useState([]);
  const [showDepositImages, setShowDepositImages] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'details', or 'edit'
  const [editingUser, setEditingUser] = useState(null); // User đang được edit
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'male',
    birthYear: '',
    status: 'pending_approval',
    depositPaid: false,
    previousSeasonTransfer: false,
    role: 'user',
    isActive: true
  }); // Form data cho edit
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [systemConfig, setSystemConfig] = useState({
    kpiTargets: config.monthlyTargets,
    dailyLimits: config.dailyLimits,
    penalties: config.penalties,
    conversion: config.conversion
  });

  const itemsPerPage = 12;

  useEffect(() => {
    const initializeData = async () => {
      // Load event participations TRƯỚC và lấy kết quả để truyền vào loadUsers
      const participations = await loadAllEventParticipations();
      loadUsers(participations);
      loadPresenceData();
    };
    
    initializeData();
    setConfig(challengeConfig.getConfig());
    
    // Refresh presence data mỗi 30 giây
    const presenceInterval = setInterval(() => {
      loadPresenceData();
    }, 30000);
    
    return () => clearInterval(presenceInterval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allUsers, filter, search, advancedFilter, penaltyThreshold, inactiveDays]);

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

  // Load tất cả event participations
  const loadAllEventParticipations = async () => {
    try {
      const participationsRef = collection(db, 'event_participations');
      const snapshot = await getDocs(participationsRef);
      
      const participations = [];
      snapshot.forEach(docSnap => {
        participations.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      console.log('[Admin] Loaded all event participations:', participations.length);
      setAllEventParticipations(participations);
      return participations; // Trả về để sử dụng trực tiếp
    } catch (error) {
      console.error('Error loading event participations:', error);
      return [];
    }
  };

  const loadUsers = async (eventParticipationsData = null) => {
    setLoading(true);
    
    // Sử dụng dữ liệu truyền vào hoặc state hiện tại
    const participationsToUse = eventParticipationsData || allEventParticipations;
    
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
      const totalPenaltyByMonth = {}; // { 'YYYY-MM': number }
      let totalActivities = 0;
      let totalDistance = 0;
      let totalRunCount = 0;
      let totalSwimCount = 0;
      let totalRideCount = 0;

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
        const metrics = await calculateUserMetrics(user, participationsToUse);
        user.metrics = metrics;

        userList.push(user);

        // Thống kê
        if (user.status === 'pending_approval') pendingCount++;
        else if (user.status === 'approved') approvedCount++;
        else if (user.status === 'rejected') rejectedCount++;
        
        if (user.isActive) activeCount++;
        if (user.depositPaid) totalDeposit += 500000;
        // Aggregate per-month penalties (metrics.allMonthsPenalty.months contains per-month data)
        const m = metrics.allMonthsPenalty;
        if (m && Array.isArray(m.months)) {
          for (const mm of m.months) {
            const key = mm.monthKey || mm.month || '';
            if (!key) continue;
            totalPenaltyByMonth[key] = (totalPenaltyByMonth[key] || 0) + (mm.penalty || 0);
          }
        }
        totalPenalty += m?.total || 0; // Tổng phạt tất cả tháng (fallback)
        totalActivities += metrics.activityCount;
        totalDistance += metrics.totalDistance;
        totalRunCount += metrics.monthRunCount || 0;
        totalSwimCount += metrics.monthSwimCount || 0;
        totalRideCount += metrics.monthRideCount || 0;
      }

      setAllUsers(userList);
      // Build penalty months array sorted by monthKey asc
      const penaltyMonths = Object.keys(totalPenaltyByMonth).sort().map(k => {
        const parts = k.split('-');
        let monthName = k;
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const mIndex = parseInt(parts[1], 10) - 1;
          monthName = formatMonthYear(new Date(y, mIndex, 1));
        }
        return { monthKey: k, monthName, penalty: totalPenaltyByMonth[k] };
      });

      setStats({
        total: userList.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount,
        totalDeposit,
        totalPenalty, // Đây giờ là tổng phạt TẤT CẢ các tháng
        totalPenaltyMonths: penaltyMonths,
        totalActivities,
        totalRunCount,
        totalSwimCount,
        totalRideCount,
        totalDistance: parseFloat(totalDistance.toFixed(1))
      });

    } catch (error) {
      console.error('Error loading users:', error);
      alert('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserMetrics = async (user, participationsData = null) => {
    // Lấy activities THẬT từ Firestore (đã được sync từ Strava)
    const target = config.monthlyTargets[user.gender || 'male'];
    const gender = user.gender || 'male';
    
    // Lấy activities từ user document trong Firestore
    const userActivities = user.strava_activities || [];
    
    // Sử dụng dữ liệu participations truyền vào hoặc từ state
    const participationsToUse = participationsData || allEventParticipations;
    
    // Lấy event participations của user này
    const userEventParticipations = participationsToUse.filter(p => p.userId === user.id);
    
    // Lọc activities trong tháng hiện tại
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter activities cho tháng hiện tại
    const monthActivities = userActivities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
    });

    // Đếm loại hoạt động trong tháng hiện tại (Run/Swim/Ride)
    let monthRunCount = 0;
    let monthSwimCount = 0;
    let monthRideCount = 0;
    monthActivities.forEach(activity => {
      const type = (activity.type || activity.sport_type || '').toLowerCase();
      if (type.includes('run') || type.includes('walk')) monthRunCount++;
      else if (type.includes('swim')) monthSwimCount++;
      else if (type.includes('ride') || type.includes('bike')) monthRideCount++;
    });
    
    // Xử lý activities với quota và validation (truyền thêm eventParticipations)
    const monthResult = challengeConfig.processActivitiesWithQuota(monthActivities, gender, userEventParticipations);
    const { summary, activities: processedActivities } = monthResult;
    
    // Lấy activities 30 ngày gần đây
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thirtyDayActivities = userActivities
      .filter(activity => new Date(activity.start_date) >= thirtyDaysAgo)
      .map(activity => {
        const distanceKm = (activity.distance || 0) / 1000;
        const type = (activity.type || activity.sport_type || '').toLowerCase();
        const validation = challengeConfig.validateActivity(activity);
        return {
          ...activity,
          distanceKm,
          validation,
          activityType: type.includes('run') || type.includes('walk') ? 'Run' : 
                       type.includes('swim') ? 'Swim' : 
                       type.includes('ride') || type.includes('bike') ? 'Ride' : 'Other'
        };
      });
    
    // Tính streak (số ngày liên tiếp có hoạt động)
    const streak = calculateStreak(userActivities);
    
    // Tính monthly stats từ activities thật
    const monthlyStats = calculateMonthlyStatsFromReal(userActivities);
    
    // Tính tổng phạt tất cả các tháng từ đầu thử thách
    const allMonthsPenalty = calculateAllMonthsPenalty(userActivities, gender, userEventParticipations);
    
    return {
      runDistance: summary.totalRunCounted,
      swimDistance: summary.totalSwimCounted,
      totalDistance: parseFloat((summary.totalRunCounted + summary.totalSwimCounted).toFixed(1)),
      activityCount: monthActivities.length,
      monthRunCount,
      monthSwimCount,
      monthRideCount,
      runProgress: summary.runProgress,
      swimProgress: summary.swimProgress,
      penalty: summary.totalPenalty,
      runDeficit: summary.finalRunDeficit,
      swimDeficit: summary.finalSwimDeficit,
      penaltyDetails: summary, // Chi tiết về quy đổi và phạt
      processedActivities, // Activities đã xử lý với quota/validation
      streak,
      thirtyDayActivities,
      monthlyStats,
      thirtyDayChart: generateThirtyDayChartFromReal(thirtyDayActivities),
      allMonthsPenalty // Tổng phạt tất cả tháng
    };
  };
  
  // Tính tổng phạt tất cả các tháng từ đầu thử thách
  const calculateAllMonthsPenalty = (userActivities, gender, userEventParticipations) => {
    const challengeStartDate = new Date('2025-11-01');
    const now = new Date();
    const months = [];
    
    // Tạo danh sách các tháng từ đầu thử thách đến hiện tại
    let currentDate = new Date(challengeStartDate);
    while (currentDate <= now) {
      months.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    let totalPenaltyAllMonths = 0;
    const monthlyDetails = [];
    
    for (const { year, month } of months) {
      // Filter activities cho tháng này
      const monthActivities = userActivities.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate.getMonth() === month && activityDate.getFullYear() === year;
      });
      
      // Xử lý activities với quota và validation
      const monthResult = challengeConfig.processActivitiesWithQuota(monthActivities, gender, userEventParticipations);
      const { summary } = monthResult;
      
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      monthlyDetails.push({
        monthKey,
        monthName: formatMonthYear(new Date(year, month, 1)),
        runDistance: summary.totalRunCounted,
        swimDistance: summary.totalSwimCounted,
        runDeficit: summary.finalRunDeficit,
        swimDeficit: summary.finalSwimDeficit,
        penalty: summary.totalPenalty
      });
      
      totalPenaltyAllMonths += summary.totalPenalty;
    }
    
    return {
      total: totalPenaltyAllMonths,
      months: monthlyDetails
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
        date: formatDate(date),
        run: parseFloat(runKm.toFixed(1)),
        swim: parseFloat(swimKm.toFixed(1)),
        total: parseFloat((runKm + swimKm).toFixed(1))
      });
    }
    
    return chartData;
  };

  const applyFilters = () => {
    let filtered = [...allUsers];
    
    // Lọc theo trạng thái cơ bản
    if (filter !== 'all') {
      filtered = filtered.filter(user => user.status === filter);
    }
    
    // Lọc theo bộ lọc nâng cao
    if (advancedFilter !== 'none') {
      const now = new Date();
      
      switch (advancedFilter) {
        case 'has_penalty':
          // Có tiền phạt tháng này
          filtered = filtered.filter(user => (user.metrics?.penalty || 0) > 0);
          break;
          
        case 'penalty_above':
          // Tiền phạt > ngưỡng
          filtered = filtered.filter(user => (user.metrics?.penalty || 0) >= penaltyThreshold);
          break;
          
        case 'no_strava':
          // Chưa kết nối Strava
          filtered = filtered.filter(user => !user.stravaConnected && !user.strava_athlete_id);
          break;
          
        case 'inactive':
          // Không có hoạt động trong X ngày
          filtered = filtered.filter(user => {
            const activities = user.strava_activities || [];
            if (activities.length === 0) return true;
            
            const lastActivity = activities.reduce((latest, act) => {
              const actDate = new Date(act.start_date);
              return actDate > latest ? actDate : latest;
            }, new Date(0));
            
            const daysSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
            return daysSinceLastActivity >= inactiveDays;
          });
          break;
          
        case 'no_deposit':
          // Chưa nộp tiền cọc
          filtered = filtered.filter(user => !user.depositPaid);
          break;
          
        case 'low_kpi':
          // KPI thấp (dưới 50%)
          filtered = filtered.filter(user => {
            const runProgress = user.metrics?.runProgress || 0;
            const swimProgress = user.metrics?.swimProgress || 0;
            return runProgress < 50 || swimProgress < 50;
          });
          break;
          
        case 'critical_kpi':
          // KPI rất thấp (dưới 30%)
          filtered = filtered.filter(user => {
            const runProgress = user.metrics?.runProgress || 0;
            const swimProgress = user.metrics?.swimProgress || 0;
            return runProgress < 30 || swimProgress < 30;
          });
          break;
          
        case 'new_this_week':
          // Mới đăng ký trong tuần này
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(user => user.createdAt >= weekAgo);
          break;
          
        case 'new_this_month':
          // Mới đăng ký trong tháng này
          filtered = filtered.filter(user => {
            return user.createdAt.getMonth() === now.getMonth() && 
                   user.createdAt.getFullYear() === now.getFullYear();
          });
          break;
          
        case 'no_activity_this_month':
          // Chưa có hoạt động nào trong tháng này
          filtered = filtered.filter(user => {
            const activities = user.strava_activities || [];
            const monthActivities = activities.filter(act => {
              const actDate = new Date(act.start_date);
              return actDate.getMonth() === now.getMonth() && actDate.getFullYear() === now.getFullYear();
            });
            return monthActivities.length === 0;
          });
          break;
          
        case 'approved_no_strava':
          // Đã được duyệt nhưng chưa kết nối Strava
          filtered = filtered.filter(user => 
            user.status === 'approved' && !user.stravaConnected && !user.strava_athlete_id
          );
          break;
      }
    }
    
    // Lọc theo từ khóa tìm kiếm
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

  // ========== EDIT USER ==========
  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      gender: user.gender || 'male',
      birthYear: user.birthYear || '',
      status: user.status || 'pending_approval',
      depositPaid: user.depositPaid || false,
      previousSeasonTransfer: user.previousSeasonTransfer || false,
      role: user.role || 'user',
      isActive: user.isActive !== false
    });
    setViewMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    try {
      const updateData = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        gender: editForm.gender,
        birthYear: editForm.birthYear ? parseInt(editForm.birthYear) : null,
        status: editForm.status,
        depositPaid: editForm.depositPaid,
        previousSeasonTransfer: editForm.previousSeasonTransfer,
        role: editForm.role,
        isActive: editForm.isActive,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email || 'admin'
      };

      await updateDoc(doc(db, 'users', editingUser.id), updateData);
      
      alert('✅ Đã cập nhật thông tin người dùng!');
      setEditingUser(null);
      setViewMode('list');
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('❌ Lỗi khi cập nhật: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      fullName: '',
      email: '',
      phone: '',
      gender: 'male',
      birthYear: '',
      status: 'pending_approval',
      depositPaid: false,
      previousSeasonTransfer: false,
      role: 'user',
      isActive: true
    });
    setViewMode('list');
  };

  // ========== BULK MESSAGE ==========
  const handleSendBulkMessage = async () => {
    if (!bulkMessage.title.trim() || !bulkMessage.content.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung tin nhắn');
      return;
    }
    
    // Lấy danh sách user IDs để gửi
    const targetUserIds = selectedUsers.length > 0 
      ? selectedUsers 
      : filteredUsers.map(u => u.id);
    
    if (targetUserIds.length === 0) {
      alert('Không có người dùng nào để gửi tin nhắn');
      return;
    }
    
    const targetUserNames = targetUserIds.map(id => {
      const user = allUsers.find(u => u.id === id);
      return user?.fullName || user?.email || id;
    });
    
    if (!window.confirm(
      `Xác nhận gửi tin nhắn đến ${targetUserIds.length} người dùng?\n\n` +
      `Tiêu đề: ${bulkMessage.title}\n` +
      `Độ ưu tiên: ${bulkMessage.priority === 'high' ? 'Cao' : bulkMessage.priority === 'urgent' ? 'Khẩn cấp' : 'Bình thường'}`
    )) {
      return;
    }
    
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      
      // Tạo notification mới
      const notificationData = {
        title: bulkMessage.title,
        message: bulkMessage.content,
        priority: bulkMessage.priority,
        type: 'bulk_message',
        targetUserIds: targetUserIds,
        targetType: 'selected', // 'all' | 'selected'
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'admin',
        createdByUID: auth.currentUser?.uid,
        isActive: true,
        readBy: [],
        filterCriteria: advancedFilter !== 'none' ? {
          advancedFilter,
          penaltyThreshold: advancedFilter === 'penalty_above' ? penaltyThreshold : null,
          inactiveDays: advancedFilter === 'inactive' ? inactiveDays : null,
          basicFilter: filter,
          searchTerm: search || null
        } : null
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
      
      alert(`✅ Đã gửi tin nhắn đến ${targetUserIds.length} người dùng!`);
      setShowBulkMessageModal(false);
      setBulkMessage({ title: '', content: '', priority: 'normal' });
    } catch (error) {
      console.error('Error sending bulk message:', error);
      alert('❌ Lỗi khi gửi tin nhắn: ' + error.message);
    }
  };

  const getAdvancedFilterLabel = () => {
    switch (advancedFilter) {
      case 'has_penalty': return '💰 Có tiền phạt';
      case 'penalty_above': return `💰 Phạt ≥ ${penaltyThreshold.toLocaleString()}đ`;
      case 'no_strava': return '🔗 Chưa kết nối Strava';
      case 'inactive': return `😴 Không HĐ ${inactiveDays} ngày`;
      case 'no_deposit': return '💳 Chưa nộp cọc';
      case 'low_kpi': return '📉 KPI thấp (<50%)';
      case 'critical_kpi': return '🚨 KPI rất thấp (<30%)';
      case 'new_this_week': return '🆕 Mới tuần này';
      case 'new_this_month': return '🆕 Mới tháng này';
      case 'no_activity_this_month': return '📭 Chưa HĐ tháng này';
      case 'approved_no_strava': return '⚠️ Đã duyệt, chưa Strava';
      default: return null;
    }
  };

  // ========== DELETE USER ==========
  const handleDeleteUser = async (userId, userName) => {
    const confirmText = prompt(
      `⚠️ CẢNH BÁO: Hành động này không thể hoàn tác!\n\n` +
      `Để xóa người dùng "${userName}", hãy nhập chính xác: DELETE`
    );
    
    if (confirmText !== 'DELETE') {
      if (confirmText !== null) {
        alert('❌ Nhập sai. Người dùng KHÔNG bị xóa.');
      }
      return;
    }
    
    try {
      // Xóa user document
      await deleteDoc(doc(db, 'users', userId));
      
      // Xóa presence data nếu có
      try {
        await deleteDoc(doc(db, 'presence', userId));
      } catch (e) {
        // Ignore if presence doesn't exist
      }
      
      alert('✅ Đã xóa người dùng thành công!');
      loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Lỗi khi xóa người dùng: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng');
      return;
    }
    
    const confirmText = prompt(
      `⚠️ CẢNH BÁO: Sẽ xóa ${selectedUsers.length} người dùng!\n\n` +
      `Hành động này không thể hoàn tác.\n` +
      `Để xác nhận, hãy nhập: DELETE ${selectedUsers.length}`
    );
    
    if (confirmText !== `DELETE ${selectedUsers.length}`) {
      if (confirmText !== null) {
        alert('❌ Nhập sai. KHÔNG có người dùng nào bị xóa.');
      }
      return;
    }
    
    try {
      const deletePromises = selectedUsers.map(userId => 
        deleteDoc(doc(db, 'users', userId))
      );
      
      await Promise.all(deletePromises);
      
      alert(`✅ Đã xóa ${selectedUsers.length} người dùng!`);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      alert('❌ Lỗi khi xóa nhiều người dùng: ' + error.message);
    }
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    
    // Lấy activities trực tiếp từ user document
    const userActivities = user.strava_activities || [];
    const gender = user.gender || 'male';
    
    // Lấy event participations của user này
    const userEventParticipations = allEventParticipations.filter(p => p.userId === user.id);
    
    // Xử lý activities với quota và validation cho tháng hiện tại
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter activities cho tháng hiện tại
    const monthActivities = userActivities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
    });
    
    // Xử lý với quota và validation (truyền thêm eventParticipations)
    const monthResult = challengeConfig.processActivitiesWithQuota(monthActivities, gender, userEventParticipations);
    
    // Lưu processed activities để hiển thị (tất cả activities của tháng hiện tại)
    setSelectedUserActivities(monthResult.activities || []);
    
    // Cập nhật metrics cho selectedUser với dữ liệu mới tính
    const updatedUser = {
      ...user,
      metrics: {
        ...user.metrics,
        runDistance: monthResult.summary.totalRunCounted,
        swimDistance: monthResult.summary.totalSwimCounted,
        runProgress: monthResult.summary.runProgress,
        swimProgress: monthResult.summary.swimProgress,
        penalty: monthResult.summary.totalPenalty,
        runDeficit: monthResult.summary.finalRunDeficit,
        swimDeficit: monthResult.summary.finalSwimDeficit,
        penaltyDetails: monthResult.summary,
        activityCount: monthActivities.length
      }
    };
    setSelectedUser(updatedUser);
    
    // Tính monthly stats từ tất cả activities
    setSelectedUserMonthlyStats(calculateMonthlyStatsFromReal(userActivities));
    
    // Tạo 30-day chart
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DayActivities = userActivities.filter(a => new Date(a.start_date) >= thirtyDaysAgo);
    setSelectedUser30DayChart(generateThirtyDayChartFromReal(last30DayActivities));
    
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

  // Use centralized helpers for consistent DD/MM/YYYY formatting

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
    if (!activities || activities.length === 0) return null;
    
    const totalDistance = activities.reduce((sum, act) => sum + ((act.distance || act.distanceKm * 1000 || 0) / 1000), 0);
    const totalTime = activities.reduce((sum, act) => sum + (act.moving_time || 0), 0);
    const validActivities = activities.filter(act => act.isValid !== false).length;
    const flaggedActivities = activities.filter(act => act.flagged).length;
    const quotaExceeded = activities.filter(act => act.quotaExceeded).length;
    
    // Tính pace trung bình (chỉ cho activities có pace)
    const activitiesWithPace = activities.filter(act => act.pace || (act.moving_time && act.distance));
    let averagePace = 0;
    if (activitiesWithPace.length > 0) {
      const totalPace = activitiesWithPace.reduce((sum, act) => {
        if (act.pace) return sum + act.pace;
        // Tính pace từ moving_time và distance (phút/km)
        const distKm = (act.distance || 0) / 1000;
        if (distKm > 0) return sum + (act.moving_time / 60) / distKm;
        return sum;
      }, 0);
      averagePace = parseFloat((totalPace / activitiesWithPace.length).toFixed(1));
    }
    
    // Tính nhịp tim trung bình (chỉ cho activities có heartrate)
    const activitiesWithHR = activities.filter(act => act.average_heartrate);
    let averageHeartRate = 0;
    if (activitiesWithHR.length > 0) {
      averageHeartRate = Math.round(
        activitiesWithHR.reduce((sum, act) => sum + act.average_heartrate, 0) / activitiesWithHR.length
      );
    }
    
    return {
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      totalTime: Math.round(totalTime / 3600 * 10) / 10, // hours
      validActivities,
      flaggedActivities,
      quotaExceeded,
      averagePace,
      averageHeartRate
    };
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = getCurrentPageUsers();
  const selectedUserStats = selectedUserActivities.length > 0 ? 
    calculateActivityStats(selectedUserActivities) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 flex items-center">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                <span className="hidden sm:inline">Bảng Điều Khiển Quản Trị Tích Hợp</span>
                <span className="sm:hidden">Admin Dashboard</span>
              </h1>
              <p className="opacity-90 text-sm sm:text-base hidden sm:block">Quản lý người dùng, duyệt đăng ký & theo dõi tracklog</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <div className="text-xs sm:text-sm opacity-90">Tổng người dùng</div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 sm:mt-6">
            <div className="flex items-center gap-2 sm:space-x-4 overflow-x-auto">
              {viewMode === 'details' ? (
                <button
                  onClick={() => setViewMode('list')}
                  className="flex items-center text-white hover:text-gray-200 whitespace-nowrap text-sm sm:text-base"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Quay lại danh sách</span>
                  <span className="sm:hidden">Quay lại</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-white hover:text-gray-200 whitespace-nowrap text-sm sm:text-base"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Dashboard cá nhân</span>
                    <span className="sm:hidden">Dashboard</span>
                  </button>
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center text-white hover:text-gray-200 whitespace-nowrap text-sm sm:text-base"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Cấu hình hệ thống</span>
                    <span className="sm:hidden">Cấu hình</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:space-x-4">
              <button
                onClick={loadUsers}
                className="flex items-center bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-white/30 text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => { if (window.confirm('Bạn có chắc muốn đăng xuất không?')) auth.signOut(); }}
                className="flex items-center bg-white text-purple-600 px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-gray-100 text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 sm:space-x-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
          {!limitedMode && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'users'
                  ? 'bg-white text-purple-600 shadow'
                  : 'bg-white/50 text-gray-600 hover:bg-white/80'
              }`}
            >
              <Users className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Quản lý người dùng</span>
              <span className="sm:hidden">Người dùng</span>
            </button>
          )}
          {!limitedMode && (
            <>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'notifications'
                    ? 'bg-white text-purple-600 shadow'
                    : 'bg-white/50 text-gray-600 hover:bg-white/80'
                }`}
              >
                <Bell className="w-4 h-4 mr-1 sm:mr-2" />
                Thông báo
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm sm:text-base ${
                  activeTab === 'events'
                    ? 'bg-white text-purple-600 shadow'
                    : 'bg-white/50 text-gray-600 hover:bg-white/80'
                }`}
              >
                <Star className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sự kiện đặc biệt</span>
                <span className="sm:hidden">Sự kiện</span>
              </button>
            </>
          )}
        </div>

        {/* Notification Manager Tab */}
        {activeTab === 'notifications' && !limitedMode && (
          <NotificationManager currentUser={auth.currentUser} />
        )}

        {/* Special Events Tab */}
        {activeTab === 'events' && !limitedMode && (
          <SpecialEventsManager />
        )}

        {/* Main Content - List View */}
        {activeTab === 'users' && viewMode === 'list' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {!limitedMode && (
                <>
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 sm:mr-4">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold">{stats.pending + stats.approved + stats.rejected}</div>
                        <div className="text-gray-600 text-xs sm:text-sm">Tổng trạng thái người dùng</div>
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="inline-block mr-3">⏳ Chờ duyệt: <strong>{stats.pending}</strong></span>
                          <span className="inline-block mr-3">✅ Đã duyệt: <strong>{stats.approved}</strong></span>
                          <span className="inline-block">❌ Đã từ chối: <strong>{stats.rejected}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-2 sm:mr-4">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl font-bold">{stats.totalActivities}</div>
                        <div className="text-gray-600 text-xs sm:text-sm">Hoạt động</div>
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="inline-block mr-3">🏊 Bơi: <strong>{stats.totalSwimCount || 0}</strong></span>
                          <span className="inline-block mr-3">🚴 Đạp: <strong>{stats.totalRideCount || 0}</strong></span>
                          <span className="inline-block">🏃 Chạy: <strong>{stats.totalRunCount || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card tổng phạt: season total + breakdown per month */}
                  <div className="bg-white rounded-xl p-3 sm:p-4 shadow col-span-1">
                    <div className="flex items-start">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center mr-2 sm:mr-4">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats.totalPenalty || 0)}</div>
                        <div className="text-gray-600 text-xs sm:text-sm">Tổng phạt mùa giải</div>
                        <div className="mt-3 text-sm text-gray-700">
                          {stats.totalPenaltyMonths && stats.totalPenaltyMonths.length > 0 ? (
                            <ul className="space-y-2">
                              {stats.totalPenaltyMonths.map(pm => (
                                <li key={pm.monthKey} className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">{pm.monthName}</span>
                                  <span className={`font-medium ${pm.penalty > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(pm.penalty)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-gray-500">Không có dữ liệu phạt theo tháng</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              {/* Row 1: Basic filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 flex-wrap gap-2">
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
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center px-3 py-2 rounded-lg border ${
                      advancedFilter !== 'none' 
                        ? 'bg-purple-100 border-purple-300 text-purple-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    {advancedFilter !== 'none' ? getAdvancedFilterLabel() : 'Lọc nâng cao'}
                    {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </button>
                  
                  <button
                    onClick={loadUsers}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Làm mới
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
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
              
              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <button
                      onClick={() => setAdvancedFilter(advancedFilter === 'has_penalty' ? 'none' : 'has_penalty')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        advancedFilter === 'has_penalty' 
                          ? 'bg-red-100 text-red-700 border-2 border-red-400' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      💰 Có tiền phạt
                    </button>
                    
                    
                    <button
                      onClick={() => setAdvancedFilter(advancedFilter === 'no_deposit' ? 'none' : 'no_deposit')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        advancedFilter === 'no_deposit' 
                          ? 'bg-pink-100 text-pink-700 border-2 border-pink-400' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      💳 Chưa nộp cọc
                    </button>
                    
                    <button
                      onClick={() => setAdvancedFilter(advancedFilter === 'low_kpi' ? 'none' : 'low_kpi')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        advancedFilter === 'low_kpi' 
                          ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📉 KPI &lt;50%
                    </button>
                    
                    <button
                      onClick={() => setAdvancedFilter(advancedFilter === 'critical_kpi' ? 'none' : 'critical_kpi')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        advancedFilter === 'critical_kpi' 
                          ? 'bg-red-100 text-red-700 border-2 border-red-400' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🚨 KPI &lt;30%
                    </button>
                    
                    <button
                      onClick={() => setAdvancedFilter(advancedFilter === 'no_activity_this_month' ? 'none' : 'no_activity_this_month')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        advancedFilter === 'no_activity_this_month' 
                          ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📭 Chưa HĐ tháng này
                    </button>
                    
                    {/* removed: Chưa Strava, Duyệt chưa Strava, Mới tuần này, Mới tháng này */}
                  </div>
                  
                  {/* Custom thresholds */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Phạt ≥</label>
                      <input
                        type="number"
                        value={penaltyThreshold}
                        onChange={(e) => setPenaltyThreshold(parseInt(e.target.value) || 0)}
                        className="w-32 border rounded-lg px-3 py-1 text-sm"
                        placeholder="Số tiền"
                      />
                      <span className="text-sm text-gray-500">đ</span>
                      <button
                        onClick={() => setAdvancedFilter(advancedFilter === 'penalty_above' ? 'none' : 'penalty_above')}
                        className={`px-3 py-1 rounded text-sm ${
                          advancedFilter === 'penalty_above' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Lọc
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Không HĐ</label>
                      <input
                        type="number"
                        value={inactiveDays}
                        onChange={(e) => setInactiveDays(parseInt(e.target.value) || 7)}
                        className="w-20 border rounded-lg px-3 py-1 text-sm"
                        min="1"
                      />
                      <span className="text-sm text-gray-500">ngày</span>
                      <button
                        onClick={() => setAdvancedFilter(advancedFilter === 'inactive' ? 'none' : 'inactive')}
                        className={`px-3 py-1 rounded text-sm ${
                          advancedFilter === 'inactive' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Lọc
                      </button>
                    </div>
                    
                    {advancedFilter !== 'none' && (
                      <button
                        onClick={() => setAdvancedFilter('none')}
                        className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                      >
                        ✕ Xóa bộ lọc nâng cao
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Filter Result & Bulk Message */}
              {(filteredUsers.length > 0 && filteredUsers.length < allUsers.length) && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600">
                      Đang hiển thị <strong className="text-purple-600">{filteredUsers.length}</strong> / {allUsers.length} người dùng
                    </span>
                    {advancedFilter !== 'none' && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {getAdvancedFilterLabel()}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setBulkMessage({ 
                        title: '', 
                        content: '', 
                        priority: 'normal' 
                      });
                      setShowBulkMessageModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Gửi tin nhắn ({selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length} người)
                  </button>
                </div>
              )}
            </div>

            {/* Users List - Mobile Friendly */}
            <div className="bg-gray-50 rounded-xl shadow overflow-hidden p-4">
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
                  {/* Mobile Card View */}
                  <div className="space-y-4">
                    {currentUsers.map((user, idx) => (
                      <div key={user.id} className={`p-4 transition-colors mb-0 rounded-lg border bg-white border-gray-300 shadow-sm hover:shadow-md`}>
                        {/* Header: Avatar + Name + Checkbox */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            disabled={user.status !== 'pending_approval'}
                            className="mt-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {user.strava_athlete?.profile || user.strava_athlete?.profile_medium ? (
                              <img
                                src={user.strava_athlete.profile_medium || user.strava_athlete.profile}
                                alt={user.fullName || 'Avatar'}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.email || 'U')}&background=random&size=48`;
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-gray-900 truncate">{user.fullName || 'Chưa có tên'}</h3>
                              <span className={RoleManager.getRoleBadge(user.role || 'user').className + ' text-xs flex-shrink-0'}>
                                {RoleManager.getRoleBadge(user.role || 'user').text}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">
                                {user.gender === 'male' ? '👨 Nam' : '👩 Nữ'} • {user.birthYear || 'N/A'}
                              </span>
                              {getStatusBadge(user.status)}
                              {getDepositBadge(user)}
                            </div>
                          </div>
                        </div>
                        
                        {/* KPI Progress */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 rounded-lg p-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>🏃 Chạy</span>
                              <span className="font-medium">{user.metrics.runDistance}km</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all" 
                                style={{ width: `${Math.min(100, user.metrics.runProgress)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-blue-600 mt-0.5">{user.metrics.runProgress}%</div>
                          </div>
                          
                          <div className="bg-teal-50 rounded-lg p-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>🏊 Bơi</span>
                              <span className="font-medium">{user.metrics.swimDistance}km</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-teal-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-teal-500 transition-all" 
                                style={{ width: `${Math.min(100, user.metrics.swimProgress)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-teal-600 mt-0.5">{user.metrics.swimProgress}%</div>
                          </div>
                        </div>
                        
                        {/* Penalty & Activity Count */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{user.metrics.activityCount} hoạt động tháng này</span>
                          </div>
                          
                          {/* Tổng phạt tất cả các tháng */}
                          {user.metrics.allMonthsPenalty && (
                            <div className={`p-2 rounded-lg ${user.metrics.allMonthsPenalty.total > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Tổng phạt ({user.metrics.allMonthsPenalty.months?.length || 0} tháng):</span>
                                <span className={`font-bold ${user.metrics.allMonthsPenalty.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {user.metrics.allMonthsPenalty.total > 0 ? formatCurrency(user.metrics.allMonthsPenalty.total) : '✓ 0đ'}
                                </span>
                              </div>
                              
                              {/* Chi tiết từng tháng */}
                              {user.metrics.allMonthsPenalty.months && user.metrics.allMonthsPenalty.months.length > 0 && (
                                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                  {user.metrics.allMonthsPenalty.months.map((m, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{m.monthName || (m.monthKey ? formatMonthYear(new Date(m.monthKey + '-01')) : m.monthKey)}:</span>
                                      <span className={m.penalty > 0 ? 'text-red-500' : 'text-green-500'}>
                                        {m.penalty > 0 ? formatCurrency(m.penalty) : '✓'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Deficit info - Số km thiếu SAU quy đổi tháng hiện tại */}
                        {(user.metrics.runDeficit > 0 || user.metrics.swimDeficit > 0) && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-xs font-medium text-orange-700 mb-1">⚠️ Thiếu KPI tháng này (sau quy đổi):</div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {user.metrics.runDeficit > 0 && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  🏃 Thiếu chạy: <strong>{user.metrics.runDeficit}km</strong>
                                </span>
                              )}
                              {user.metrics.swimDeficit > 0 && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  🏊 Thiếu bơi: <strong>{user.metrics.swimDeficit}km</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Deposit proof */}
                        {user.depositProof && user.depositProof !== 'previous_season' && (
                          <button
                            onClick={() => toggleDepositImage(user.id)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            {showDepositImages[user.id] ? 'Ẩn ảnh cọc' : 'Xem ảnh cọc'}
                          </button>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => viewUserDetails(user)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Chi tiết
                          </button>
                          
                          { !limitedMode && (
                            <>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center justify-center"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Sửa
                              </button>

                              {user.status === 'pending_approval' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(user.id)}
                                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center justify-center"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleReject(user.id)}
                                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center justify-center"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Từ chối
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteUser(user.id, user.fullName || user.email)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
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
        ) : activeTab === 'users' && viewMode === 'details' ? (
          /* Details View */
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* User Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => setViewMode('list')}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Avatar */}
                  <div className="flex-shrink-0 mr-4">
                    {selectedUser?.strava_athlete?.profile || selectedUser?.strava_athlete?.profile_medium ? (
                      <img
                        src={selectedUser.strava_athlete.profile_medium || selectedUser.strava_athlete.profile}
                        alt={selectedUser?.fullName || 'Avatar'}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser?.fullName || selectedUser?.email || 'U')}&background=random&size=64`;
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                        {(selectedUser?.fullName || selectedUser?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center">
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
                        <span className={`font-medium ${(selectedUser?.metrics?.penalty || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(selectedUser?.metrics?.penalty || 0)}
                        </span>
                      </div>
                      
                      {/* Chi tiết quy đổi */}
                      {selectedUser?.metrics?.penaltyDetails && (
                        <>
                          {selectedUser.metrics.penaltyDetails.conversion?.runFromSwim > 0 && (
                            <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                              🔄 Quy đổi {selectedUser.metrics.penaltyDetails.conversion.swimSurplusUsed?.toFixed(1)}km bơi dư → {selectedUser.metrics.penaltyDetails.conversion.runFromSwim?.toFixed(1)}km chạy
                            </div>
                          )}
                          {selectedUser.metrics.penaltyDetails.conversion?.swimFromRun > 0 && (
                            <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                              🔄 Quy đổi {selectedUser.metrics.penaltyDetails.conversion.runSurplusUsed?.toFixed(1)}km chạy dư → {selectedUser.metrics.penaltyDetails.conversion.swimFromRun?.toFixed(1)}km bơi
                            </div>
                          )}
                        </>
                      )}
                      
                      {(selectedUser?.metrics?.runDeficit || 0) > 0 && (
                        <div className="text-sm text-red-600">
                          ⚠️ Thiếu chạy: {selectedUser.metrics.runDeficit}km (sau quy đổi)
                        </div>
                      )}
                      {(selectedUser?.metrics?.swimDeficit || 0) > 0 && (
                        <div className="text-sm text-red-600">
                          ⚠️ Thiếu bơi: {selectedUser.metrics.swimDeficit}km (sau quy đổi)
                        </div>
                      )}
                      {(selectedUser?.metrics?.runDeficit || 0) === 0 && (selectedUser?.metrics?.swimDeficit || 0) === 0 && (
                        <div className="text-sm text-green-600">
                          ✅ Đủ KPI tháng này!
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

                  {/* Recent Tracklogs - Giống như Dashboard */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-700 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Tracklogs Tháng Hiện Tại
                      </h3>
                      <span className="text-sm text-gray-500">
                        {selectedUserActivities.length} hoạt động
                      </span>
                    </div>
                    
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {selectedUserActivities.map((activity, idx) => {
                        // Lấy validation data
                        const v = activity.validation || {};
                        const startDate = new Date(activity.start_date);
                        const startTimeStr = startDate.toLocaleString('vi-VN', { hour12: false });
                        const movingTime = activity.moving_time || 0;
                        const totalTimeStr = `${Math.floor(movingTime/60)}:${(movingTime%60).toString().padStart(2,'0')}`;
                        const distanceKm = activity.distance ? activity.distance/1000 : 0;
                        const type = (activity.type || activity.sport_type || '').toLowerCase();
                        
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
                        let icon, borderColor;
                        if (v.isValid === false) {
                          borderColor = 'border-red-300 bg-red-50';
                        } else if (v.quotaExceeded) {
                          borderColor = 'border-orange-300 bg-orange-50';
                        } else {
                          borderColor = 'border-gray-200 hover:bg-gray-50';
                        }
                        
                        if (type.includes('run')) {
                          icon = '🏃‍♂️';
                        } else if (type.includes('swim')) {
                          icon = '🏊‍♂️';
                        } else if (type.includes('ride') || type.includes('bike')) {
                          icon = '🚴';
                        } else {
                          icon = '🏃';
                        }
                        
                        return (
                          <div key={activity.id || idx} className={`flex flex-col p-4 border rounded-lg ${borderColor}`}>
                            {/* Main info row */}
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              <div className="text-2xl">{icon}</div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{activity.name || 'Không có tên'}</h4>
                                <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1 gap-x-3 gap-y-1">
                                  <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{startTimeStr}</span>
                                  <span>•</span>
                                  <span className="flex items-center"><Timer className="w-3 h-3 mr-1" />{totalTimeStr} phút</span>
                                  {paceStr && <><span>•</span><span>Pace: {paceStr}</span></>}
                                  {(v.avgSpeed || 0) > 0 && <><span>•</span><span>TB: {v.avgSpeed} km/h</span></>}
                                  {avgHr && <><span>•</span><span>HR: {avgHr}</span></>}
                                </div>
                              </div>
                              
                              {/* Distance info */}
                              <div className="text-right min-w-[120px]">
                                <div className="font-bold text-lg">{distanceKm.toFixed(2)} km</div>
                                {v.countedDistance !== undefined && Math.abs(v.countedDistance - distanceKm) > 0.01 && (
                                  <div className={`text-sm ${v.countedDistance < distanceKm ? 'text-orange-600' : 'text-green-600'}`}>
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
                              {activity.isEventActivity && (
                                <div className="flex items-center bg-purple-100 text-purple-700 font-medium p-2 rounded-lg border border-purple-300">
                                  <span className="mr-2 text-lg">🎉</span>
                                  <span>
                                    {activity.eventInfo?.eventName 
                                      ? `Sự kiện: ${activity.eventInfo.eventName}` 
                                      : 'Sự kiện đặc biệt'
                                    } - <strong>Tính FULL {v.countedDistance?.toFixed(2) || distanceKm.toFixed(2)} km</strong> (không giới hạn quota ngày)
                                  </span>
                                </div>
                              )}
                              
                              {/* Quota info - chỉ hiện nếu không phải event activity */}
                              {v.dailyQuota && !activity.isEventActivity && (
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
                              {v.isValid !== undefined && (
                                v.isValid ? (
                                  <div className="flex items-center text-green-600">
                                    <span className="mr-2">✅</span>
                                    <span>Hợp lệ - Tính vào KPI</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-red-600">
                                    <span className="mr-2">🚫</span>
                                    <span>Không hợp lệ - Không tính vào KPI</span>
                                  </div>
                                )
                              )}
                              
                              {/* Issues list */}
                              {v.issues && v.issues.length > 0 && (
                                <div className="mt-2 p-2 bg-yellow-50 rounded text-yellow-800">
                                  {v.issues.map((issue, i) => (
                                    <div key={i} className="flex items-start">
                                      <span>{issue}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {selectedUserActivities.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Chưa có hoạt động trong tháng này</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' && viewMode === 'edit' ? (
          /* Edit User View */
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={handleCancelEdit}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Chỉnh sửa: {editingUser?.fullName || editingUser?.email}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Họ tên */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giới tính
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>

                  {/* Birth Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Năm sinh
                    </label>
                    <input
                      type="number"
                      min="1950"
                      max={new Date().getFullYear()}
                      value={editForm.birthYear}
                      onChange={(e) => setEditForm({ ...editForm, birthYear: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trạng thái
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending_approval">Chờ duyệt</option>
                      <option value="approved">Đã duyệt</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </div>

                  {/* Deposit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Đặt cọc
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.depositPaid}
                          onChange={(e) => setEditForm({ ...editForm, depositPaid: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Đã nộp tiền cọc</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.previousSeasonTransfer}
                          onChange={(e) => setEditForm({ ...editForm, previousSeasonTransfer: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Chuyển từ mùa trước</span>
                      </label>
                    </div>
                  </div>

                  {/* Role (Only Super Admin) */}
                  {currentUserRole === 'super_admin' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quyền hạn
                      </label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 flex items-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Modal gửi tin nhắn đồng loạt */}
      {showBulkMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white">
                  <Mail className="w-6 h-6 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold">Gửi tin nhắn đồng loạt</h3>
                    <p className="text-white/80 text-sm">
                      Đến {selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length} người dùng
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkMessageModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Filter info */}
              {advancedFilter !== 'none' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center text-purple-700">
                    <Layers className="w-4 h-4 mr-2" />
                    <span>Đang lọc theo: <strong>{getAdvancedFilterLabel()}</strong></span>
                  </div>
                </div>
              )}
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề tin nhắn *
                </label>
                <input
                  type="text"
                  value={bulkMessage.title}
                  onChange={(e) => setBulkMessage({ ...bulkMessage, title: e.target.value })}
                  placeholder="VD: Nhắc nhở hoàn thành KPI tháng 12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung tin nhắn *
                </label>
                <textarea
                  value={bulkMessage.content}
                  onChange={(e) => setBulkMessage({ ...bulkMessage, content: e.target.value })}
                  placeholder="Nhập nội dung tin nhắn..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mức độ ưu tiên
                </label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setBulkMessage({ ...bulkMessage, priority: 'normal' })}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                      bulkMessage.priority === 'normal'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    📝 Bình thường
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMessage({ ...bulkMessage, priority: 'high' })}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                      bulkMessage.priority === 'high'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    ⚡ Cao
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMessage({ ...bulkMessage, priority: 'urgent' })}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                      bulkMessage.priority === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    🚨 Khẩn cấp
                  </button>
                </div>
              </div>
              
              {/* Recipients preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Người nhận:</strong> {selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length} người
                </div>
                <div className="max-h-24 overflow-y-auto text-xs text-gray-500">
                  {(selectedUsers.length > 0 
                    ? allUsers.filter(u => selectedUsers.includes(u.id))
                    : filteredUsers
                  ).slice(0, 10).map(u => (
                    <span key={u.id} className="inline-block bg-white border rounded px-2 py-0.5 mr-1 mb-1">
                      {u.fullName || u.email}
                    </span>
                  ))}
                  {(selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length) > 10 && (
                    <span className="text-gray-400">
                      ... và {(selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length) - 10} người khác
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkMessageModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSendBulkMessage}
                disabled={!bulkMessage.title.trim() || !bulkMessage.content.trim()}
                className={`px-6 py-2 rounded-lg font-medium flex items-center ${
                  bulkMessage.title.trim() && bulkMessage.content.trim()
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Gửi tin nhắn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIntegratedDashboard;
