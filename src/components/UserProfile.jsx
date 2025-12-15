import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../services/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { 
  User, Camera, Save, X, Calendar, Users, Edit, 
  CheckCircle, AlertCircle, Loader, Lock, Eye, EyeOff, Key
} from 'lucide-react';

// Hàm resize ảnh
const resizeImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(resizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

function UserProfile({ user, onClose, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    birthYear: '',
    gender: 'male',
    phone: '',
    avatarUrl: ''
  });
  
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // State cho đổi mật khẩu
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFormData({
          fullName: data.fullName || data.displayName || '',
          birthYear: data.birthYear || '',
          gender: data.gender || 'male',
          phone: data.phone || '',
          avatarUrl: data.avatarUrl || data.photoURL || ''
        });
        setAvatarPreview(data.avatarUrl || data.photoURL || '');
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Lỗi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File quá lớn (max 10MB)');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      // Resize ảnh
      const resizedFile = await resizeImage(file, 400, 400, 0.8);
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(resizedFile);

      // Upload to Firebase Storage
      const fileName = `avatars/${user.uid}/${Date.now()}_avatar.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, resizedFile);
      const downloadUrl = await getDownloadURL(storageRef);
      
      setFormData(prev => ({ ...prev, avatarUrl: downloadUrl }));
      setSuccess('Đã tải ảnh lên!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Lỗi tải ảnh: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // Validate
    if (!passwordData.currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setChangingPassword(true);

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setPasswordSuccess('Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordSection(false);
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Mật khẩu hiện tại không đúng');
      } else if (err.code === 'auth/too-many-requests') {
        setPasswordError('Quá nhiều lần thử. Vui lòng thử lại sau');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất và đăng nhập lại');
      } else {
        setPasswordError('Lỗi đổi mật khẩu: ' + err.message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName.trim(),
        displayName: formData.fullName.trim(),
        birthYear: formData.birthYear ? parseInt(formData.birthYear) : null,
        gender: formData.gender,
        phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl,
        updatedAt: serverTimestamp()
      });

      setSuccess('Cập nhật thành công!');
      
      if (onUpdate) onUpdate();
      
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Lỗi lưu thông tin: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i - 10);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-10 h-10 animate-spin text-purple-600" />
          <span className="ml-4 text-lg">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-8 h-8 mr-4" />
            <div>
              <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
              <p className="text-sm opacity-90">Chỉnh sửa hồ sơ của bạn</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-100">
                  <User className="w-14 h-14 text-purple-400" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition shadow-lg">
              {uploadingAvatar ? (
                <Loader className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-3">Bấm vào icon camera để đổi ảnh</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <User className="inline w-4 h-4 mr-1" />
            Họ và tên *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
            placeholder="Nhập họ tên đầy đủ"
            required
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Users className="inline w-4 h-4 mr-1" />
            Giới tính *
          </label>
          <div className="flex gap-4">
            <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition text-center ${
              formData.gender === 'male' 
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="hidden"
              />
              <span className="text-3xl">👨</span>
              <span className="block text-sm font-medium mt-1">Nam</span>
            </label>
            <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition text-center ${
              formData.gender === 'female' 
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="hidden"
              />
              <span className="text-3xl">👩</span>
              <span className="block text-sm font-medium mt-1">Nữ</span>
            </label>
          </div>
        </div>

        {/* Birth Year */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            Năm sinh
          </label>
          <select
            value={formData.birthYear}
            onChange={(e) => setFormData(prev => ({ ...prev, birthYear: e.target.value }))}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
          >
            <option value="">-- Chọn năm sinh --</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📱 Số điện thoại
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
            placeholder="0912345678"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📧 Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed text-base"
            disabled
          />
          <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
        </div>

        {/* Đổi mật khẩu */}
        <div className="border-t pt-5">
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="flex items-center text-purple-600 hover:text-purple-700 font-semibold"
          >
            <Key className="w-5 h-5 mr-2" />
            {showPasswordSection ? 'Ẩn đổi mật khẩu' : 'Đổi mật khẩu'}
          </button>

          {showPasswordSection && (
            <div className="mt-4 p-5 bg-gray-50 rounded-xl space-y-4">
              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 pr-12 text-base"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 pr-12 text-base"
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 text-base"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {/* Password Error */}
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  {passwordError}
                </div>
              )}

              {/* Password Success */}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  {passwordSuccess}
                </div>
              )}

              {/* Nút đổi mật khẩu */}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center text-base"
              >
                {changingPassword ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Đổi mật khẩu
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 rounded-xl hover:bg-gray-50 transition font-medium text-base"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || uploadingAvatar}
            className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center text-base"
          >
            {saving ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserProfile;
