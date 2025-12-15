import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  AlertCircle, Camera, Upload, X, Clock, CheckCircle, XCircle,
  Heart, Thermometer, Calendar, FileText, Send, ChevronDown, ChevronUp
} from 'lucide-react';

// Các loại exception
const EXCEPTION_TYPES = {
  INJURY: { id: 'injury', label: '🩹 Chấn thương', color: 'red' },
  ILLNESS: { id: 'illness', label: '🤒 Ốm đau / Bệnh', color: 'orange' },
  FAMILY_EMERGENCY: { id: 'family_emergency', label: '👨‍👩‍👧 Việc gia đình khẩn cấp', color: 'purple' },
  SINGLE_SPORT: { id: 'single_sport', label: '🏊 Chỉ chơi 1 môn trong tháng', color: 'blue' },
  OTHER: { id: 'other', label: '📝 Lý do khác', color: 'gray' }
};

// Các tháng trong thử thách (3 tháng chẵn, không áp dụng 10 ngày cuối)
const CHALLENGE_MONTHS = [
  { value: 1, label: 'Tháng 1 (01/11 - 30/11/2025)' },
  { value: 2, label: 'Tháng 2 (01/12 - 31/12/2025)' },
  { value: 3, label: 'Tháng 3 (01/01 - 31/01/2026)' }
];

// Các môn thể thao
const SPORT_OPTIONS = [
  { value: 'run', label: '🏃 Chỉ chạy (KPI chạy x2)' },
  { value: 'swim', label: '🏊 Chỉ bơi (KPI bơi x2)' }
];

// Mức giảm KPI đề xuất
const REDUCTION_OPTIONS = [
  { value: 25, label: 'Giảm 25% KPI' },
  { value: 50, label: 'Giảm 50% KPI' },
  { value: 75, label: 'Giảm 75% KPI' },
  { value: 100, label: 'Miễn KPI hoàn toàn (100%)' }
];

// Hàm resize và nén ảnh trước khi upload
const resizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tính toán kích thước mới
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Vẽ lên canvas với kích thước mới
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert sang blob với chất lượng thấp hơn
        canvas.toBlob(
          (blob) => {
            // Tạo file mới từ blob
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

function KPIExceptionRequest({ user, onClose }) {
  const [formData, setFormData] = useState({
    exceptionType: '',
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reductionPercent: 50,
    notes: '',
    // Cho trường hợp chỉ chơi 1 môn
    singleSportType: '', // 'run' hoặc 'swim'
    challengeMonth: 1 // tháng 1-4 của thử thách
  });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadMyRequests();
    }
  }, [user]);

  const loadMyRequests = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'kpi_exceptions'),
        where('userId', '==', user.uid),
        orderBy('requestedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const requests = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || new Date(data.requestedAt),
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          endDate: data.endDate?.toDate?.() || new Date(data.endDate)
        });
      });
      setMyRequests(requests);
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // Tăng limit lên 10MB vì sẽ resize
        setError(`File ${file.name} quá lớn (max 10MB)`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} không phải hình ảnh`);
        return false;
      }
      return true;
    });

    if (validFiles.length + evidenceFiles.length > 5) {
      setError('Tối đa 5 hình ảnh');
      return;
    }

    setError('');
    setUploading(true);
    
    try {
      // Resize và preview files
      const newFiles = await Promise.all(validFiles.map(async (file) => {
        // Resize ảnh xuống max 800px và chất lượng 70%
        const resizedFile = await resizeImage(file, 800, 800, 0.7);
        
        // Tạo preview
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const originalSize = (file.size / 1024).toFixed(1);
            const newSize = (resizedFile.size / 1024).toFixed(1);
            console.log(`Resized ${file.name}: ${originalSize}KB → ${newSize}KB`);
            
            resolve({
              file: resizedFile,
              preview: e.target.result,
              name: file.name,
              originalSize: file.size,
              newSize: resizedFile.size
            });
          };
          reader.readAsDataURL(resizedFile);
        });
      }));

      setEvidenceFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      console.error('Error resizing images:', err);
      setError('Lỗi khi xử lý ảnh');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadEvidence = async () => {
    if (evidenceFiles.length === 0) return [];

    const uploadedUrls = [];
    for (const fileData of evidenceFiles) {
      const fileName = `kpi_exceptions/${user.uid}/${Date.now()}_${fileData.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, fileData.file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.exceptionType) {
      setError('Vui lòng chọn loại yêu cầu');
      return;
    }
    
    // Validation riêng cho trường hợp chỉ chơi 1 môn
    if (formData.exceptionType === 'single_sport') {
      if (!formData.singleSportType) {
        setError('Vui lòng chọn môn bạn có thể chơi');
        return;
      }
      if (!formData.challengeMonth) {
        setError('Vui lòng chọn tháng áp dụng');
        return;
      }
    }
    
    if (!formData.reason.trim()) {
      setError('Vui lòng nhập lý do chi tiết');
      return;
    }
    if (formData.exceptionType !== 'single_sport' && new Date(formData.startDate) > new Date(formData.endDate)) {
      return;
    }

    setSubmitting(true);

    try {
      // Upload evidence images
      setUploading(true);
      const evidenceUrls = await uploadEvidence();
      setUploading(false);

      // Create exception request
      const requestData = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0],
        exceptionType: formData.exceptionType,
        reason: formData.reason,
        evidence: evidenceUrls,
        status: 'pending',
        requestedAt: serverTimestamp(),
        notes: formData.notes
      };
      
      // Thêm fields dựa trên loại exception
      if (formData.exceptionType === 'single_sport') {
        // Trường hợp chỉ chơi 1 môn trong tháng
        requestData.singleSportType = formData.singleSportType;
        requestData.challengeMonth = formData.challengeMonth;
        requestData.reductionPercent = 0; // Không giảm KPI, chỉ đổi cách tính
      } else {
        // Trường hợp chấn thương/ốm/khẩn cấp
        requestData.startDate = Timestamp.fromDate(new Date(formData.startDate));
        requestData.endDate = Timestamp.fromDate(new Date(formData.endDate));
        requestData.reductionPercent = formData.reductionPercent;
        requestData.month = new Date().getMonth() + 1;
        requestData.year = new Date().getFullYear();
      }

      await addDoc(collection(db, 'kpi_exceptions'), requestData);

      setSuccess(true);
      setFormData({
        exceptionType: '',
        reason: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reductionPercent: 50,
        notes: '',
        singleSportType: '',
        challengeMonth: 1
      });
      setEvidenceFiles([]);
      loadMyRequests();

      // Auto close after 3 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);

    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Lỗi gửi yêu cầu: ' + err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center"><XCircle className="w-3 h-3 mr-1" />Từ chối</span>;
      default:
        return null;
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Gửi yêu cầu thành công!</h3>
          <p className="text-gray-600">
            Admin sẽ xem xét và phản hồi trong thời gian sớm nhất.
            Bạn sẽ nhận được thông báo khi có kết quả.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Heart className="w-6 h-6 mr-3" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Báo cáo Chấn thương / Ốm</h2>
              <p className="text-sm opacity-90">Yêu cầu điều chỉnh KPI</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* My Requests History */}
        {myRequests.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <span className="font-medium text-gray-700">
                📋 Lịch sử yêu cầu của bạn ({myRequests.length})
              </span>
              {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showHistory && (
              <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                {myRequests.map(req => (
                  <div key={req.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{EXCEPTION_TYPES[req.exceptionType?.toUpperCase()]?.label || req.exceptionType}</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{req.reason}</p>
                    <div className="text-xs text-gray-500">
                      {req.exceptionType === 'single_sport' ? (
                        <>
                          Tháng {req.challengeMonth} - {req.singleSportType === 'run' ? '🏃 Chỉ chạy' : '🏊 Chỉ bơi'}
                          {req.status === 'approved' && <span className="ml-2 text-green-600">• Đã duyệt</span>}
                        </>
                      ) : (
                        <>
                          {req.startDate?.toLocaleDateString('vi-VN')} - {req.endDate?.toLocaleDateString('vi-VN')}
                          {req.status === 'approved' && <span className="ml-2 text-green-600">• Giảm {req.approvedReduction || req.reductionPercent}% KPI</span>}
                        </>
                      )}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <span className="ml-2 text-red-600">• {req.rejectionReason}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exception Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại yêu cầu *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(EXCEPTION_TYPES).map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exceptionType: type.id }))}
                  className={`p-3 rounded-lg border text-left transition ${
                    formData.exceptionType === type.id
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm sm:text-base">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Single Sport Options - chỉ hiện khi chọn loại này */}
          {formData.exceptionType === 'single_sport' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <div className="text-sm text-blue-700 mb-2">
                <strong>📋 Lưu ý:</strong> Khi được duyệt, bạn chỉ cần hoàn thành KPI của môn đã chọn với mức gấp đôi bình thường.
                Không áp dụng cho cả thử thách, chỉ 1 tháng cụ thể.
              </div>
              
              {/* Chọn môn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Môn bạn có thể chơi *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, singleSportType: opt.value }))}
                      className={`p-3 rounded-lg border text-center transition ${
                        formData.singleSportType === opt.value
                          ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-200 font-medium'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn tháng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tháng áp dụng *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CHALLENGE_MONTHS.map(month => (
                    <button
                      key={month.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, challengeMonth: month.value }))}
                      className={`p-2 rounded-lg border text-sm transition ${
                        formData.challengeMonth === month.value
                          ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-200 font-medium'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Date Range - chỉ hiện cho các loại khác */}
          {formData.exceptionType && formData.exceptionType !== 'single_sport' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Từ ngày *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Đến ngày *
                </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                required
              />
            </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline w-4 h-4 mr-1" />
              Lý do chi tiết *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
              rows={3}
              placeholder={formData.exceptionType === 'single_sport' 
                ? "Giải thích tại sao bạn chỉ có thể chơi 1 môn trong tháng này (VD: không có hồ bơi, chấn thương không chạy được...)"
                : "Mô tả chi tiết tình trạng của bạn..."}
              required
            />
          </div>

          {/* Reduction Percent - chỉ hiện cho các loại khác single_sport */}
          {formData.exceptionType && formData.exceptionType !== 'single_sport' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mức giảm KPI đề xuất *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REDUCTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, reductionPercent: opt.value }))}
                    className={`p-2 rounded-lg border text-sm transition ${
                      formData.reductionPercent === opt.value
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                * Mức giảm cuối cùng do Admin quyết định
              </p>
            </div>
          )}

          {/* Evidence Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline w-4 h-4 mr-1" />
              Bằng chứng (hình ảnh) *
            </label>
            
            {/* Preview uploaded files */}
            {evidenceFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {evidenceFiles.map((file, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-orange-600">Chọn hình</span> hoặc kéo thả
                </p>
                <p className="text-xs text-gray-400">PNG, JPG (max 5MB, tối đa 5 hình)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú thêm (tuỳ chọn)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
              rows={2}
              placeholder="Thông tin bổ sung nếu có..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {uploading ? 'Đang tải hình...' : 'Đang gửi...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Gửi yêu cầu
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">📋 Quy trình xử lý:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Bạn gửi yêu cầu kèm bằng chứng</li>
            <li>Admin xem xét và quyết định mức giảm KPI phù hợp</li>
            <li>Bạn nhận thông báo kết quả</li>
            <li>KPI tháng này sẽ được điều chỉnh tự động</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default KPIExceptionRequest;
