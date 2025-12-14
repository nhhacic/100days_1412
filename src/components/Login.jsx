import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect sẽ tự động xảy ra vì App.jsx đã listen auth state
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không đúng');
      } else if (err.code === 'auth/user-not-found') {
        setError('Tài khoản không tồn tại. Vui lòng đăng ký trước.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Mật khẩu không đúng');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.');
      } else if (err.code === 'auth/user-disabled') {
        setError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin.');
      } else {
        setError(`Lỗi đăng nhập: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    
    if (!resetEmail || !resetEmail.includes('@')) {
      setError('Vui lòng nhập email hợp lệ');
      setResetLoading(false);
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setError('');
    } catch (err) {
      console.error('Reset password error:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('Email này chưa được đăng ký trong hệ thống');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else {
        setError(`Lỗi gửi email reset: ${err.message}`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Reset Password Form
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quên Mật Khẩu
            </h1>
            <p className="text-gray-600 mt-2">
              Nhập email để nhận link đặt lại mật khẩu
            </p>
          </div>

          {/* Success message */}
          {resetSent && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700">
                  ✅ Đã gửi link reset mật khẩu đến <strong>{resetEmail}</strong>.
                  Vui lòng kiểm tra email và làm theo hướng dẫn.
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !resetSent && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          {!resetSent ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email đăng ký *
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center shadow-md"
              >
                {resetLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5 mr-2" />
                    Gửi Link Reset
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Kiểm tra hộp thư đến và thư rác của bạn. 
                Link reset sẽ hết hạn sau 1 giờ.
              </p>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setShowResetPassword(false)}
              className="w-full flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại đăng nhập
            </button>
            
            <div className="text-center">
              <p className="text-gray-600">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                  Đăng ký tham gia
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal Login Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Đăng Nhập
          </h1>
          <p className="text-gray-600 mt-2">
            Đăng nhập để tiếp tục hành trình 100 ngày
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline w-4 h-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="inline w-4 h-4 mr-1" />
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center shadow-md"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Đăng nhập
              </>
            )}
          </button>
        </form>

        {/* Back and Register Links */}
        <div className="mt-8 space-y-4">
          <Link
            to="/"
            className="flex items-center justify-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại trang chủ
          </Link>
          
          <div className="text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Đăng ký tham gia
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
