// Sự kiện đặc biệt mặc định hằng năm
const DEFAULT_ANNUAL_EVENTS = [
  { name: '🎊 Tết Dương lịch', monthDay: '01-01', genderTarget: 'all' },
  { name: '🧧 Tết Nguyên đán (Mùng 1)', lunarDate: '01-01', genderTarget: 'all' },
  { name: '🧧 Tết Nguyên đán (Mùng 2)', lunarDate: '01-02', genderTarget: 'all' },
  { name: '🧧 Tết Nguyên đán (Mùng 3)', lunarDate: '01-03', genderTarget: 'all' },
  { name: '🌸 Ngày Quốc tế Phụ nữ', monthDay: '03-08', genderTarget: 'female' },
  { name: '🏛️ Giỗ Tổ Hùng Vương', lunarDate: '03-10', genderTarget: 'all' },
  { name: '🎗️ Ngày Giải phóng miền Nam', monthDay: '04-30', genderTarget: 'all' },
  { name: '👷 Ngày Quốc tế Lao động', monthDay: '05-01', genderTarget: 'all' },
  { name: '🇻🇳 Ngày Quốc khánh', monthDay: '09-02', genderTarget: 'all' },
  { name: '💐 Ngày Phụ nữ Việt Nam', monthDay: '10-20', genderTarget: 'female' },
  { name: '🎩 Ngày Quốc tế Nam giới', monthDay: '11-19', genderTarget: 'male' }
];

// Ánh xạ ngày Âm lịch sang Dương lịch 2025-2026
const LUNAR_TO_SOLAR = {
  '2025': {
    '01-01': '2025-01-29', '01-02': '2025-01-30', '01-03': '2025-01-31', '03-10': '2025-04-06'
  },
  '2026': {
    '01-01': '2026-02-17', '01-02': '2026-02-18', '01-03': '2026-02-19', '03-10': '2026-04-25'
  }
};

// Default config - có thể override bởi admin
const DEFAULT_CONFIG = {
  // Thông tin chung
  season: 7,
  seasonName: 'Thử thách 100 ngày Vì TIỀN - KHÔNG VÌ CÔNG LÝ',
  description: 'MÙA 7 - Bắt đầu từ 01/11/2025',
  
  // Thời gian - CHÍNH XÁC THEO GIẢI THÍCH
  startDate: '2025-11-01',          // 01/11/2025 - Bắt đầu mùa
  durationMonths: 3,                // 3 tháng thực hiện KPI: 11, 12, 01
  finalChallengeStart: '2026-02-01', // 01/02/2026 - 10 ngày cuối
  finalChallengeEnd: '2026-02-10',   // 10/02/2026 - Kết thúc mùa
  
  // KPI theo giới tính (km) - CHO 3 THÁNG
  monthlyTargets: {
    male: { 
      run: 100,   // 100km chạy/tháng (Tổng: 300km/3 tháng)
      swim: 20    // 20km bơi/tháng (Tổng: 60km/3 tháng)
    },
    female: { 
      run: 80,    // 80km chạy/tháng (Tổng: 240km/3 tháng)
      swim: 16    // 16km bơi/tháng (Tổng: 48km/3 tháng)
    }
  },
  
  // Mục tiêu 10 NGÀY CUỐI (01/02/2026 - 10/02/2026)
  finalChallengeTargets: {
    // Phương án 1: Bơi 3km + Chạy 15km
    option1: {
      run: 15,
      swim: 3
    },
    // Phương án 2: Bơi 15km + Chạy 3km
    option2: {
      run: 3,
      swim: 15
    }
  },
  
  // Giới hạn hàng ngày (km)
  dailyLimits: {
    weekday: { 
      run: 15,   // Thứ 2-6
      swim: 3 
    },
    weekend: { 
      run: 21,   // Thứ 7-CN
      swim: 6 
    }
  },
  
  // Mức phạt (VNĐ)
  penalties: {
    run: 10000,           // 10,000đ/km thiếu chạy
    swim: 50000,          // 50,000đ/km thiếu bơi
    finalChallenge: 300000, // 300,000đ/môn không hoàn thành 10 ngày cuối
    cheating: 300000,     // 300,000đ/lần gian lận
    deposit: 500000       // 500,000đ quyết tâm phí
  },
  
  // Quy đổi (KHÔNG áp dụng cho 10 ngày cuối)
  conversion: {
    swimToRun: 2,    // 1km bơi = 2km chạy
    runToSwim: 12.5  // 12.5km chạy = 1km bơi
  },
  
  // Yêu cầu kỹ thuật
  requirements: {
    minHeartRate: 100, // bpm > 100
    stravaRequired: true
  },
  
  // Thông tin thanh toán
  payment: {
    bank: 'BIDV',
    accountNumber: '8856525377',
    accountName: 'QUỸ CHALLENGE 100 NGÀY',
    penaltyDeadline: 5, // days - nộp phạt trong 5 ngày sau tháng
    depositAmount: 500000
  },
  
  // Thông tin admin
  admin: {
    name: 'em Tú - Chupi Chupa',
    role: 'Xử lý chấn thương và miễn giảm KPI'
  },
  
  // Medal thưởng
  rewards: {
    medalCondition: 'HOÀN THÀNH ĐỦ KPI HOẶC ĐÓNG PHẠT ĐẦY ĐỦ',
    injuryPenalty: 'Báo chấn thương quá 1 tháng sẽ không được nhận medal'
  }
};

class ChallengeConfig {
  constructor() {
    const savedConfig = localStorage.getItem('challenge_config');
    this.config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
    this.calculateDates();
  }
  
  calculateDates() {
    const start = new Date(this.config.startDate);
    
    // Kết thúc 3 tháng sau (cho KPI)
    const kpiEnd = new Date(start);
    kpiEnd.setMonth(kpiEnd.getMonth() + this.config.durationMonths);
    kpiEnd.setDate(kpiEnd.getDate() - 1); // Ngày cuối của tháng thứ 3
    
    // Ngày kết thúc mùa (10/02/2026)
    const seasonEnd = new Date(this.config.finalChallengeEnd);
    
    this.calculatedDates = {
      startDate: start,
      kpiEndDate: kpiEnd,           // Kết thúc 3 tháng KPI
      seasonEndDate: seasonEnd,     // Kết thúc mùa (10/02/2026)
      finalChallengeStart: new Date(this.config.finalChallengeStart),
      finalChallengeEnd: new Date(this.config.finalChallengeEnd),
      totalDays: Math.ceil((seasonEnd - start) / (1000 * 60 * 60 * 24)) + 1
    };
  }
  
  getConfig() {
    return {
      ...this.config,
      ...this.calculatedDates
    };
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.calculateDates();
    this.saveToLocalStorage();
  }
  
  saveToLocalStorage() {
    localStorage.setItem('challenge_config', JSON.stringify(this.config));
  }
  
  resetToDefault() {
    this.config = DEFAULT_CONFIG;
    this.calculateDates();
    this.saveToLocalStorage();
  }
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
  
  formatDate(date) {
    // Normalize to DD/MM/YYYY for display
    try {
      const d = new Date(date);
      if (isNaN(d)) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (err) {
      return '';
    }
  }
  
  /**
   * Kiểm tra xem ngày có phải là ngày lễ mặc định không
   * @param {Date|string} date - Ngày cần kiểm tra
   * @param {string} gender - Giới tính người dùng ('male'/'female')
   * @param {Object} disabledEvents - Object chứa các event bị tắt { eventKey: false }
   * @returns {{ isSpecial: boolean, event: object|null }}
   */
  isDefaultSpecialEvent(date, gender, disabledEvents = {}) {
    const d = new Date(date);
    const year = d.getFullYear().toString();
    const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    
    for (const evt of DEFAULT_ANNUAL_EVENTS) {
      // Kiểm tra giới tính - 'all' áp dụng cho tất cả
      if (evt.genderTarget !== 'all' && evt.genderTarget !== gender) continue;
      
      // Lấy event key
      const eventKey = evt.monthDay || evt.lunarDate;
      
      // Kiểm tra xem event có bị tắt không
      if (disabledEvents[eventKey] === false) continue;
      
      // Kiểm tra ngày dương lịch (monthDay format: MM-DD)
      if (evt.monthDay === monthDay) {
        return { isSpecial: true, event: evt };
      }
      
      // Kiểm tra ngày âm lịch (cần convert sang dương)
      if (evt.lunarDate && LUNAR_TO_SOLAR[year]?.[evt.lunarDate] === dateStr) {
        return { isSpecial: true, event: evt };
      }
    }
    
    return { isSpecial: false, event: null };
  }
  
  /**
   * Lấy danh sách sự kiện mặc định cho ngày hôm nay
   * @param {string} gender - Giới tính người dùng
   * @param {Object} disabledEvents - Object chứa các event bị tắt
   * @returns {Array} Danh sách sự kiện
   */
  getTodayDefaultEvents(gender, disabledEvents = {}) {
    const today = new Date();
    const year = today.getFullYear().toString();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateStr = today.toISOString().split('T')[0];
    
    return DEFAULT_ANNUAL_EVENTS.filter(evt => {
      // Kiểm tra xem event có bị tắt không
      const eventKey = evt.monthDay || evt.lunarDate;
      if (disabledEvents[eventKey] === false) return false;
      
      // Kiểm tra giới tính
      if (evt.genderTarget !== 'all' && evt.genderTarget !== gender) return false;
      
      // Kiểm tra ngày dương
      if (evt.monthDay === monthDay) return true;
      
      // Kiểm tra ngày âm
      if (evt.lunarDate && LUNAR_TO_SOLAR[year]?.[evt.lunarDate] === dateStr) return true;
      
      return false;
    });
  }
  
  // Tính tổng KPI cho cả 3 tháng
  getTotalKPITarget(gender) {
    const monthly = this.config.monthlyTargets[gender];
    return {
      run: monthly.run * this.config.durationMonths,
      swim: monthly.swim * this.config.durationMonths
    };
  }
  
  calculatePenalty(runDeficit, swimDeficit) {
    return {
      run: runDeficit * this.config.penalties.run,
      swim: swimDeficit * this.config.penalties.swim,
      total: (runDeficit * this.config.penalties.run) + (swimDeficit * this.config.penalties.swim)
    };
  }

  /**
   * Tính tiền phạt với quy đổi thông minh
   * Nếu dư môn này sẽ quy đổi sang bù cho môn kia
   */
  calculatePenaltyWithConversion(runDistance, swimDistance, gender) {
    const target = this.config.monthlyTargets[gender];
    
    // Tính thừa/thiếu ban đầu
    let runSurplus = runDistance - target.run;  // Dương = thừa, Âm = thiếu
    let swimSurplus = swimDistance - target.swim;
    
    // Kết quả sau quy đổi
    let finalRunDeficit = 0;
    let finalSwimDeficit = 0;
    let conversionDetails = {
      runSurplusUsed: 0,
      swimSurplusUsed: 0,
      runFromSwim: 0,
      swimFromRun: 0
    };
    
    // Nếu cả 2 đều đủ hoặc thừa
    if (runSurplus >= 0 && swimSurplus >= 0) {
      return {
        originalRunDeficit: 0,
        originalSwimDeficit: 0,
        finalRunDeficit: 0,
        finalSwimDeficit: 0,
        runPenalty: 0,
        swimPenalty: 0,
        totalPenalty: 0,
        conversion: conversionDetails,
        message: '✅ Đã hoàn thành KPI cả 2 môn!'
      };
    }
    
    // Nếu thiếu chạy nhưng dư bơi -> quy đổi bơi sang chạy
    if (runSurplus < 0 && swimSurplus > 0) {
      const runNeeded = Math.abs(runSurplus);
      // 1km bơi = 2km chạy
      const runFromSwim = swimSurplus * this.config.conversion.swimToRun;
      
      if (runFromSwim >= runNeeded) {
        // Dư bơi đủ bù thiếu chạy
        conversionDetails.swimSurplusUsed = runNeeded / this.config.conversion.swimToRun;
        conversionDetails.runFromSwim = runNeeded;
        finalRunDeficit = 0;
      } else {
        // Dư bơi không đủ bù hết
        conversionDetails.swimSurplusUsed = swimSurplus;
        conversionDetails.runFromSwim = runFromSwim;
        finalRunDeficit = runNeeded - runFromSwim;
      }
      finalSwimDeficit = 0;
    }
    // Nếu thiếu bơi nhưng dư chạy -> quy đổi chạy sang bơi
    else if (swimSurplus < 0 && runSurplus > 0) {
      const swimNeeded = Math.abs(swimSurplus);
      // 12.5km chạy = 1km bơi
      const swimFromRun = runSurplus / this.config.conversion.runToSwim;
      
      if (swimFromRun >= swimNeeded) {
        // Dư chạy đủ bù thiếu bơi
        conversionDetails.runSurplusUsed = swimNeeded * this.config.conversion.runToSwim;
        conversionDetails.swimFromRun = swimNeeded;
        finalSwimDeficit = 0;
      } else {
        // Dư chạy không đủ bù hết
        conversionDetails.runSurplusUsed = runSurplus;
        conversionDetails.swimFromRun = swimFromRun;
        finalSwimDeficit = swimNeeded - swimFromRun;
      }
      finalRunDeficit = 0;
    }
    // Cả 2 đều thiếu
    else {
      finalRunDeficit = Math.abs(runSurplus);
      finalSwimDeficit = Math.abs(swimSurplus);
    }
    
    const runPenalty = finalRunDeficit * this.config.penalties.run;
    const swimPenalty = finalSwimDeficit * this.config.penalties.swim;
    
    return {
      originalRunDeficit: Math.max(0, -runSurplus),
      originalSwimDeficit: Math.max(0, -swimSurplus),
      finalRunDeficit: parseFloat(finalRunDeficit.toFixed(2)),
      finalSwimDeficit: parseFloat(finalSwimDeficit.toFixed(2)),
      runPenalty,
      swimPenalty,
      totalPenalty: runPenalty + swimPenalty,
      conversion: conversionDetails,
      message: this.getPenaltyMessage(finalRunDeficit, finalSwimDeficit, conversionDetails)
    };
  }
  
  getPenaltyMessage(runDef, swimDef, conv) {
    let msg = [];
    if (conv.runFromSwim > 0) {
      msg.push(`🔄 Quy đổi ${conv.swimSurplusUsed.toFixed(2)}km bơi dư → ${conv.runFromSwim.toFixed(2)}km chạy`);
    }
    if (conv.swimFromRun > 0) {
      msg.push(`🔄 Quy đổi ${conv.runSurplusUsed.toFixed(2)}km chạy dư → ${conv.swimFromRun.toFixed(2)}km bơi`);
    }
    if (runDef > 0) msg.push(`⚠️ Còn thiếu ${runDef.toFixed(2)}km chạy`);
    if (swimDef > 0) msg.push(`⚠️ Còn thiếu ${swimDef.toFixed(2)}km bơi`);
    if (runDef === 0 && swimDef === 0) msg.push('✅ Đủ KPI sau quy đổi!');
    return msg.join('\n');
  }

  /**
   * Kiểm tra tính hợp lệ của 1 activity
   * Returns: { isValid, issues[], countedDistance, pace, expectedMinTime, expectedMaxTime }
   */
  validateActivity(activity) {
    const issues = [];
    const type = (activity.type?.toLowerCase() || activity.sport_type?.toLowerCase() || '').toLowerCase();
    const distanceKm = activity.distance / 1000;
    const movingTimeSec = activity.moving_time || 0;
    const elapsedTimeSec = activity.elapsed_time || 0;
    const movingTimeMin = movingTimeSec / 60;
    const activityDate = new Date(activity.start_date);
    
    let isValid = true;
    let pace = 0; // phút/km
    let avgSpeed = 0; // km/h
    
    // Tính pace và speed
    if (movingTimeSec > 0 && distanceKm > 0) {
      pace = movingTimeMin / distanceKm;
      avgSpeed = (distanceKm / movingTimeSec) * 3600;
    }
    
    // Kiểm tra pace hợp lý cho từng loại hoạt động
    if (type.includes('run')) {
      // Pace chạy hợp lý: 3-15 phút/km
      // Elite runner ~3 phút/km, người mới ~12-15 phút/km
      if (pace > 0 && pace < 3) {
        issues.push(`🚫 Pace quá nhanh (${pace.toFixed(2)} phút/km < 3 phút/km) - Có thể đạp xe?`);
        isValid = false;
      }
      if (pace > 15) {
        issues.push(`⚠️ Pace rất chậm (${pace.toFixed(2)} phút/km > 15 phút/km) - Có thể đang đi bộ`);
        // Không invalidate, chỉ cảnh báo
      }
      // Tốc độ tối đa hợp lý cho chạy: 20 km/h
      if (avgSpeed > 20) {
        issues.push(`🚫 Tốc độ TB quá cao (${avgSpeed.toFixed(1)} km/h > 20 km/h)`);
        isValid = false;
      }
    }
    
    if (type.includes('swim')) {
      // Pace bơi hợp lý: 1.5-5 phút/100m = 15-50 phút/km
      if (pace > 0 && pace < 10) {
        issues.push(`🚫 Pace bơi quá nhanh (${pace.toFixed(2)} phút/km < 10 phút/km)`);
        isValid = false;
      }
      if (pace > 60) {
        issues.push(`⚠️ Pace bơi rất chậm (${pace.toFixed(2)} phút/km)`);
      }
    }
    
    // Kiểm tra thời gian elapsed vs moving (nếu chênh lệch quá lớn có thể bất thường)
    if (elapsedTimeSec > 0 && movingTimeSec > 0) {
      const pauseRatio = (elapsedTimeSec - movingTimeSec) / elapsedTimeSec;
      if (pauseRatio > 0.5) {
        issues.push(`⚠️ Tạm dừng nhiều (${(pauseRatio * 100).toFixed(0)}% thời gian)`);
      }
    }
    
    // Kiểm tra khoảng cách tối thiểu
    if (distanceKm < 0.5) {
      issues.push(`⚠️ Quãng đường quá ngắn (${distanceKm.toFixed(2)}km < 0.5km)`);
    }
    
    // Áp dụng daily quota
    const dailyLimit = this.getDailyLimit(type.includes('run') ? 'run' : 'swim', activityDate);
    let countedDistance = distanceKm;
    let quotaExceeded = false;
    
    // Lưu ý: Daily quota phải được tính ở level tổng hợp (tất cả activities trong ngày)
    // Ở đây chỉ lưu thông tin limit để hiển thị
    
    return {
      isValid,
      issues,
      originalDistance: parseFloat(distanceKm.toFixed(2)),
      countedDistance: parseFloat(countedDistance.toFixed(2)),
      pace: parseFloat(pace.toFixed(2)),
      avgSpeed: parseFloat(avgSpeed.toFixed(1)),
      movingTimeMin: parseFloat(movingTimeMin.toFixed(1)),
      dailyLimit,
      activityType: type.includes('run') ? 'run' : type.includes('swim') ? 'swim' : 'other'
    };
  }

  /**
   * Xử lý tất cả activities với daily quota
   * Group theo ngày, áp dụng quota, đánh dấu excess
   * @param activities - Danh sách activities
   * @param gender - Giới tính user
   * @param eventParticipations - Danh sách event participations của user (optional)
   * @param disabledDefaultEvents - Object chứa các event mặc định bị tắt (optional)
   */
  processActivitiesWithQuota(activities, gender, eventParticipations = [], disabledDefaultEvents = {}) {
    const target = this.config.monthlyTargets[gender] || this.config.monthlyTargets.male;
    
    // Tạo Set các activityId đã gán vào event đặc biệt (để lookup nhanh)
    // Lưu cả dạng string để đảm bảo match
    const eventActivityIds = new Set();
    const eventActivityMap = new Map();
    
    eventParticipations.forEach(p => {
      if (p.activityId) {
        // Lưu cả dạng string và number để đảm bảo match
        const idStr = String(p.activityId);
        eventActivityIds.add(idStr);
        eventActivityMap.set(idStr, p);
      }
    });
    
    console.log('[Event Debug] Event participations count:', eventParticipations.length);
    console.log('[Event Debug] Event activity IDs:', [...eventActivityIds]);
    
    // Nếu không có activities, trả về default
    if (!activities || activities.length === 0) {
      return {
        activities: [],
        summary: {
          totalRunCounted: 0,
          totalSwimCounted: 0,
          runTarget: target.run,
          swimTarget: target.swim,
          runProgress: 0,
          swimProgress: 0,
          originalRunDeficit: target.run,
          originalSwimDeficit: target.swim,
          finalRunDeficit: target.run,
          finalSwimDeficit: target.swim,
          runPenalty: target.run * this.config.penalties.run,
          swimPenalty: target.swim * this.config.penalties.swim,
          totalPenalty: (target.run * this.config.penalties.run) + (target.swim * this.config.penalties.swim),
          conversion: { runSurplusUsed: 0, swimSurplusUsed: 0, runFromSwim: 0, swimFromRun: 0 },
          message: `⚠️ Còn thiếu ${target.run}km chạy\n⚠️ Còn thiếu ${target.swim}km bơi`
        }
      };
    }
    
    // Group activities by date (dùng local date, không phải UTC)
    const byDate = {};
    activities.forEach(activity => {
      try {
        // Dùng local date thay vì UTC để tránh timezone issues
        const actDate = new Date(activity.start_date);
        const dateKey = `${actDate.getFullYear()}-${String(actDate.getMonth() + 1).padStart(2, '0')}-${String(actDate.getDate()).padStart(2, '0')}`;
        
        if (!byDate[dateKey]) {
          byDate[dateKey] = { run: [], swim: [], other: [] };
        }
        
        const validation = this.validateActivity(activity);
        
        // Kiểm tra activity này có thuộc event đặc biệt không
        const activityIdStr = String(activity.id);
        const isEventActivity = eventActivityIds.has(activityIdStr);
        
        // Tìm thông tin event nếu có
        let eventInfo = null;
        if (isEventActivity) {
          eventInfo = eventActivityMap.get(activityIdStr);
          console.log('[Event Debug] Activity', activity.name, '(ID:', activityIdStr, ') is linked to event:', eventInfo?.eventName);
        } else {
          console.log('[Event Debug] Activity', activity.name, '(ID:', activityIdStr, ') NOT in event set');
        }
        
        const enrichedActivity = {
          ...activity,
          validation,
          dateKey,
          isEventActivity, // Đánh dấu thuộc event đặc biệt
          eventInfo        // Thông tin event (nếu có)
        };
        
        if (validation.activityType === 'run') {
          byDate[dateKey].run.push(enrichedActivity);
        } else if (validation.activityType === 'swim') {
          byDate[dateKey].swim.push(enrichedActivity);
        } else {
          byDate[dateKey].other.push(enrichedActivity);
        }
      } catch (err) {
        console.warn('Error processing activity:', activity, err);
      }
    });
    
    // Apply daily quota
    let totalRunCounted = 0;
    let totalSwimCounted = 0;
    const processedActivities = [];

    Object.keys(byDate).sort().forEach(dateKey => {
      const dayActivities = byDate[dateKey];
      
      // Parse dateKey as local date (not UTC) để tránh timezone issues
      const [year, month, dayOfMonth] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, dayOfMonth);
      
      const runLimit = this.getDailyLimit('run', dateKey);
      const swimLimit = this.getDailyLimit('swim', dateKey);
      
      // Debug log
      console.log(`[Quota Debug] Date: ${dateKey}, Day: ${date.getDay()}, isWeekday: ${this.isWeekday(dateKey)}, swimLimit: ${swimLimit}, runLimit: ${runLimit}`);
      
      let dayRunTotal = 0;
      let daySwimTotal = 0;
      
      // Sort activities by start_date ASCENDING để xử lý theo thứ tự thời gian trong ngày
      dayActivities.run.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      dayActivities.swim.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      
      // Kiểm tra ngày này có phải ngày lễ mặc định không (truyền disabledDefaultEvents)
      const defaultEventCheck = this.isDefaultSpecialEvent(date, gender, disabledDefaultEvents);
      const isDefaultEventDay = defaultEventCheck.isSpecial;
      
      // Process run activities
      dayActivities.run.forEach(activity => {
        const originalDist = activity.validation.originalDistance;
        let countedDist = originalDist;
        let quotaExceeded = false;
        let quotaRemainder = 0;
        
        // Nếu là event activity HOẶC ngày lễ mặc định -> tính FULL km, không áp dụng quota
        if (activity.isEventActivity || isDefaultEventDay) {
          const reason = activity.isEventActivity 
            ? `EVENT ACTIVITY` 
            : `DEFAULT HOLIDAY: ${defaultEventCheck.event?.name}`;
          console.log(`[Event Debug] Activity "${activity.name}" is ${reason} - counting FULL ${originalDist}km`);
          // countedDist = originalDist (đã set ở trên)
          // quotaExceeded = false, quotaRemainder = 0
        } else {
          // Áp dụng quota bình thường
          if (dayRunTotal + originalDist > runLimit) {
            countedDist = Math.max(0, runLimit - dayRunTotal);
            quotaExceeded = true;
            quotaRemainder = originalDist - countedDist;
          }
        }
        
        // Chỉ tính nếu valid
        if (activity.validation.isValid) {
          // Event activity hoặc ngày lễ không tính vào dayRunTotal (để không ảnh hưởng quota ngày đó)
          if (!activity.isEventActivity && !isDefaultEventDay) {
            dayRunTotal += countedDist;
          }
          totalRunCounted += countedDist;
        }
        
        processedActivities.push({
          ...activity,
          validation: {
            ...activity.validation,
            countedDistance: activity.validation.isValid ? parseFloat(countedDist.toFixed(2)) : 0,
            quotaExceeded,
            quotaRemainder: parseFloat(quotaRemainder.toFixed(2)),
            isEventActivity: activity.isEventActivity,
            isDefaultEventDay,
            defaultEvent: defaultEventCheck.event,
            eventInfo: activity.eventInfo,
            dailyQuota: runLimit,
            dayTotalBefore: parseFloat((dayRunTotal - countedDist).toFixed(2))
          }
        });
      });
      
      // Process swim activities
      dayActivities.swim.forEach(activity => {
        const originalDist = activity.validation.originalDistance;
        let countedDist = originalDist;
        let quotaExceeded = false;
        let quotaRemainder = 0;
        
        // Nếu là event activity HOẶC ngày lễ mặc định -> tính FULL km, không áp dụng quota
        if (activity.isEventActivity || isDefaultEventDay) {
          const reason = activity.isEventActivity 
            ? `EVENT ACTIVITY` 
            : `DEFAULT HOLIDAY: ${defaultEventCheck.event?.name}`;
          console.log(`[Event Debug] Swim "${activity.name}" is ${reason} - counting FULL ${originalDist}km`);
          // countedDist = originalDist (đã set ở trên)
        } else {
          // Áp dụng quota bình thường
          if (daySwimTotal + originalDist > swimLimit) {
            countedDist = Math.max(0, swimLimit - daySwimTotal);
            quotaExceeded = true;
            quotaRemainder = originalDist - countedDist;
          }
        }
        
        if (activity.validation.isValid) {
          // Event activity hoặc ngày lễ không tính vào daySwimTotal
          if (!activity.isEventActivity && !isDefaultEventDay) {
            daySwimTotal += countedDist;
          }
          totalSwimCounted += countedDist;
        }
        
        processedActivities.push({
          ...activity,
          validation: {
            ...activity.validation,
            countedDistance: activity.validation.isValid ? parseFloat(countedDist.toFixed(2)) : 0,
            quotaExceeded,
            quotaRemainder: parseFloat(quotaRemainder.toFixed(2)),
            isEventActivity: activity.isEventActivity,
            isDefaultEventDay,
            defaultEvent: defaultEventCheck.event,
            eventInfo: activity.eventInfo,
            dailyQuota: swimLimit,
            dayTotalBefore: parseFloat((daySwimTotal - countedDist).toFixed(2))
          }
        });
      });
      
      // Other activities (không tính KPI)
      dayActivities.other.forEach(activity => {
        processedActivities.push({
          ...activity,
          validation: {
            ...activity.validation,
            countedDistance: 0,
            quotaExceeded: false,
            notCounted: true,
            reason: 'Loại hoạt động không tính KPI'
          }
        });
      });
    });
    
    // Sort by date descending
    processedActivities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    // Calculate penalty with conversion
    const penaltyResult = this.calculatePenaltyWithConversion(totalRunCounted, totalSwimCounted, gender);
    
    return {
      activities: processedActivities,
      summary: {
        totalRunCounted: parseFloat(totalRunCounted.toFixed(2)),
        totalSwimCounted: parseFloat(totalSwimCounted.toFixed(2)),
        runTarget: target.run,
        swimTarget: target.swim,
        runProgress: parseFloat(((totalRunCounted / target.run) * 100).toFixed(1)),
        swimProgress: parseFloat(((totalSwimCounted / target.swim) * 100).toFixed(1)),
        ...penaltyResult
      }
    };
  }
  
  // Kiểm tra có trong thời gian 10 ngày cuối không
  isFinalChallenge(date) {
    const checkDate = new Date(date);
    const { finalChallengeStart, finalChallengeEnd } = this.calculatedDates;
    return checkDate >= finalChallengeStart && checkDate <= finalChallengeEnd;
  }
  
  // Kiểm tra có trong thời gian 3 tháng KPI không
  isKPIPeriod(date) {
    const checkDate = new Date(date);
    const { startDate, kpiEndDate } = this.calculatedDates;
    return checkDate >= startDate && checkDate <= kpiEndDate;
  }
  
  isWeekday(date) {
    // Nếu date là string YYYY-MM-DD, parse manually để tránh timezone issues
    let day;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Parse YYYY-MM-DD string as local date (not UTC)
      const [year, month, dayOfMonth] = date.split('-').map(Number);
      day = new Date(year, month - 1, dayOfMonth).getDay();
    } else {
      day = new Date(date).getDay();
    }
    // 0 = Sunday, 1-5 = Mon-Fri, 6 = Saturday
    return day >= 1 && day <= 5;
  }
  
  getDailyLimit(activityType, date) {
    const limits = this.isWeekday(date) 
      ? this.config.dailyLimits.weekday 
      : this.config.dailyLimits.weekend;
    return limits[activityType] || 0;
  }
  
  // Kiểm tra final challenge completion với 2 phương án
  checkFinalChallengeCompletion(activities) {
    let option1RunCompleted = false;
    let option1SwimCompleted = false;
    let option2RunCompleted = false;
    let option2SwimCompleted = false;
    
    let runActivity = null;
    let swimActivity = null;
    
    activities.forEach(activity => {
      const activityDate = new Date(activity.start_date);
      
      if (this.isFinalChallenge(activityDate)) {
        const type = activity.type?.toLowerCase() || activity.sport_type?.toLowerCase() || '';
        const distanceKm = activity.distance / 1000;
        
        if (type.includes('run')) {
          if (distanceKm >= this.config.finalChallengeTargets.option1.run) {
            option1RunCompleted = true;
            runActivity = activity;
          }
          if (distanceKm >= this.config.finalChallengeTargets.option2.run) {
            option2RunCompleted = true;
            runActivity = activity;
          }
        }
        
        if (type.includes('swim')) {
          if (distanceKm >= this.config.finalChallengeTargets.option1.swim) {
            option1SwimCompleted = true;
            swimActivity = activity;
          }
          if (distanceKm >= this.config.finalChallengeTargets.option2.swim) {
            option2SwimCompleted = true;
            swimActivity = activity;
          }
        }
      }
    });
    
    const option1Completed = option1RunCompleted && option1SwimCompleted;
    const option2Completed = option2RunCompleted && option2SwimCompleted;
    const completed = option1Completed || option2Completed;
    
    // Tính penalty: không hoàn thành môn nào thì phạt môn đó
    let penalty = 0;
    if (!option1RunCompleted && !option2RunCompleted) penalty += this.config.penalties.finalChallenge;
    if (!option1SwimCompleted && !option2SwimCompleted) penalty += this.config.penalties.finalChallenge;
    
    return {
      completed: completed,
      option1Completed: option1Completed,
      option2Completed: option2Completed,
      runCompleted: option1RunCompleted || option2RunCompleted,
      swimCompleted: option1SwimCompleted || option2SwimCompleted,
      runActivity: runActivity,
      swimActivity: swimActivity,
      penalty: penalty
    };
  }
  
  // Quy đổi distance (không áp dụng cho final challenge)
  convertDistance(activityType, distance, date = null) {
    if (date && this.isFinalChallenge(date)) {
      return {
        original: distance,
        converted: distance,
        type: activityType,
        canConvert: false
      };
    }
    
    if (activityType === 'swim') {
      return {
        original: distance,
        converted: distance * this.config.conversion.swimToRun,
        type: 'run',
        canConvert: true
      };
    } else if (activityType === 'run') {
      return {
        original: distance,
        converted: distance / this.config.conversion.runToSwim,
        type: 'swim',
        canConvert: true
      };
    }
    
    return {
      original: distance,
      converted: distance,
      type: activityType,
      canConvert: false
    };
  }
  
  // Kiểm tra heart rate
  checkHeartRate(activity) {
    const avgHeartRate = activity.average_heartrate || 0;
    return avgHeartRate > this.config.requirements.minHeartRate;
  }
  
  // Get date ranges for display
  getKPIPeriodRange() {
    return `${this.formatDate(this.calculatedDates.startDate)} - ${this.formatDate(this.calculatedDates.kpiEndDate)}`;
  }
  
  getFinalChallengeRange() {
    return `${this.formatDate(this.config.finalChallengeStart)} - ${this.formatDate(this.config.finalChallengeEnd)}`;
  }
  
  getSeasonRange() {
    return `${this.formatDate(this.calculatedDates.startDate)} - ${this.formatDate(this.calculatedDates.seasonEndDate)}`;
  }
}

export default new ChallengeConfig();
