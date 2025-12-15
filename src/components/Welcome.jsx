import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import challengeConfig from '../services/challengeConfig';
import { 
  Trophy, DollarSign, Calendar, Target, AlertCircle, 
  CheckCircle, Award, Clock, TrendingUp, Heart,
  ArrowRight, LogIn, UserPlus, Shield, Footprints, Waves,
  Users, Medal, Flag, CreditCard, MessageCircle, Gift,
  Flame, Bike
} from 'lucide-react';

function Welcome() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      const configData = challengeConfig.getConfig();
      setConfig(configData);
      setLoading(false);
    };
    
    loadConfig();
    
    const interval = setInterval(() => {
      loadConfig();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleJoin = () => {
    if (accepted) {
      navigate('/register');
    } else {
      alert('Vui lòng đọc và đồng ý với các quy tắc của challenge!');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin thử thách...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => challengeConfig.formatCurrency(amount);
  const formatDate = (date) => challengeConfig.formatDate(date);

  const seasonName = config.seasonName || 'Challenge 100 ngày Vì TIỀN';
  const description = config.description || `MÙA ${config.season || 7}`;
  const startDate = formatDate(config.startDate);
  const seasonEndDate = formatDate(config.seasonEndDate || config.finalChallengeEnd);
  
  const maleTotalRun = (config.monthlyTargets.male.run * config.durationMonths) || 300;
  const maleTotalSwim = (config.monthlyTargets.male.swim * config.durationMonths) || 60;
  const femaleTotalRun = (config.monthlyTargets.female.run * config.durationMonths) || 240;
  const femaleTotalSwim = (config.monthlyTargets.female.swim * config.durationMonths) || 48;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header với Logo */}
      <div className="bg-gradient-to-r from-blue-600 to-green-500 text-white py-6 sm:py-8 px-3 sm:px-4 text-center">
        <div className="max-w-6xl mx-auto">
          {/* Logo Container */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full mb-3 sm:mb-4 p-1.5 sm:p-2">
            <img 
              src="/logo.png" 
              alt="Challenge Logo" 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
              onError={() => setLogoError(true)}
              style={{ display: logoError ? 'none' : 'block' }}
            />
            {logoError && (
              <Trophy className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">
            {seasonName}
          </h1>
          <p className="text-base sm:text-lg md:text-xl opacity-90 mb-2">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center mt-3 sm:mt-4 space-y-1 sm:space-y-0 sm:space-x-4 md:space-x-8 text-sm sm:text-base">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span>Bắt đầu: {startDate}</span>
            </div>
            <div className="opacity-70">-</div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              <span>Kết thúc: {seasonEndDate}</span>
            </div>
          </div>
          <p className="text-sm opacity-80 mt-2">
            ⚡ {config.durationMonths || 3} tháng KPI: {formatDate(config.startDate)} - {formatDate(config.kpiEndDate)} | 
            🔥 10 ngày cuối: {formatDate(config.finalChallengeStart)} - {formatDate(config.finalChallengeEnd)}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Giới thiệu & 10 ngày cuối */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Giới thiệu thử thách */}
          <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2 sm:mr-3" />
              <h2 className="text-lg sm:text-xl font-bold text-blue-800">🏁 Tổng quan thử thách</h2>
            </div>
            
            {/* Timeline */}
            <div className="mb-4 sm:mb-6">
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">📅 Timeline chính xác</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 mr-2"></div>
                    <span className="font-bold text-blue-700 text-sm sm:text-base">{config.durationMonths || 3} THÁNG KPI</span>
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base">
                    <strong>Thời gian:</strong> {formatDate(config.startDate)} - {formatDate(config.kpiEndDate)}
                  </p>
                  <p className="text-gray-700 text-xs sm:text-sm mt-1">
                    (Phải đạt KPI mỗi tháng)
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
              <strong>Khối lượng tập luyện mỗi tháng:</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                <div className="flex items-center mb-2 sm:mb-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 mr-2"></div>
                  <span className="font-bold text-gray-900 text-base sm:text-lg">Nam</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2">🏃</span>
                    <span className="text-gray-700">{config.monthlyTargets.male.run}km chạy/tháng</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🏊</span>
                    <span className="text-gray-700">{config.monthlyTargets.male.swim}km bơi/tháng</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Tổng {config.durationMonths || 3} tháng: <strong>{maleTotalRun}km chạy + {maleTotalSwim}km bơi</strong>
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
                  <span className="font-bold text-gray-900 text-lg">Nữ</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2">🏃</span>
                    <span className="text-gray-700">{config.monthlyTargets.female.run}km chạy/tháng</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🏊</span>
                    <span className="text-gray-700">{config.monthlyTargets.female.swim}km bơi/tháng</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Tổng {config.durationMonths || 3} tháng: <strong>{femaleTotalRun}km chạy + {femaleTotalSwim}km bơi</strong>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Daily Limits */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">📊 Giới hạn hàng ngày</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-bold text-blue-700 mb-2">Thứ 2 - Thứ 6</h4>
                  <p className="text-gray-700">• Tối đa: <strong>{config.dailyLimits.weekday.run}km chạy</strong></p>
                  <p className="text-gray-700">• Tối đa: <strong>{config.dailyLimits.weekday.swim}km bơi</strong></p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-bold text-green-700 mb-2">Thứ 7 - Chủ nhật</h4>
                  <p className="text-gray-700">• Tối đa: <strong>{config.dailyLimits.weekend.run}km chạy</strong></p>
                  <p className="text-gray-700">• Tối đa: <strong>{config.dailyLimits.weekend.swim}km bơi</strong></p>
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <strong>⚠️ Lưu ý:</strong> Không giới hạn số lần chạy/bơi. Khuyến khích tập đều với khối lượng vừa phải, 
              <strong> KHÔNG khuyến khích tập quá nhiều, quá nặng</strong> - có thể gây chấn thương và có hại cho sức khoẻ.
            </p>
          </div>

          {/* 10 NGÀY CUỐI */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <Flame className="w-7 h-7 text-red-600 mr-3" />
              <h2 className="text-xl font-bold text-red-800">🔥 10 NGÀY CUỐI</h2>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-red-500 mr-2" />
                <span className="font-bold text-gray-900">Thời gian:</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatDate(config.finalChallengeStart)} - {formatDate(config.finalChallengeEnd)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                (Sau {config.durationMonths || 3} tháng KPI, trước khi kết thúc mùa)
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">🎯 Phải hoàn thành 1 trong 2:</h3>
              <div className="space-y-3">
                <div className="bg-white/80 rounded-lg p-3 border border-red-100">
                  <p className="font-medium text-red-700 mb-1">Phương án 1:</p>
                  <p className="text-sm text-gray-700">• Bơi 1 lần liên tục <strong>{config.finalChallengeTargets.option1.swim}km</strong></p>
                  <p className="text-sm text-gray-700">• Chạy 1 lần liên tục <strong>{config.finalChallengeTargets.option1.run}km</strong></p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-orange-100">
                  <p className="font-medium text-orange-700 mb-1">Phương án 2:</p>
                  <p className="text-sm text-gray-700">• Bơi 1 lần liên tục <strong>{config.finalChallengeTargets.option2.swim}km</strong></p>
                  <p className="text-sm text-gray-700">• Chạy 1 lần liên tục <strong>{config.finalChallengeTargets.option2.run}km</strong></p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-100 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">📌 Quan trọng:</p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Chỉ phải thực hiện mỗi môn 1 lần duy nhất</li>
                    <li>• Không nhất thiết cùng ngày</li>
                    <li>• <strong>KHÔNG được quy đổi</strong></li>
                    <li>• Phạt: <strong>{formatCurrency(config.penalties.finalChallenge)}/môn</strong> nếu không hoàn thành</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Column 1: Rules & Requirements */}
          <div className="space-y-6">
            {/* Quy đổi */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-green-500">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">🔄 Quy đổi bơi ↔ chạy</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-bold text-green-700 mb-2">Bơi → Chạy</p>
                  <p className="text-2xl font-bold text-center">{config.conversion.swimToRun}km chạy = 1km bơi</p>
                  <p className="text-sm text-gray-600 text-center mt-2">(thiếu chạy lấy bơi để bù)</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-bold text-blue-700 mb-2">Chạy → Bơi</p>
                  <p className="text-2xl font-bold text-center">{config.conversion.runToSwim}km chạy = 1km bơi</p>
                  <p className="text-sm text-gray-600 text-center mt-2">(thiếu bơi lấy chạy để bù)</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Lưu ý:</strong> Riêng thử thách 10 ngày cuối <strong>KHÔNG</strong> được quy đổi.
                </p>
              </div>
            </div>

            {/* Chấn thương / Ốm */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-orange-500">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">🏥 Chấn thương / Ốm đau</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    Nếu bị chấn thương/ốm không tập được: <strong>tự báo cáo trên app</strong> kèm bằng chứng (hình ảnh).
                  </p>
                </div>
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    Admin sẽ xem xét và <strong>quyết định mức giảm KPI phù hợp</strong> (25%, 50%, 75%, hoặc 100%).
                  </p>
                </div>
                <div className="flex items-start">
                  <Medal className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    {config.rewards.injuryPenalty}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-700 mt-2">
                  <strong>📋 Quy trình:</strong> Gửi yêu cầu → Admin duyệt → KPI được điều chỉnh tự động
                </div>
              </div>
            </div>

            {/* Reporting */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-purple-500">
              <div className="flex items-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">📱 Báo cáo kết quả</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-bold text-purple-700 mb-2">📲 Ứng dụng</h3>
                  <p className="text-gray-700">
                    • <strong>Phải cài Strava</strong> và kết nối với app của Challenge
                  </p>
                  <p className="text-gray-700">
                    • Kết quả sẽ tự động tổng hợp
                  </p>
                </div>
                
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="font-bold text-pink-700 mb-2">❤️ Yêu cầu tracklog</h3>
                  <p className="text-gray-700">
                    • Tracklog phải có <strong>nhịp tim trung bình lớn hơn {config.requirements.minHeartRate} bpm</strong>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    (để đảm bảo là có tập thật)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Penalties & Rewards */}
          <div className="space-y-6">
            {/* Penalties */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-red-500">
              <div className="flex items-center mb-4">
                <DollarSign className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">💰 Thưởng phạt</h2>
              </div>
              
              {/* Quyết tâm phí */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-2">💎 Quyết tâm phí (Deposit)</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xl font-bold text-blue-600 text-center">
                    {formatCurrency(config.payment.depositAmount)}
                  </p>
                  <p className="text-sm text-gray-600 text-center mt-1">
                    Nộp vào quỹ nhóm {config.payment.bank} - công khai thu chi cho toàn bộ members
                  </p>
                </div>
              </div>
              
              {/* Phạt thiếu KPI */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">📉 Phạt thiếu KPI (tính theo km)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="mr-2 text-xl">🏃</span>
                      <span className="font-bold text-gray-900">Chạy thiếu</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(config.penalties.run)}/km</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="mr-2 text-xl">🏊</span>
                      <span className="font-bold text-gray-900">Bơi thiếu</span>
                    </div>
                    <p className="text-2xl font-bold text-teal-600">{formatCurrency(config.penalties.swim)}/km</p>
                  </div>
                </div>
              </div>
              
              {/* Thời hạn nộp phạt */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-2">⏳ Thời hạn nộp phạt</h3>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="font-bold">Hết tháng nộp phạt ngay trong vòng {config.payment.penaltyDeadline} ngày</span>
                  </div>
                  <p className="text-sm text-red-600 font-bold">
                    ⚠️ Ai nộp chậm hoặc không nộp sẽ lập tức bị loại, 
                    không được nhận lại tiền deposit và tiền nộp phạt các tháng trước.
                  </p>
                </div>
              </div>
              
              {/* Phạt gian lận */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">🚫 Phạt gian lận</h3>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(config.penalties.cheating)}/lần</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Quá 3 lần sẽ bị loại khỏi thử thách. Việc xác định gian lận do các thành viên giám sát và kết luận bằng hình thức lập poll.
                  </p>
                  <p className="text-sm text-red-600 italic mt-2">
                    "Thử thách này Vì tiền – không vì công lý nên ace xác định đã lập poll thì khả năng cao là có tội 😄"
                  </p>
                </div>
              </div>
            </div>

            {/* Rewards & Medal */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-green-500">
              <div className="flex items-center mb-4">
                <Medal className="w-6 h-6 text-yellow-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">🏆 Điều kiện nhận Medal</h2>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                <p className="text-xl font-bold text-green-600 text-center">
                  {config.rewards.medalCondition} 🙂
                </p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-yellow-800 mb-2">🎁 Sử dụng tiền phạt</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Medal className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-700">Làm medal/áo/cúp</span>
                  </div>
                  <div className="flex items-start">
                    <Users className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-700">Liên hoan cuối challenge (Campuchia tiền)</span>
                  </div>
                  <div className="flex items-start">
                    <Heart className="w-4 h-4 text-red-600 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-700">Quỹ từ thiện nếu thừa</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 mb-2">🏦 Thông tin tài khoản</h3>
                <p className="text-gray-700">
                  <strong>Ngân hàng {config.payment.bank}:</strong> {config.payment.accountNumber}
                </p>
                <p className="text-gray-700">
                  <strong>Chủ tài khoản:</strong> {config.payment.accountName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  QRcode để nộp Quyết tâm phí và Nộp phạt (hiển thị trong app)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acceptance & Action */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bạn đã sẵn sàng?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tham gia challenge 100 ngày để rèn luyện sức khoẻ, kỷ luật và có cơ hội nhận phần thưởng hấp dẫn.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start justify-center mb-8">
            <input
              type="checkbox"
              id="agree"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
            />
            <label htmlFor="agree" className="text-gray-700">
              <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                Tôi đã đọc, hiểu và đồng ý với TẤT CẢ quy tắc của {seasonName}.
              </span>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                • Tôi hiểu rằng nếu không hoàn thành KPI sẽ phải nộp phạt theo quy định<br/>
                • Tôi cam kết tham gia nghiêm túc, trung thực và tuân thủ mọi quy tắc<br/>
                • Tôi đồng ý với các điều khoản về chấn thương, nộp phạt và sử dụng tiền phạt<br/>
                • Tôi đã đọc và hiểu rõ về điều kiện nhận medal<br/>
                • Tôi hiểu rõ về thử thách 10 ngày cuối và các phương án
              </p>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 justify-center">
            <button
              onClick={handleJoin}
              disabled={!accepted}
              className={`px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center ${
                accepted 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:opacity-90 shadow-lg transform hover:scale-105' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">{accepted ? 'TÔI ĐÃ SẴN SÀNG - THAM GIA NGAY' : 'VUI LÒNG ĐỌC VÀ ĐỒNG Ý QUY TẮC'}</span>
              <span className="sm:hidden">{accepted ? 'THAM GIA NGAY' : 'ĐỒNG Ý QUY TẮC'}</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2 flex-shrink-0" />
            </button>

            <button
              onClick={handleLogin}
              className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold text-sm sm:text-base md:text-lg hover:opacity-90 transition shadow-lg flex items-center justify-center hover:scale-105 transform"
            >
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">ĐĂNG NHẬP (Đã tham gia các mùa trước)</span>
              <span className="sm:hidden">ĐĂNG NHẬP</span>
            </button>
          </div>

          {/* Final Warning */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-blue-200">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                <strong>⚠️ LƯU Ý CUỐI CÙNG:</strong> Challenge này <strong>VÌ TIỀN - KHÔNG VÌ CÔNG LÝ</strong>.<br/>
                Tham gia là bạn đã chấp nhận mọi rủi ro và quy tắc. Hãy tham gia vì sức khoẻ và tinh thần thể thao!
              </p>
              <p className="text-lg font-bold text-green-600 mt-4">
                💪 RÈN LUYỆN SỨC KHOẺ - RÈN LUYỆN KỶ LUẬT - CÙNG NHAU PHÁT TRIỂN! 💪
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
