import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, getDocs, query, where, orderBy, updateDoc, doc,
  limit, startAfter, getCountFromServer, deleteDoc, getDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import challengeConfig from '../services/challengeConfig';
import { RoleManager, ROLES } from '../services/roleManager';
import { 
  Shield, Users, CheckCircle, XCircle, Clock, AlertCircle,
  Filter, Search, RefreshCw, Eye, Download, DollarSign,
  TrendingUp, TrendingDown, BarChart3, FileText, Settings,
  Home, LogOut, ChevronLeft, ChevronRight, User, Calendar,
  Waves, Activity, Award, CreditCard, Image as ImageIcon,
  CheckSquare, Square, Mail, Phone, MapPin, Star, Flag,
  Trash2, Key, UserCheck, UserX, MoreVertical, Footprints, Bike
} from 'lucide-react';

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    totalDeposit: 0,
    totalPenalty: 0
  });
  
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDepositImages, setShowDepositImages] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userEventParticipations, setUserEventParticipations] = useState([]);
  const [loadingParticipations, setLoadingParticipations] = useState(false);
  const itemsPerPage = 15;

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allUsers, filter, search]);

  useEffect(() => {
    if (selectedUser) {
      console.log('🔵 Selected user changed, loading participations for:', selectedUser.id, selectedUser.email);
      loadUserEventParticipations(selectedUser.id);
    } else {
      console.log('🔴 No user selected, clearing participations');
      setUserEventParticipations([]);
    }
  }, [selectedUser]);

  const loadCurrentUser = async () => {
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() });
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUserEventParticipations = async (userId) => {
    setLoadingParticipations(true);
    try {
      console.log('🔍 Loading event participations for user:', userId);
      // Load event participations (không dùng orderBy để tránh lỗi composite index)
      const participationsQuery = query(
        collection(db, 'event_participations'),
        where('userId', '==', userId)
      );
      const participationsSnapshot = await getDocs(participationsQuery);
      console.log('📊 Found participations:', participationsSnapshot.size);
      const participationsData = [];
      
      // Load event details for each participation
      for (const docSnap of participationsSnapshot.docs) {
        const data = docSnap.data();
        console.log('📝 Processing participation:', docSnap.id, data);
        let eventData = null;
        
        // Load event details
        if (data.eventId) {
          try {
            const eventDoc = await getDoc(doc(db, 'special_events', data.eventId));
            if (eventDoc.exists()) {
              eventData = { id: eventDoc.id, ...eventDoc.data() };
              console.log('✅ Loaded event:', eventData.name);
            } else {
              console.log('⚠️ Event not found:', data.eventId);
            }
          } catch (err) {
            console.error('❌ Error loading event:', err);
          }
        } else {
          console.log('⚠️ No eventId in participation');
        }
        
        participationsData.push({
          id: docSnap.id,
          ...data,
          linkedAt: data.linkedAt?.toDate?.() || new Date(data.linkedAt),
          activityDate: data.activityDate?.toDate?.() || (data.activityDate ? new Date(data.activityDate) : null),
          event: eventData
        });
      }
      
      // Sort by linkedAt desc (client-side)
      participationsData.sort((a, b) => b.linkedAt - a.linkedAt);
      
      console.log('✅ Loaded participations data:', participationsData);
      setUserEventParticipations(participationsData);
    } catch (error) {
      console.error('❌ Error loading user event participations:', error);
      setUserEventParticipations([]);
    } finally {
      setLoadingParticipations(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(200));
      const querySnapshot = await getDocs(q);
      
      const userList = [];
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let activeCount = 0;
      let totalDeposit = 0;
      let totalPenalty = 0;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const user = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt ? new Date(data.approvedAt) : null,
          challengeStart: data.challengeStart?.toDate ? data.challengeStart.toDate() : new Date(data.challengeStart)
        };

        // Tính toán KPI và phạt (dummy data - cần tích hợp với Strava API thực tế)
        const metrics = calculateUserMetrics(user);
        user.metrics = metrics;

        userList.push(user);

        // Thống kê
        if (user.status === 'pending_approval') pendingCount++;
        else if (user.status === 'approved') approvedCount++;
        else if (user.status === 'rejected') rejectedCount++;
        
        if (user.isActive) activeCount++;
        if (user.depositPaid) totalDeposit += 500000;
        totalPenalty += metrics.penalty;
      });

      setAllUsers(userList);
      setStats({
        total: userList.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount,
        totalDeposit,
        totalPenalty
      });

      // Load current user info for role checking
      if (auth.currentUser) {
        const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (currentUserDoc.exists()) {
          setCurrentUser({
            id: currentUserDoc.id,
            ...currentUserDoc.data()
          });
        }
      }

    } catch (error) {
      console.error('Error loading users:', error);
      alert('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserMetrics = (user) => {
    // Mock data - thực tế sẽ lấy từ Strava API
    const target = challengeConfig.getConfig().monthlyTargets[user.gender || 'male'];
    
    // Tạo dữ liệu ngẫu nhiên để demo
    const runDistance = Math.random() * target.run * 1.2;
    const swimDistance = Math.random() * target.swim * 1.2;
    const runDeficit = Math.max(0, target.run - runDistance);
    const swimDeficit = Math.max(0, target.swim - swimDistance);
    const penalty = challengeConfig.calculatePenalty(runDeficit, swimDeficit).total;
    
    return {
      runDistance: parseFloat(runDistance.toFixed(1)),
      swimDistance: parseFloat(swimDistance.toFixed(1)),
      totalDistance: parseFloat((runDistance + swimDistance).toFixed(1)),
      activityCount: Math.floor(Math.random() * 30) + 5,
      runProgress: Math.min(100, (runDistance / target.run) * 100),
      swimProgress: Math.min(100, (swimDistance / target.swim) * 100),
      penalty,
      runDeficit: parseFloat(runDeficit.toFixed(1)),
      swimDeficit: parseFloat(swimDeficit.toFixed(1)),
      streak: Math.floor(Math.random() * 30)
    };
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
      setSelectedUser(null);
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
      setSelectedUser(null);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('❌ Lỗi khi từ chối người dùng');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('❌ Chỉ Super Admin mới có quyền phân quyền!');
      return;
    }

    if (!window.confirm(`Xác nhận thay đổi role thành ${RoleManager.getRoleDisplayName(newRole)}?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        roleUpdatedBy: auth.currentUser?.email || 'super_admin',
        roleUpdatedAt: new Date(),
        roleUpdatedByUID: auth.currentUser?.uid
      });

      alert('✅ Đã cập nhật role thành công!');
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('❌ Lỗi khi cập nhật role');
    }
  };

  // Xóa người dùng (chỉ Super Admin)
  const handleDeleteUser = async (userId, userEmail) => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('❌ Chỉ Super Admin mới có quyền xóa người dùng!');
      return;
    }

    if (userId === auth.currentUser?.uid) {
      alert('❌ Không thể xóa chính mình!');
      return;
    }

    const confirmText = prompt(`Nhập "${userEmail}" để xác nhận xóa người dùng này:`);
    if (confirmText !== userEmail) {
      alert('❌ Email không khớp, hủy xóa!');
      return;
    }

    try {
      // Xóa document user trong Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // Xóa activities của user (nếu có)
      try {
        const activitiesRef = collection(db, 'activities');
        const q = query(activitiesRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } catch (e) {
        console.log('No activities to delete or error:', e);
      }

      alert('✅ Đã xóa người dùng khỏi hệ thống!');
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Lỗi khi xóa người dùng: ' + error.message);
    }
  };

  // Thay đổi trạng thái duyệt (chỉ Super Admin)
  const handleChangeUserStatus = async (userId, currentStatus) => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('❌ Chỉ Super Admin mới có quyền thay đổi trạng thái!');
      return;
    }

    const statuses = [
      { value: 'pending_approval', label: 'Chờ duyệt' },
      { value: 'approved', label: 'Đã duyệt' },
      { value: 'rejected', label: 'Từ chối' }
    ];

    const options = statuses.map((s, i) => `${i + 1}. ${s.label}${s.value === currentStatus ? ' (hiện tại)' : ''}`).join('\n');
    const choice = prompt(`Chọn trạng thái mới:\n${options}\n\nNhập số (1-3):`);
    
    if (!choice || !['1', '2', '3'].includes(choice)) {
      return;
    }

    const newStatus = statuses[parseInt(choice) - 1].value;
    if (newStatus === currentStatus) {
      alert('Trạng thái không thay đổi!');
      return;
    }

    try {
      const updateData = {
        status: newStatus,
        statusUpdatedBy: auth.currentUser?.email || 'super_admin',
        statusUpdatedAt: new Date(),
        statusUpdatedByUID: auth.currentUser?.uid
      };

      if (newStatus === 'approved') {
        updateData.isActive = true;
        updateData.approvedBy = auth.currentUser?.email;
        updateData.approvedAt = new Date();
      } else if (newStatus === 'rejected') {
        updateData.isActive = false;
      } else if (newStatus === 'pending_approval') {
        updateData.isActive = false;
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      alert(`✅ Đã chuyển trạng thái thành "${statuses[parseInt(choice) - 1].label}"!`);
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error changing user status:', error);
      alert('❌ Lỗi khi thay đổi trạng thái: ' + error.message);
    }
  };

  // Reset mật khẩu người dùng (chỉ Super Admin)
  const handleResetPassword = async (userEmail) => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      alert('❌ Chỉ Super Admin mới có quyền reset mật khẩu!');
      return;
    }

    if (!window.confirm(`Gửi email reset mật khẩu đến "${userEmail}"?`)) {
      return;
    }

    try {
      // Sử dụng Firebase Auth sendPasswordResetEmail
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, userEmail);
      
      alert(`✅ Đã gửi email reset mật khẩu đến ${userEmail}!\nNgười dùng sẽ nhận được email hướng dẫn đặt lại mật khẩu.`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      if (error.code === 'auth/user-not-found') {
        alert('❌ Không tìm thấy tài khoản với email này!');
      } else {
        alert('❌ Lỗi khi gửi email reset mật khẩu: ' + error.message);
      }
    }
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

  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (date) => 
    date ? date.toLocaleDateString('vi-VN') : 'N/A';

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

  const toggleDepositImage = (userId) => {
    setShowDepositImages(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = getCurrentPageUsers();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Shield className="w-8 h-8 mr-3" />
                Bảng Điều Khiển Quản Trị
              </h1>
              <p className="opacity-90">Quản lý toàn bộ người dùng và theo dõi kết quả challenge</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">Tổng người dùng</div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-white hover:text-gray-200"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Về Dashboard cá nhân
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-white hover:text-gray-200"
              >
                <Settings className="w-4 h-4 mr-1" />
                Cấu hình hệ thống
              </button>
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
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalDeposit)}</div>
                <div className="text-gray-600 text-sm">Tổng tiền cọc</div>
              </div>
            </div>
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
                        Tiền cọc
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phạt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chi tiết
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
                              <span className="mx-2">•</span>
                              <span className="inline-flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(user.createdAt)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={RoleManager.getRoleBadge(user.role || 'user').className}>
                            {RoleManager.getRoleBadge(user.role || 'user').text}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(user.status)}
                          {user.status === 'approved' && user.approvedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(user.approvedAt)}
                            </div>
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
                          <div className="space-y-2">
                            {getDepositBadge(user)}
                            {user.depositProof && user.depositProof !== 'previous_season' && (
                              <button
                                onClick={() => toggleDepositImage(user.id)}
                                className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                              >
                                <ImageIcon className="w-3 h-3 mr-1" />
                                {showDepositImages[user.id] ? 'Ẩn ảnh' : 'Xem ảnh'}
                              </button>
                            )}
                          </div>
                          {showDepositImages[user.id] && user.depositProof && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border">
                              <div className="text-xs text-gray-600 mb-1">Ảnh chứng minh:</div>
                              <div className="text-sm text-blue-600">{user.depositProof}</div>
                              {/* Trong thực tế, đây sẽ là <img src={user.depositProofUrl} /> */}
                              <div className="mt-1 text-xs text-gray-500">
                                (Demo: Cần upload ảnh thực tế)
                              </div>
                            </div>
                          )}
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
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Xem chi tiết
                          </button>
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

        {/* Summary Footer */}
        <div className="bg-white rounded-xl shadow p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Tổng kết hệ thống</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Tổng tiền phạt dự kiến</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPenalty)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Tỷ lệ hoàn thành KPI</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Người đang hoạt động</div>
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Tỷ lệ duyệt đăng ký</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết người dùng</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Thông tin cá nhân
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Họ tên:</span>
                        <span className="font-medium">{selectedUser.fullName || 'Chưa có'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Giới tính:</span>
                        <span className="font-medium">{selectedUser.gender === 'male' ? 'Nam' : 'Nữ'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Năm sinh:</span>
                        <span className="font-medium">{selectedUser.birthYear || 'Chưa có'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role Management - Only for Super Admin */}
                  {currentUser && currentUser.role === 'super_admin' && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Quản lý phân quyền
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-purple-700">Role hiện tại:</span>
                          <span className={RoleManager.getRoleBadge(selectedUser.role || 'user').className}>
                            {RoleManager.getRoleBadge(selectedUser.role || 'user').text}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Thay đổi role:
                          </label>
                          <select
                            value={selectedUser.role || 'user'}
                            onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                          >
                            <option value="user">{RoleManager.getRoleDisplayName('user')}</option>
                            <option value="moderator">{RoleManager.getRoleDisplayName('moderator')}</option>
                            <option value="admin">{RoleManager.getRoleDisplayName('admin')}</option>
                            <option value="super_admin">{RoleManager.getRoleDisplayName('super_admin')}</option>
                          </select>
                        </div>
                        <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                          ⚠️ Chỉ Super Admin mới có thể thay đổi role của người khác
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Thông tin Challenge
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ngày bắt đầu:</span>
                        <span className="font-medium">{formatDate(selectedUser.challengeStart)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">KPI mục tiêu:</span>
                        <span className="font-medium">
                          {selectedUser.gender === 'male' ? '100km chạy + 20km bơi' : '80km chạy + 16km bơi'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trạng thái:</span>
                        <span>{getStatusBadge(selectedUser.status)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ngày đăng ký:</span>
                        <span className="font-medium">{formatDate(selectedUser.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Kết quả tập luyện
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedUser.metrics.runDistance}km</div>
                      <div className="text-sm text-gray-600">Chạy bộ</div>
                      <div className="text-xs text-gray-500">
                        {selectedUser.metrics.runProgress.toFixed(1)}% KPI
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-600">{selectedUser.metrics.swimDistance}km</div>
                      <div className="text-sm text-gray-600">Bơi lội</div>
                      <div className="text-xs text-gray-500">
                        {selectedUser.metrics.swimProgress.toFixed(1)}% KPI
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{selectedUser.metrics.activityCount}</div>
                      <div className="text-sm text-gray-600">Hoạt động</div>
                      <div className="text-xs text-gray-500">Đã ghi nhận</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(selectedUser.metrics.penalty)}</div>
                      <div className="text-sm text-gray-600">Tiền phạt</div>
                      <div className="text-xs text-gray-500">Tháng này</div>
                    </div>
                  </div>
                </div>

                {/* Event Participations */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Tracklogs Sự Kiện Đặc Biệt ({userEventParticipations.length})
                  </h3>
                  
                  {loadingParticipations ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-2 text-sm text-purple-600">Đang tải...</p>
                    </div>
                  ) : userEventParticipations.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-lg border border-dashed border-purple-200">
                      <Award className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                      <p className="text-purple-600 text-sm">Chưa có tracklog sự kiện nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {userEventParticipations.map((participation) => (
                        <div key={participation.id} className="bg-white p-3 rounded-lg border border-purple-100 hover:border-purple-300 transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {participation.event ? (
                                <div className="flex items-center mb-1">
                                  {participation.event.eventType === 'charity_event' ? (
                                    <Star className="w-4 h-4 text-yellow-500 mr-1.5" />
                                  ) : (
                                    <Award className="w-4 h-4 text-blue-500 mr-1.5" />
                                  )}
                                  <span className="font-semibold text-purple-900 text-sm">
                                    {participation.event.name || participation.eventName || 'Sự kiện'}
                                  </span>
                                </div>
                              ) : participation.eventName ? (
                                <div className="flex items-center mb-1">
                                  <Award className="w-4 h-4 text-gray-500 mr-1.5" />
                                  <span className="font-semibold text-gray-700 text-sm">
                                    {participation.eventName}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-gray-500 mb-1">
                                  <Award className="w-4 h-4 inline mr-1" />
                                  Sự kiện đã bị xóa
                                </div>
                              )}
                              
                              <div className="text-xs text-gray-600 space-y-0.5">
                                <div className="flex items-center">
                                  {participation.activityType?.toLowerCase().includes('run') ? (
                                    <Footprints className="w-3 h-3 mr-1 text-orange-500" />
                                  ) : participation.activityType?.toLowerCase().includes('swim') ? (
                                    <Waves className="w-3 h-3 mr-1 text-blue-500" />
                                  ) : (
                                    <Activity className="w-3 h-3 mr-1 text-gray-500" />
                                  )}
                                  <span>{participation.activityName || 'N/A'}</span>
                                </div>
                                <div className="flex items-center text-purple-600">
                                  <span className="font-semibold">
                                    {(participation.distance / 1000).toFixed(2)} km
                                  </span>
                                  {participation.movingTime && (
                                    <span className="ml-2 text-gray-500">
                                      • {Math.floor(participation.movingTime / 60)} phút
                                    </span>
                                  )}
                                </div>
                                {participation.activityDate && (
                                  <div className="text-gray-500">
                                    📅 {participation.activityDate.toLocaleDateString('vi-VN')}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right ml-3">
                              {participation.activityId && (
                                <a
                                  href={`https://www.strava.com/activities/${participation.activityId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center justify-end mb-1"
                                >
                                  Xem Strava
                                  <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                                  </svg>
                                </a>
                              )}
                              <div className="text-[10px] text-gray-400">
                                {participation.linkedAt?.toLocaleDateString('vi-VN')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Thông tin tài chính
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tiền cọc 500k:</span>
                      {getDepositBadge(selectedUser)}
                    </div>
                    {selectedUser.depositProof && selectedUser.depositProof !== 'previous_season' && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <div className="font-medium text-blue-800 mb-1">Chứng minh chuyển khoản:</div>
                        <div className="text-sm text-blue-700">{selectedUser.depositProof}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Ảnh chụp màn hình/xác nhận chuyển khoản)
                        </div>
                      </div>
                    )}
                    {selectedUser.previousSeasonTransfer && (
                      <div className="bg-green-50 p-3 rounded border border-green-100">
                        <div className="font-medium text-green-800">✅ Chuyển từ mùa trước</div>
                        <div className="text-sm text-green-700">Đã nộp cọc từ challenge trước</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedUser.status === 'pending_approval' && (
                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApprove(selectedUser.id)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Duyệt đăng ký
                      </button>
                      <button
                        onClick={() => handleReject(selectedUser.id)}
                        className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Từ chối
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
