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
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
    const day = new Date(date).getDay();
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
