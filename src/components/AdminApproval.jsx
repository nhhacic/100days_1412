import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, query, where, getDocs, updateDoc, doc,
  orderBy, limit
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle, XCircle, Eye, Mail, User, Calendar, 
  DollarSign, Clock, AlertCircle, RefreshCw, Filter, Shield,
  FileText, Search, ChevronLeft, ChevronRight, ArrowLeft,
  LogOut, Home, TrendingUp, Award
} from 'lucide-react';

function AdminApproval() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;
    
    if (filter !== 'all') {
      filtered = filtered.filter(user => user.status === filter);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.fullName?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, filter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(200));
      const querySnapshot = await getDocs(q);
      
      const userList = [];
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        userList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          formattedDate: data.createdAt?.toDate ? 
            data.createdAt.toDate().toLocaleDateString('vi-VN') : 
            new Date(data.createdAt).toLocaleDateString('vi-VN'),
          approvedAt: data.approvedAt?.toDate ? 
            data.approvedAt.toDate().toLocaleDateString('vi-VN') : 
            data.approvedAt ? new Date(data.approvedAt).toLocaleDateString('vi-VN') : null
        });
        
        if (data.status === 'pending_approval') pendingCount++;
        else if (data.status === 'approved') approvedCount++;
        else if (data.status === 'rejected') rejectedCount++;
      });
      
      setUsers(userList);
      setUserStats({
        total: userList.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Xác nhận duyệt người dùng này?')) return;
    
    try {
      const currentUser = auth.currentUser;
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        isActive: true,
        approvedBy: currentUser?.email || 'admin',
        approvedAt: new Date(),
        approvedByUID: currentUser?.uid
      });
      
      alert('✅ Đã duyệt người dùng thành công!');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error approving user:', error);
      alert('❌ Lỗi khi duyệt người dùng');
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;
    
    try {
      const currentUser = auth.currentUser;
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected',
        isActive: false,
        rejectionReason: reason,
        approvedBy: currentUser?.email || 'admin',
        approvedAt: new Date(),
        approvedByUID: currentUser?.uid
      });
      
      alert('✅ Đã từ chối người dùng!');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('❌ Lỗi khi từ chối người dùng');
    }
  };

  const handleBulkApprove = async (userIds) => {
    if (!window.confirm(`Xác nhận duyệt ${userIds.length} người dùng?`)) return;
    
    try {
      const currentUser = auth.currentUser;
      const batch = [];
      
      for (const userId of userIds) {
        batch.push(
          updateDoc(doc(db, 'users', userId), {
            status: 'approved',
            isActive: true,
            approvedBy: currentUser?.email || 'admin',
            approvedAt: new Date(),
            approvedByUID: currentUser?.uid
          })
        );
      }
      
      await Promise.all(batch);
      alert(`✅ Đã duyệt ${userIds.length} người dùng thành công!`);
      fetchUsers();
    } catch (error) {
      console.error('Error bulk approving users:', error);
      alert('❌ Lỗi khi duyệt nhiều người dùng');
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
  };

  const closeDetails = () => {
    setSelectedUser(null);
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
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Unknown</span>;
    }
  };

  const getDepositBadge = (user) => {
    if (user.depositPaid || user.previousSeasonTransfer) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Đã nộp</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">⏳ Chờ nộp</span>;
  };

  const getStravaBadge = (user) => {
    if (user.stravaConnected) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">🔗 Đã kết nối</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">❌ Chưa kết nối</span>;
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const selectedUsersForBulk = filteredUsers.filter(u => u.status === 'pending_approval');
  const canBulkApprove = selectedUsersForBulk.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Shield className="w-8 h-8 mr-3" />
                Admin - Quản Lý Người Dùng
              </h1>
              <p className="opacity-90">Quản lý, phê duyệt và theo dõi người dùng tham gia challenge</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{userStats.total}</div>
              <div className="text-sm opacity-90">Tổng người đăng ký</div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-white hover:text-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Về Dashboard
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-white hover:text-gray-200"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Cấu hình
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-white hover:text-gray-200"
              >
                <Home className="w-4 h-4 mr-1" />
                Trang chủ
              </button>
              <button
                onClick={() => { if (window.confirm('Bạn có chắc muốn đăng xuất không?')) auth.signOut(); }}
                className="flex items-center bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30"
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
                <div className="text-2xl font-bold">{userStats.pending}</div>
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
                <div className="text-2xl font-bold">{userStats.approved}</div>
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
                <div className="text-2xl font-bold">{userStats.rejected}</div>
                <div className="text-gray-600 text-sm">Đã từ chối</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{userStats.total}</div>
                <div className="text-gray-600 text-sm">Tổng cộng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {canBulkApprove && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">🚀 Duyệt hàng loạt</h3>
                <p className="text-sm text-gray-600">
                  Có {selectedUsersForBulk.length} người dùng đang chờ duyệt
                </p>
              </div>
              <button
                onClick={() => handleBulkApprove(selectedUsersForBulk.map(u => u.id))}
                className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Duyệt tất cả ({selectedUsersForBulk.length})
              </button>
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
                  <option value="pending_approval">⏳ Chờ duyệt</option>
                  <option value="approved">✅ Đã duyệt</option>
                  <option value="rejected">❌ Từ chối</option>
                  <option value="all">�� Tất cả</option>
                </select>
              </div>
              
              <button
                onClick={fetchUsers}
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
                placeholder="Tìm theo email hoặc tên..."
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày đăng ký
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiền cọc
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Strava
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
                          <div>
                            <div className="font-medium text-gray-900">{user.fullName || 'Chưa có tên'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {user.gender === 'male' ? '👨 Nam' : '👩 Nữ'} • {user.birthYear || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {user.formattedDate}
                          {user.approvedAt && (
                            <div className="text-xs text-gray-500">
                              Duyệt: {user.approvedAt}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-6 py-4">
                          {getDepositBadge(user)}
                        </td>
                        <td className="px-6 py-4">
                          {getStravaBadge(user)}
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
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} của {filteredUsers.length}
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
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết người dùng</h2>
                <button
                  onClick={closeDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Thông tin cá nhân
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Họ tên</p>
                      <p className="font-medium">{selectedUser.fullName || 'Chưa có'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Giới tính</p>
                      <p className="font-medium">{selectedUser.gender === 'male' ? 'Nam' : 'Nữ'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Năm sinh</p>
                      <p className="font-medium">{selectedUser.birthYear || 'Chưa có'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Challenge Info */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Thông tin Challenge
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Ngày bắt đầu</p>
                      <p className="font-medium">
                        {selectedUser.challengeStart?.toDate ? 
                          selectedUser.challengeStart.toDate().toLocaleDateString('vi-VN') : 
                          'Chưa có'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">KPI mục tiêu</p>
                      <p className="font-medium">
                        {selectedUser.gender === 'male' ? '100km chạy + 20km bơi' : '80km chạy + 16km bơi'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Deposit Info */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Thông tin tiền cọc
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Chuyển từ mùa trước:</span>
                      <span className={`font-medium ${selectedUser.previousSeasonTransfer ? 'text-green-600' : 'text-gray-700'}`}>
                        {selectedUser.previousSeasonTransfer ? '✅ Có' : '❌ Không'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Đã nộp cọc:</span>
                      <span className={`font-medium ${selectedUser.depositPaid ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedUser.depositPaid ? '✅ Đã nộp' : '❌ Chưa nộp'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Registration Info */}
                <div>
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Thông tin đăng ký
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Ngày đăng ký:</span>
                      <span className="font-medium">{selectedUser.formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span>{getStatusBadge(selectedUser.status)}</span>
                    </div>
                    {selectedUser.approvedBy && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duyệt bởi:</span>
                        <span className="font-medium">{selectedUser.approvedBy}</span>
                      </div>
                    )}
                    {selectedUser.rejectionReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-700">Lý do từ chối:</p>
                        <p className="text-red-600">{selectedUser.rejectionReason}</p>
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

export default AdminApproval;
