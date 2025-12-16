import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
  query, where, orderBy, serverTimestamp, Timestamp, setDoc, getDoc
} from 'firebase/firestore';
import { 
  Calendar, Star, Waves, Footprints, Plus, Edit, Trash2, 
  Save, X, CheckCircle, AlertCircle, Clock, Users, Award,
  ChevronDown, ChevronUp, Eye, Sparkles, ToggleLeft, ToggleRight
} from 'lucide-react';

// Loại sự kiện
const EVENT_TYPES = {
  SPECIAL_DAY: { id: 'special_day', label: '📅 Ngày đặc biệt', color: 'purple', description: 'Áp dụng cho tất cả mọi người vào ngày cụ thể' },
  CHARITY_EVENT: { id: 'charity_event', label: '❤️ Sự kiện từ thiện', color: 'red', description: 'Người dùng tự gán activity vào sự kiện' },
  COMPETITION: { id: 'competition', label: '🏆 Giải đấu', color: 'orange', description: 'Người dùng tự gán activity vào sự kiện' }
};

// Loại hoạt động
const ACTIVITY_TYPES = {
  SWIM: { id: 'swim', label: '🏊 Bơi', icon: Waves },
  RUN: { id: 'run', label: '🏃 Chạy', icon: Footprints },
  BOTH: { id: 'both', label: '🏊🏃 Cả hai', icon: Award }
};

// Giới tính áp dụng
const GENDER_TARGETS = {
  ALL: { id: 'all', label: '👥 Tất cả', description: 'Áp dụng cho cả nam và nữ' },
  MALE: { id: 'male', label: '👨 Nam', description: 'Chỉ áp dụng cho nam' },
  FEMALE: { id: 'female', label: '👩 Nữ', description: 'Chỉ áp dụng cho nữ' }
};

// Sự kiện mặc định hằng năm
const DEFAULT_ANNUAL_EVENTS = [
  {
    name: '🎊 Tết Dương lịch',
    description: 'Chào đón năm mới Dương lịch! Một ngày để nghỉ ngơi, sum họp gia đình và đón chào những điều tốt đẹp của năm mới.',
    monthDay: '01-01',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🎊'
  },
  {
    name: '🧧 Tết Nguyên đán (Mùng 1)',
    description: 'Tết Nguyên đán - Tết cổ truyền của dân tộc Việt Nam, ngày đầu tiên của năm mới Âm lịch. Đây là dịp để gia đình sum họp, thờ cúng tổ tiên và chúc tụng nhau những điều tốt lành.',
    lunarDate: '01-01',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🧧'
  },
  {
    name: '🧧 Tết Nguyên đán (Mùng 2)',
    description: 'Ngày mùng 2 Tết - Tiếp tục đón Tết cổ truyền, thăm họ hàng và chúc Tết.',
    lunarDate: '01-02',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🧧'
  },
  {
    name: '🧧 Tết Nguyên đán (Mùng 3)',
    description: 'Ngày mùng 3 Tết - Ngày cuối cùng của 3 ngày Tết truyền thống.',
    lunarDate: '01-03',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🧧'
  },
  {
    name: '🌸 Ngày Quốc tế Phụ nữ',
    description: 'Ngày 8/3 - Ngày Quốc tế Phụ nữ, tôn vinh phái đẹp và những đóng góp của phụ nữ trong xã hội. Chúc các chị em luôn xinh đẹp, hạnh phúc và thành công!',
    monthDay: '03-08',
    genderTarget: 'female',
    activityType: 'both',
    emoji: '🌸'
  },
  {
    name: '🏛️ Giỗ Tổ Hùng Vương',
    description: 'Ngày Giỗ Tổ Hùng Vương (10/3 Âm lịch) - Ngày lễ quốc gia để tưởng nhớ và tỏ lòng biết ơn công lao dựng nước của các Vua Hùng. "Dù ai đi ngược về xuôi, nhớ ngày Giỗ Tổ mùng mười tháng ba".',
    lunarDate: '03-10',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🏛️'
  },
  {
    name: '🎗️ Ngày Giải phóng miền Nam',
    description: 'Ngày 30/4 - Ngày Giải phóng miền Nam, thống nhất đất nước. Kỷ niệm chiến thắng lịch sử và tinh thần đoàn kết dân tộc.',
    monthDay: '04-30',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🎗️'
  },
  {
    name: '👷 Ngày Quốc tế Lao động',
    description: 'Ngày 1/5 - Ngày Quốc tế Lao động, tôn vinh những người lao động và thành quả của họ. Một ngày để nghỉ ngơi và tri ân những đóng góp thầm lặng.',
    monthDay: '05-01',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '👷'
  },
  {
    name: '🇻🇳 Ngày Quốc khánh',
    description: 'Ngày 2/9 - Quốc khánh nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Kỷ niệm ngày Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập, khai sinh ra nước Việt Nam Dân chủ Cộng hòa (1945).',
    monthDay: '09-02',
    genderTarget: 'all',
    activityType: 'both',
    emoji: '🇻🇳'
  },
  {
    name: '💐 Ngày Phụ nữ Việt Nam',
    description: 'Ngày 20/10 - Ngày Phụ nữ Việt Nam, kỷ niệm ngày thành lập Hội Liên hiệp Phụ nữ Việt Nam (1930). Tôn vinh vẻ đẹp, sự hy sinh và cống hiến của người phụ nữ Việt Nam.',
    monthDay: '10-20',
    genderTarget: 'female',
    activityType: 'both',
    emoji: '💐'
  },
  {
    name: '🎩 Ngày Quốc tế Nam giới',
    description: 'Ngày 19/11 - Ngày Quốc tế Nam giới, tôn vinh vai trò và đóng góp của nam giới trong gia đình và xã hội. Ngày để quan tâm đến sức khỏe và hạnh phúc của các đấng mày râu.',
    monthDay: '11-19',
    genderTarget: 'male',
    activityType: 'both',
    emoji: '🎩'
  }
];

// Hàm tính ngày Âm lịch sang Dương lịch (đơn giản hóa cho năm 2025-2026)
const LUNAR_TO_SOLAR_2025_2026 = {
  '2025': {
    '01-01': '2025-01-29', // Tết Nguyên đán 2025 (Ất Tỵ)
    '01-02': '2025-01-30',
    '01-03': '2025-01-31',
    '03-10': '2025-04-06'  // Giỗ Tổ Hùng Vương 2025
  },
  '2026': {
    '01-01': '2026-02-17', // Tết Nguyên đán 2026 (Bính Ngọ)
    '01-02': '2026-02-18',
    '01-03': '2026-02-19',
    '03-10': '2026-04-25'  // Giỗ Tổ Hùng Vương 2026
  }
};

// Lấy ngày dương lịch từ ngày âm lịch
const getLunarToSolarDate = (lunarDate, year) => {
  const mapping = LUNAR_TO_SOLAR_2025_2026[year];
  if (mapping && mapping[lunarDate]) {
    return mapping[lunarDate];
  }
  return null;
};

function SpecialEventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventParticipants, setEventParticipants] = useState({}); // Đếm số người tham gia mỗi sự kiện
  const [expandedEvent, setExpandedEvent] = useState(null); // Event đang xem chi tiết
  const [participantDetails, setParticipantDetails] = useState({}); // Chi tiết người tham gia
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [defaultEventsSettings, setDefaultEventsSettings] = useState({}); // Trạng thái bật/tắt sự kiện mặc định
  const [showDefaultEvents, setShowDefaultEvents] = useState(true); // Toggle hiển thị section

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'special_day',
    activityType: 'both',
    genderTarget: 'all',
    date: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    isActive: true
  });

  useEffect(() => {
    loadEvents();
    loadDefaultEventsSettings();
  }, []);

  // Load cài đặt sự kiện mặc định từ Firestore
  const loadDefaultEventsSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'default_events');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDefaultEventsSettings(docSnap.data().events || {});
      }
    } catch (err) {
      console.error('Error loading default events settings:', err);
    }
  };

  // Toggle trạng thái sự kiện mặc định
  const toggleDefaultEvent = async (eventKey) => {
    try {
      const newStatus = !isDefaultEventEnabled(eventKey);
      const newSettings = { ...defaultEventsSettings, [eventKey]: newStatus };
      
      // Lưu vào Firestore
      const settingsRef = doc(db, 'settings', 'default_events');
      await setDoc(settingsRef, { events: newSettings, updatedAt: serverTimestamp() }, { merge: true });
      
      setDefaultEventsSettings(newSettings);
      setSuccess(`${newStatus ? 'Bật' : 'Tắt'} sự kiện thành công!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error toggling default event:', err);
      setError('Lỗi cập nhật trạng thái sự kiện');
    }
  };

  // Kiểm tra sự kiện mặc định có được bật không
  const isDefaultEventEnabled = (eventKey) => {
    // Mặc định là bật nếu chưa có setting
    return defaultEventsSettings[eventKey] !== false;
  };

  // Tạo key duy nhất cho mỗi sự kiện mặc định
  const getDefaultEventKey = (evt) => {
    return evt.monthDay || evt.lunarDate;
  };
  // Lấy các sự kiện mặc định cho hôm nay
  const getTodayDefaultEvents = () => {
    const today = new Date();
    const year = today.getFullYear().toString();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayStr = today.toISOString().split('T')[0];
    
    const todayEvents = [];
    
    for (const evt of DEFAULT_ANNUAL_EVENTS) {
      let isToday = false;
      
      if (evt.monthDay) {
        // Sự kiện theo ngày dương lịch
        isToday = evt.monthDay === monthDay;
      } else if (evt.lunarDate) {
        // Sự kiện theo ngày âm lịch
        const solarDate = getLunarToSolarDate(evt.lunarDate, year);
        isToday = solarDate === todayStr;
      }
      
      if (isToday) {
        todayEvents.push({
          ...evt,
          isDefault: true,
          date: today
        });
      }
    }
    
    return todayEvents;
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'special_events'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const eventsData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.() || (data.date ? new Date(data.date) : null),
          startDate: data.startDate?.toDate?.() || (data.startDate ? new Date(data.startDate) : null),
          endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : null),
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });
      setEvents(eventsData);
      
      // Load số người tham gia cho mỗi sự kiện
      await loadParticipantCounts(eventsData);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Lỗi tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantCounts = async (eventsData) => {
    const counts = {};
    for (const event of eventsData) {
      if (event.eventType !== 'special_day') {
        const q = query(
          collection(db, 'event_participations'),
          where('eventId', '==', event.id)
        );
        const snapshot = await getDocs(q);
        counts[event.id] = snapshot.size;
      }
    }
    setEventParticipants(counts);
  };

  // Load chi tiết người tham gia cho một sự kiện
  const loadParticipantDetails = async (eventId) => {
    if (participantDetails[eventId]) {
      // Đã load rồi, toggle expand
      setExpandedEvent(expandedEvent === eventId ? null : eventId);
      return;
    }

    setLoadingParticipants(true);
    try {
      // Lấy danh sách participations
      const q = query(
        collection(db, 'event_participations'),
        where('eventId', '==', eventId)
      );
      const snapshot = await getDocs(q);
      
      const participants = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Lấy thông tin user
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('__name__', '==', data.userId)
        ));
        
        let userName = 'Unknown';
        let userEmail = '';
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userName = userData.fullName || userData.displayName || userData.email?.split('@')[0] || 'Unknown';
          userEmail = userData.email || '';
        }

        participants.push({
          id: docSnap.id,
          ...data,
          userName,
          userEmail,
          assignedAt: data.assignedAt?.toDate?.() || new Date()
        });
      }

      // Sắp xếp theo thời gian gán
      participants.sort((a, b) => b.assignedAt - a.assignedAt);

      setParticipantDetails(prev => ({
        ...prev,
        [eventId]: participants
      }));
      setExpandedEvent(eventId);
    } catch (err) {
      console.error('Error loading participant details:', err);
      setError('Lỗi tải danh sách người tham gia');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      eventType: 'special_day',
      activityType: 'both',
      genderTarget: 'all',
      date: new Date().toISOString().split('T')[0],
      startDate: '',
      endDate: '',
      isActive: true
    });
    setEditingEvent(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || '',
      eventType: event.eventType,
      activityType: event.activityType || 'both',
      genderTarget: event.genderTarget || 'all',
      date: event.date ? event.date.toISOString().split('T')[0] : '',
      startDate: event.startDate ? event.startDate.toISOString().split('T')[0] : '',
      endDate: event.endDate ? event.endDate.toISOString().split('T')[0] : '',
      isActive: event.isActive !== false
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên sự kiện');
      return;
    }

    try {
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        eventType: formData.eventType,
        activityType: formData.activityType,
        genderTarget: formData.genderTarget,
        isActive: formData.isActive
      };

      // Xử lý ngày tùy theo loại sự kiện
      if (formData.eventType === 'special_day') {
        if (!formData.date) {
          setError('Vui lòng chọn ngày');
          return;
        }
        eventData.date = Timestamp.fromDate(new Date(formData.date));
      } else {
        // Sự kiện có khoảng thời gian
        if (!formData.startDate || !formData.endDate) {
          setError('Vui lòng chọn ngày bắt đầu và kết thúc');
          return;
        }
        eventData.startDate = Timestamp.fromDate(new Date(formData.startDate));
        eventData.endDate = Timestamp.fromDate(new Date(formData.endDate));
      }

      if (editingEvent) {
        // Update
        await updateDoc(doc(db, 'special_events', editingEvent.id), {
          ...eventData,
          updatedAt: serverTimestamp()
        });
        setSuccess('Cập nhật sự kiện thành công!');
      } else {
        // Create
        await addDoc(collection(db, 'special_events'), {
          ...eventData,
          createdAt: serverTimestamp()
        });
        setSuccess('Tạo sự kiện thành công!');
      }

      resetForm();
      loadEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Lỗi lưu sự kiện: ' + err.message);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;

    try {
      await deleteDoc(doc(db, 'special_events', eventId));
      setSuccess('Xóa sự kiện thành công!');
      loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Lỗi xóa sự kiện: ' + err.message);
    }
  };

  const toggleEventStatus = async (event) => {
    try {
      await updateDoc(doc(db, 'special_events', event.id), {
        isActive: !event.isActive,
        updatedAt: serverTimestamp()
      });
      loadEvents();
    } catch (err) {
      console.error('Error toggling event:', err);
      setError('Lỗi cập nhật trạng thái');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-700 dark:text-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-500" />
            Quản lý Sự kiện Đặc biệt
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Các sự kiện được tính full km không giới hạn quota
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Thêm sự kiện
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700 dark:bg-green-900 dark:text-green-200 dark:border-green-800">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-slate-800 dark:text-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              {editingEvent ? 'Sửa sự kiện' : 'Thêm sự kiện mới'}
            </h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên sự kiện */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên sự kiện *
              </label>
                <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 dark:text-gray-200"
                placeholder="VD: Dead Fish 2025, Ngày Quốc khánh 2/9..."
              />
            </div>

            {/* Loại sự kiện */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại sự kiện *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.values(EVENT_TYPES).map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, eventType: type.id }))}
                    className={`p-3 rounded-lg border text-left transition ${
                      formData.eventType === type.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{type.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Loại hoạt động */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Áp dụng cho loại hoạt động *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ACTIVITY_TYPES).map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, activityType: type.id }))}
                    className={`p-2 rounded-lg border text-center transition ${
                      formData.activityType === type.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Giới tính áp dụng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Áp dụng cho giới tính *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(GENDER_TARGETS).map(gender => (
                  <button
                    key={gender.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, genderTarget: gender.id }))}
                    className={`p-2 rounded-lg border text-center transition ${
                      formData.genderTarget === gender.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{gender.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{gender.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ngày - tùy theo loại */}
            {formData.eventType === 'special_day' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Ngày áp dụng *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tất cả activity trong ngày này sẽ được tính full km
                </p>
              </div>
            ) : (
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-500">
                  Người dùng có thể gán activity vào sự kiện trong khoảng thời gian này
                </p>
              </div>
            )}

            {/* Mô tả */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả (tuỳ chọn)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Mô tả thêm về sự kiện..."
              />
            </div>

            {/* Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Kích hoạt sự kiện
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingEvent ? 'Cập nhật' : 'Tạo sự kiện'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Default Annual Events */}
      <div className="bg-white rounded-xl shadow overflow-hidden dark:bg-slate-800 dark:text-gray-200">
        <button
          onClick={() => setShowDefaultEvents(!showDefaultEvents)}
          className="w-full p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between hover:from-amber-100 hover:to-orange-100 transition"
        >
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="font-medium text-orange-800">
              Sự kiện mặc định hằng năm ({DEFAULT_ANNUAL_EVENTS.length})
            </h3>
          </div>
          {showDefaultEvents ? (
            <ChevronUp className="w-5 h-5 text-orange-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-orange-600" />
          )}
        </button>
        
        {showDefaultEvents && (
          <div className="divide-y">
            {DEFAULT_ANNUAL_EVENTS.map((evt, idx) => {
              const eventKey = getDefaultEventKey(evt);
              const isEnabled = isDefaultEventEnabled(eventKey);
              const year = new Date().getFullYear().toString();
              
              // Tính ngày diễn ra
              let displayDate = '';
              if (evt.monthDay) {
                const [month, day] = evt.monthDay.split('-');
                displayDate = `${day}/${month} hằng năm`;
              } else if (evt.lunarDate) {
                const solarDate = getLunarToSolarDate(evt.lunarDate, year);
                const [lMonth, lDay] = evt.lunarDate.split('-');
                displayDate = `${lDay}/${lMonth} Âm lịch`;
                if (solarDate) {
                  const d = new Date(solarDate);
                  displayDate += ` (${d.getDate()}/${d.getMonth() + 1}/${year})`;
                }
              }
              
              return (
                <div 
                  key={eventKey} 
                  className={`p-4 ${!isEnabled ? 'bg-gray-50 opacity-60' : ''} dark:bg-transparent`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xl">{evt.emoji}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">{evt.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          isEnabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isEnabled ? 'Đang bật' : 'Đã tắt'}
                        </span>
                        {/* Badge giới tính */}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          evt.genderTarget === 'female' 
                            ? 'bg-pink-100 text-pink-700' 
                            : evt.genderTarget === 'male'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {GENDER_TARGETS[evt.genderTarget?.toUpperCase()]?.label || '👥 Tất cả'}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                          Mặc định
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          📅 Ngày đặc biệt
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {ACTIVITY_TYPES[evt.activityType?.toUpperCase()]?.label || '🏊🏃 Cả hai'}
                        </span>
                        <span className="flex items-center text-orange-600">
                          <Calendar className="w-4 h-4 mr-1" />
                          {displayDate}
                        </span>
                      </div>

                      {evt.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{evt.description}</p>
                      )}
                    </div>

                    <div className="flex items-center ml-4">
                      <button
                        onClick={() => toggleDefaultEvent(eventKey)}
                        className={`p-2 rounded-lg transition ${
                          isEnabled 
                            ? 'text-yellow-600 hover:bg-yellow-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={isEnabled ? 'Tắt sự kiện' : 'Bật sự kiện'}
                      >
                        {isEnabled ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      {/* Không có nút xóa vì đây là sự kiện mặc định */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="p-3 bg-amber-50 border-t text-xs text-amber-700">
          💡 Các sự kiện mặc định sẽ tự động áp dụng vào ngày tương ứng hằng năm. Admin có thể tắt để không áp dụng.
        </div>
      </div>

      {/* Custom Events List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">Sự kiện tùy chỉnh ({events.length})</h3>
        </div>
        
        {/* Today's Default Events Banner */}
        {getTodayDefaultEvents().length > 0 && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
            <div className="flex items-center mb-2">
              <Sparkles className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-800">Sự kiện đặc biệt hôm nay!</span>
            </div>
            <div className="space-y-2">
              {getTodayDefaultEvents().map((evt, idx) => (
                <div key={idx} className="bg-white/70 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{evt.emoji}</span>
                    <span className="font-medium text-gray-900">{evt.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      evt.genderTarget === 'female' 
                        ? 'bg-pink-100 text-pink-700' 
                        : evt.genderTarget === 'male'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {GENDER_TARGETS[evt.genderTarget?.toUpperCase()]?.label || '👥 Tất cả'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{evt.description}</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    ✨ Tất cả tracklog hôm nay được tính full km (không giới hạn quota)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có sự kiện nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {events.map(event => (
              <div key={event.id} className={`p-4 ${!event.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-medium text-gray-900">{event.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        event.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {event.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                      {/* Badge giới tính */}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        event.genderTarget === 'female' 
                          ? 'bg-pink-100 text-pink-700' 
                          : event.genderTarget === 'male'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {GENDER_TARGETS[event.genderTarget?.toUpperCase()]?.label || '👥 Tất cả'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {EVENT_TYPES[event.eventType?.toUpperCase()]?.label || event.eventType}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {ACTIVITY_TYPES[event.activityType?.toUpperCase()]?.label || 'Cả hai'}
                      </span>
                      {event.eventType === 'special_day' ? (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(event.date)}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(event.startDate)} - {formatDate(event.endDate)}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-500">{event.description}</p>
                    )}

                    {event.eventType !== 'special_day' && (
                      <button
                        onClick={() => loadParticipantDetails(event.id)}
                        className="flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800 transition"
                      >
                        {loadingParticipants && expandedEvent === null ? (
                          <div className="w-4 h-4 mr-1 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Users className="w-4 h-4 mr-1" />
                        )}
                        {eventParticipants[event.id] || 0} người đã tham gia
                        {expandedEvent === event.id ? (
                          <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    )}

                    {/* Chi tiết người tham gia */}
                    {expandedEvent === event.id && participantDetails[event.id] && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 border">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          Chi tiết người tham gia ({participantDetails[event.id].length})
                        </h4>
                        {participantDetails[event.id].length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Chưa có ai tham gia</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {participantDetails[event.id].map((p, idx) => (
                              <div key={p.id} className="bg-white rounded-lg p-2 border text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <span className="font-medium text-gray-900">{p.userName}</span>
                                      {p.userEmail && (
                                        <span className="text-gray-400 text-xs ml-1">({p.userEmail})</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {p.assignedAt.toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                                {p.activityName && (
                                  <div className="mt-1 ml-8 text-xs text-gray-600">
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                      {p.activityType === 'Swim' ? '🏊' : '🏃'} {p.activityName}
                                    </span>
                                    {p.distance && (
                                      <span className="ml-2 text-green-600 font-medium">
                                        {(p.distance / 1000).toFixed(2)} km
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleEventStatus(event)}
                      className={`p-2 rounded-lg transition ${
                        event.isActive 
                          ? 'text-yellow-600 hover:bg-yellow-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={event.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    >
                      {event.isActive ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-2">📋 Hướng dẫn:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Ngày đặc biệt:</strong> Tất cả activity trong ngày đó được tính full km (VD: 2/9, 30/4)</li>
          <li><strong>Sự kiện từ thiện/Giải đấu:</strong> Người dùng tự chọn gán activity vào sự kiện, mỗi người chỉ được tính 1 lần</li>
          <li>Activity thuộc sự kiện sẽ được tính full km, không bị giới hạn bởi quota hàng ngày</li>
        </ul>
      </div>
    </div>
  );
}

export default SpecialEventsManager;
