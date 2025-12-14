import React, { useState, useEffect } from 'react';
import challengeConfig from '../services/challengeConfig';
import { 
  Settings, Save, RefreshCw, Calendar, DollarSign,
  Target, Activity, Timer, Users, Banknote,
  Shield, AlertCircle, CheckCircle, XCircle,
  Eye  // THÊM DÒNG NÀY - import icon Eye
} from 'lucide-react';

function AdminConfig() {
  const [config, setConfig] = useState(challengeConfig.getConfig());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  // Cập nhật preview khi config thay đổi
  useEffect(() => {
    const tempConfig = new challengeConfig.constructor();
    tempConfig.config = config;
    tempConfig.calculateDates();
    setPreview(tempConfig.getConfig());
  }, [config]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., monthlyTargets.male.run)
      const keys = name.split('.');
      setConfig(prev => {
        const newConfig = { ...prev };
        let current = newConfig;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = type === 'checkbox' ? checked : 
          type === 'number' ? parseFloat(value) : value;
        
        return newConfig;
      });
    } else {
      setConfig(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : 
                type === 'number' ? parseFloat(value) : value
      }));
    }
  };

  const handleSave = () => {
    try {
      challengeConfig.updateConfig(config);
      setSaved(true);
      setError('');
      
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Lỗi khi lưu cấu hình: ' + err.message);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn reset về cấu hình mặc định?')) {
      challengeConfig.resetToDefault();
      setConfig(challengeConfig.getConfig());
      setSaved(false);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Settings className="w-8 h-8 mr-3" />
                Cấu Hình Challenge
              </h1>
              <p className="opacity-90">Thiết lập thông số cho challenge mới</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Mùa {config.season}</div>
              <div className="text-sm opacity-90">{config.seasonName}</div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700 font-medium">✅ Đã lưu cấu hình thành công!</span>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Configuration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Thông Số Cơ Bản
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số mùa *
                  </label>
                  <input
                    type="number"
                    name="season"
                    value={config.season}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên mùa *
                  </label>
                  <input
                    type="text"
                    name="seasonName"
                    value={config.seasonName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ví dụ: Mùa 7 - Vì TIỀN"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={config.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số tháng challenge *
                  </label>
                  <input
                    type="number"
                    name="durationMonths"
                    value={config.durationMonths}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="12"
                  />
                </div>
              </div>
            </div>

            {/* KPI Configuration */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                KPI Hàng Tháng (km)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-700 mb-4">👨 Nam</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chạy bộ (km/tháng)
                      </label>
                      <input
                        type="number"
                        name="monthlyTargets.male.run"
                        value={config.monthlyTargets.male.run}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bơi lội (km/tháng)
                      </label>
                      <input
                        type="number"
                        name="monthlyTargets.male.swim"
                        value={config.monthlyTargets.male.swim}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-pink-50 rounded-lg">
                  <h3 className="font-bold text-pink-700 mb-4">👩 Nữ</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chạy bộ (km/tháng)
                      </label>
                      <input
                        type="number"
                        name="monthlyTargets.female.run"
                        value={config.monthlyTargets.female.run}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bơi lội (km/tháng)
                      </label>
                      <input
                        type="number"
                        name="monthlyTargets.female.swim"
                        value={config.monthlyTargets.female.swim}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Limits */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Giới Hạn Hàng Ngày (km)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold text-green-700 mb-4">📅 Thứ 2 - Thứ 6</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chạy bộ (tối đa)
                      </label>
                      <input
                        type="number"
                        name="dailyLimits.weekday.run"
                        value={config.dailyLimits.weekday.run}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bơi lội (tối đa)
                      </label>
                      <input
                        type="number"
                        name="dailyLimits.weekday.swim"
                        value={config.dailyLimits.weekday.swim}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-bold text-yellow-700 mb-4">🎉 Thứ 7 - Chủ Nhật</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chạy bộ (tối đa)
                      </label>
                      <input
                        type="number"
                        name="dailyLimits.weekend.run"
                        value={config.dailyLimits.weekend.run}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bơi lội (tối đa)
                      </label>
                      <input
                        type="number"
                        name="dailyLimits.weekend.swim"
                        value={config.dailyLimits.weekend.swim}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Penalties */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Mức Phạt (VNĐ)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chạy thiếu/km
                  </label>
                  <input
                    type="number"
                    name="penalties.run"
                    value={config.penalties.run}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bơi thiếu/km
                  </label>
                  <input
                    type="number"
                    name="penalties.swim"
                    value={config.penalties.swim}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thử thách cuối/môn
                  </label>
                  <input
                    type="number"
                    name="penalties.finalChallenge"
                    value={config.penalties.finalChallenge}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quyết tâm phí
                  </label>
                  <input
                    type="number"
                    name="penalties.deposit"
                    value={config.penalties.deposit}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Eye className="w-5 h-5 mr-2" /> {/* SỬA DÒNG NÀY */}
                Xem Trước
              </h2>
              
              {preview && (
                <div className="space-y-6">
                  {/* Season Info */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-blue-700 mb-2">📅 Thời Gian</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Mùa:</strong> {preview.season} - {preview.seasonName}</p>
                      <p><strong>Bắt đầu:</strong> {challengeConfig.formatDate(preview.startDate)}</p>
                      <p><strong>Kết thúc:</strong> {challengeConfig.formatDate(preview.endDate)}</p>
                      <p><strong>10 ngày cuối:</strong> {challengeConfig.formatDate(preview.finalChallengeStart)} - {challengeConfig.formatDate(preview.finalChallengeEnd)}</p>
                      <p><strong>Tổng thời gian:</strong> {preview.durationMonths} tháng</p>
                    </div>
                  </div>
                  
                  {/* KPI Preview */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold text-green-700 mb-2">🎯 KPI Hàng Tháng</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-sm">👨 Nam:</p>
                        <p className="text-sm">Chạy: {preview.monthlyTargets.male.run}km | Bơi: {preview.monthlyTargets.male.swim}km</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">👩 Nữ:</p>
                        <p className="text-sm">Chạy: {preview.monthlyTargets.female.run}km | Bơi: {preview.monthlyTargets.female.swim}km</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Daily Limits Preview */}
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-bold text-yellow-700 mb-2">⚡ Giới Hạn Ngày</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-sm">Thứ 2-6:</p>
                        <p className="text-sm">Chạy: ≤{preview.dailyLimits.weekday.run}km | Bơi: ≤{preview.dailyLimits.weekday.swim}km</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Thứ 7-CN:</p>
                        <p className="text-sm">Chạy: ≤{preview.dailyLimits.weekend.run}km | Bơi: ≤{preview.dailyLimits.weekend.swim}km</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Penalties Preview */}
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h3 className="font-bold text-red-700 mb-2">💰 Mức Phạt</h3>
                    <div className="space-y-1 text-sm">
                      <p>• Chạy thiếu: {challengeConfig.formatCurrency(preview.penalties.run)}/km</p>
                      <p>• Bơi thiếu: {challengeConfig.formatCurrency(preview.penalties.swim)}/km</p>
                      <p>• Thử thách cuối: {challengeConfig.formatCurrency(preview.penalties.finalChallenge)}/môn</p>
                      <p>• Gian lận: {challengeConfig.formatCurrency(preview.penalties.cheating)}/lần</p>
                      <p>• Quyết tâm phí: {challengeConfig.formatCurrency(preview.penalties.deposit)}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="pt-6 border-t border-gray-200">
                    <div className="space-y-3">
                      <button
                        onClick={handleSave}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center"
                      >
                        <Save className="w-5 h-5 mr-2" />
                        Lưu Cấu Hình
                      </button>
                      
                      <button
                        onClick={handleReset}
                        className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition flex items-center justify-center"
                      >
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Reset Về Mặc Định
                      </button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700">
                        <AlertCircle className="inline w-4 h-4 mr-1" />
                        Cấu hình sẽ được lưu trong trình duyệt và áp dụng ngay lập tức.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminConfig;
