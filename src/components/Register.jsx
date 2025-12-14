import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { checkEmailExists } from '../services/emailChecker';
import { 
  UserPlus, Mail, Lock, User, Calendar, 
  Activity, AlertCircle, ArrowLeft, CheckCircle,
  CreditCard, Upload, Check, Loader2, Eye, EyeOff
} from 'lucide-react';

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stravaConnected, setStravaConnected] = useState(false);
  const [depositFile, setDepositFile] = useState(null);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const debounceTimer = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    gender: 'male',
    birthYear: new Date().getFullYear() - 30,
    challengeStart: '2026-01-01',
    depositProof: null,
    previousSeasonTransfer: false,
    agreeToRules: false
  });

  useEffect(() => {
    if (formData.email && formData.email.includes('@')) {
      setEmailValidated(false);
      setEmailExists(false);
      setError('');
    }
  }, [formData.email]);

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (name === 'email') {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      setEmailValidated(false);
      setEmailExists(false);
      setError('');
      
      debounceTimer.current = setTimeout(() => {
        if (value && value.includes('@')) {
          checkEmailExistsInFirestore(value);
        }
      }, 500);
    }
  };

  const checkEmailExistsInFirestore = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailExists(false);
      setError('');
      return;
    }
    
    setCheckingEmail(true);
    try {
      console.log('🔍 Checking email:', email);
      const { exists, inAuth, inFirestore } = await checkEmailExists(email);
      
      setEmailExists(exists);
      setEmailValidated(true);
      
      if (exists) {
        if (inAuth) {
          setError('❌ Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
        } else {
          setError('⚠️ Email tồn tại trong hồ sơ. Vui lòng liên hệ admin.');
        }
      } else {
        setError('');
      }
      
    } catch (err) {
      console.error('❌ Error checking email:', err);
      setEmailExists(false);
      setEmailValidated(false);
      setError('Lỗi tạm thời khi kiểm tra email.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File quá lớn (tối đa 5MB)');
      return;
    }
    setDepositFile(file);
  };

  const connectStrava = () => {
    alert('Bạn có thể kết nối Strava sau khi đăng ký thành công!');
    setStravaConnected(true);
  };

  const validateStep1 = async () => {
    setError('');
    
    if (!formData.email.includes('@')) {
      setError('Email không hợp lệ');
      return false;
    }
    
    if (!emailValidated || checkingEmail) {
      await checkEmailExistsInFirestore(formData.email);
    }
    
    if (emailExists) {
      setError('Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Mật khẩu ít nhất 6 ký tự');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }
    
    console.log('✅ validateStep1 passed');
    return true;
  };

  const validateStep2 = () => {
    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập họ tên');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.previousSeasonTransfer && !depositFile) {
      setError('Vui lòng upload ảnh chứng minh hoặc chọn "đã nộp từ mùa trước"');
      return false;
    }
    if (!formData.agreeToRules) {
      setError('Bạn phải đồng ý với các quy tắc của challenge');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('❌ Email này đã được đăng ký. Vui lòng dùng email khác.');
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const user = userCredential.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, 'users', user.uid), {
        email: formData.email,
        fullName: formData.fullName,
        gender: formData.gender,
        birthYear: parseInt(formData.birthYear),
        challengeStart: new Date(formData.challengeStart),
        createdAt: new Date(),
        status: 'pending_approval',
        depositProof: depositFile ? 'pending_upload' : 'previous_season',
        previousSeasonTransfer: formData.previousSeasonTransfer,
        stravaConnected: stravaConnected,
        stravaId: null,
        isActive: false,
        depositPaid: formData.previousSeasonTransfer,
        totalDistance: 0,
        totalActivities: 0,
        currentStreak: 0,
        monthlyTarget: formData.gender === 'male' 
          ? { run: 100, swim: 20 } 
          : { run: 80, swim: 16 },
        agreedToRules: true,
        agreedAt: new Date()
      });

      setStep(4);

    } catch (err) {
      console.error('Registration error:', err.code, err.message);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('❌ Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email không hợp lệ');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Tính năng đăng ký tạm thời bị vô hiệu hóa. Vui lòng thử lại sau.');
      } else {
        setError(`Lỗi đăng ký: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    console.log('➡️ nextStep called, current step:', step);
    setError('');
    
    if (step === 1) {
      const isValid = await validateStep1();
      if (!isValid) return;
    }
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const completeRegistration = () => {
    navigate('/');
    alert('✅ Đăng ký thành công! Vui lòng kiểm tra email để xác nhận và chờ admin phê duyệt.');
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const getEmailStatusText = () => {
    if (checkingEmail) return 'checking';
    if (!formData.email.includes('@')) return 'invalid';
    if (emailValidated && emailExists) return 'exists';
    if (emailValidated && !emailExists) return 'available';
    return 'idle';
  };

  const emailStatus = getEmailStatusText();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-green-500 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Đăng Ký Tham Gia Challenge
          </h1>
          <p className="text-gray-600 mt-2">
            Hoàn thành 4 bước để bắt đầu hành trình 100 ngày
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${step >= stepNum 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
                ${step === stepNum ? 'ring-4 ring-blue-200' : ''}
              `}>
                {step > stepNum ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <span className="font-bold">{stepNum}</span>
                )}
              </div>
              <span className="text-sm mt-2 text-gray-600">
                {stepNum === 1 && 'Tài khoản'}
                {stepNum === 2 && 'Thông tin'}
                {stepNum === 3 && 'Tiền cọc'}
                {stepNum === 4 && 'Hoàn tất'}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
                Email đăng nhập *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="your@email.com"
                required
                disabled={checkingEmail}
              />
              <div className="mt-2 flex items-center space-x-2">
                {emailStatus === 'checking' && (
                  <>
                    <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                    <p className="text-xs text-blue-600">Đang kiểm tra email...</p>
                  </>
                )}
                {emailStatus === 'available' && (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">✅ Email có sẵn để đăng ký</p>
                  </>
                )}
                {emailStatus === 'exists' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <p className="text-xs text-red-600">❌ Email đã được sử dụng</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="••••••••"
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Ít nhất 6 ký tự</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Xác nhận mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                <strong>Đã có tài khoản?</strong> Vui lòng{' '}
                <Link to="/login" className="text-blue-600 font-medium">
                  đăng nhập
                </Link>
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Link
                to="/"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại trang chủ
              </Link>
              
              <button
                type="submit"
                disabled={checkingEmail || emailStatus === 'exists' || !formData.email.includes('@')}
                className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                  checkingEmail || emailStatus === 'exists' || !formData.email.includes('@')
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Tiếp tục
                <Activity className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Họ và tên *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giới tính *
                </label>
                <div className="flex space-x-4">
                  {['male', 'female'].map((gender) => (
                    <label key={gender} className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={handleChange}
                        className="mr-2 text-blue-600"
                      />
                      <span>{gender === 'male' ? '👨 Nam' : '👩 Nữ'}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ảnh hưởng đến KPI: Nam (100km/20km), Nữ (80km/16km)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Năm sinh
                </label>
                <select
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  {Array.from({ length: 50 }, (_, i) => {
                    const year = new Date().getFullYear() - 18 - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Ngày bắt đầu challenge *
              </label>
              <input
                type="date"
                name="challengeStart"
                value={formData.challengeStart}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Mặc định: 01/01/2026 - Bạn có thể chọn ngày muộn hơn nếu tham gia sau
              </p>
            </div>

            {/* Strava Connection - Optional */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">Kết nối Strava (Khuyến khích)</h3>
              <p className="text-blue-700 mb-3 text-sm">
                Bạn có thể kết nối Strava ngay hoặc để sau khi được admin duyệt.
              </p>
              <button
                type="button"
                onClick={connectStrava}
                className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                  stravaConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {stravaConnected ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Đã kết nối Strava
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Kết nối với Strava (Tùy chọn)
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại
              </button>
              
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-medium flex items-center bg-blue-600 text-white hover:bg-blue-700"
              >
                Tiếp tục
                <Activity className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">💰 Quyết tâm phí 500,000đ</h3>
              <p className="text-yellow-700 text-sm">
                • Chuyển khoản vào: <strong>BIDV - 8856525377</strong><br/>
                • Nội dung: <em>Quyet tam phi [Tên bạn]</em><br/>
                • Sau khi chuyển, upload ảnh chứng minh bên dưới
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="inline w-4 h-4 mr-1" />
                Ảnh chứng minh chuyển khoản *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {depositFile ? (
                  <div>
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">{depositFile.name}</p>
                    <p className="text-gray-500 text-sm">
                      {(depositFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => setDepositFile(null)}
                      className="text-red-600 text-sm mt-2 hover:text-red-800"
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      Kéo thả file hoặc click để chọn
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="depositFile"
                    />
                    <label
                      htmlFor="depositFile"
                      className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-100"
                    >
                      Chọn file
                    </label>
                    <p className="text-gray-500 text-xs mt-2">
                      Chấp nhận: JPG, PNG, PDF (tối đa 5MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="previousSeasonTransfer"
                  checked={formData.previousSeasonTransfer}
                  onChange={handleChange}
                  className="mt-1 mr-3 text-blue-600"
                />
                <div>
                  <span className="font-medium text-blue-800">
                    Tôi đã nộp tiền cọc từ mùa trước và được chuyển sang mùa này
                  </span>
                  <p className="text-blue-700 text-sm mt-1">
                    Nếu chọn option này, bạn không cần upload ảnh chứng minh.
                    Admin sẽ xác minh thông tin của bạn.
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeToRules"
                  checked={formData.agreeToRules}
                  onChange={handleChange}
                  className="mt-1 mr-3 text-blue-600"
                  required
                />
                <div>
                  <span className="font-medium text-gray-800">
                    Tôi đã đọc và đồng ý với tất cả quy tắc của Challenge 100 Ngày Vì TIỀN
                  </span>
                  <p className="text-gray-600 text-sm mt-1">
                    Tôi hiểu rằng: phải hoàn thành KPI hoặc nộp phạt đầy đủ, 
                    kết quả được đồng bộ tự động qua Strava, và cam kết tham gia trung thực.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Quay lại
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang đăng ký...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Hoàn tất đăng ký
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Đăng ký thành công!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Chào mừng <strong>{formData.fullName}</strong> đến với Challenge 100 Ngày!
            </p>
            
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
              <h3 className="font-bold text-blue-800 mb-3">📋 Quy trình tiếp theo:</h3>
              <ol className="text-left space-y-3 text-blue-700">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                  <span><strong>Kiểm tra email</strong> để xác nhận địa chỉ email của bạn</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                  <span><strong>Chờ admin phê duyệt</strong> thông tin đăng ký (trong vòng 24h)</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                  <span>Sau khi được duyệt, bạn có thể <strong>đăng nhập</strong> và bắt đầu challenge</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">4</span>
                  <span>Kết nối Strava để đồng bộ dữ liệu tập luyện tự động</span>
                </li>
              </ol>
            </div>

            <button
              onClick={completeRegistration}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg mb-4"
            >
              🏠 VỀ TRANG CHỦ
            </button>

            <p className="text-sm text-gray-500">
              💡 Bạn sẽ nhận được email thông báo khi được admin phê duyệt.
            </p>
          </div>
        )}

        {step !== 4 && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Register;
