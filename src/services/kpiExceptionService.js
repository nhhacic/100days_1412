import { db } from './firebase';
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { KPI_EXCEPTION_TYPES, KPI_ADJUSTMENT_TYPES, EXCEPTION_STATUS } from './roleManager';

class KPIExceptionService {
  // Tạo yêu cầu đặc cách KPI
  static async createExceptionRequest(data) {
    try {
      const exceptionId = `exception_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const exceptionRef = doc(db, 'kpi_exceptions', exceptionId);
      
      const exceptionData = {
        id: exceptionId,
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        exceptionType: data.exceptionType,
        adjustmentType: data.adjustmentType,
        reason: data.reason,
        evidence: data.evidence || null,
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        endDate: Timestamp.fromDate(new Date(data.endDate)),
        originalKPITargets: data.originalKPITargets,
        adjustedKPITargets: data.adjustedKPITargets,
        notes: data.notes || '',
        status: EXCEPTION_STATUS.PENDING,
        requestedBy: data.requestedBy,
        requestedAt: serverTimestamp(),
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        month: data.month || new Date().getMonth() + 1,
        year: data.year || new Date().getFullYear()
      };
      
      await setDoc(exceptionRef, exceptionData);
      return { success: true, id: exceptionId, data: exceptionData };
    } catch (error) {
      console.error('Error creating exception request:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Duyệt yêu cầu đặc cách
  static async approveException(exceptionId, approvedBy, notes = '') {
    try {
      const exceptionRef = doc(db, 'kpi_exceptions', exceptionId);
      await updateDoc(exceptionRef, {
        status: EXCEPTION_STATUS.APPROVED,
        approvedBy: approvedBy,
        approvedAt: serverTimestamp(),
        approvalNotes: notes
      });
      
      // Cập nhật user KPI targets nếu cần
      const exceptionDoc = await getDoc(exceptionRef);
      const exceptionData = exceptionDoc.data();
      
      if (exceptionData.adjustedKPITargets) {
        const userRef = doc(db, 'users', exceptionData.userId);
        await updateDoc(userRef, {
          adjustedKPITargets: exceptionData.adjustedKPITargets,
          kpiExceptionActive: true,
          kpiExceptionId: exceptionId,
          kpiExceptionExpiry: exceptionData.endDate
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error approving exception:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Từ chối yêu cầu đặc cách
  static async rejectException(exceptionId, rejectedBy, reason) {
    try {
      const exceptionRef = doc(db, 'kpi_exceptions', exceptionId);
      await updateDoc(exceptionRef, {
        status: EXCEPTION_STATUS.REJECTED,
        rejectedBy: rejectedBy,
        rejectedAt: serverTimestamp(),
        rejectionReason: reason
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error rejecting exception:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Lấy danh sách yêu cầu đặc cách
  static async getExceptionRequests(filters = {}) {
    try {
      let q = collection(db, 'kpi_exceptions');
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      
      if (filters.exceptionType) {
        q = query(q, where('exceptionType', '==', filters.exceptionType));
      }
      
      q = query(q, orderBy('requestedAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const exceptions = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        exceptions.push({
          id: docSnap.id,
          ...data,
          requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(data.requestedAt),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt ? new Date(data.approvedAt) : null,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate)
        });
      });
      
      return { success: true, data: exceptions };
    } catch (error) {
      console.error('Error getting exception requests:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Tính toán KPI điều chỉnh
  static calculateAdjustedKPITargets(user, exceptionType, adjustmentType, durationDays) {
    const originalTargets = user.monthlyTarget || { run: 100, swim: 20 };
    const adjustedTargets = { ...originalTargets };
    const notes = [];
    
    switch (exceptionType) {
      case KPI_EXCEPTION_TYPES.INJURY:
        if (adjustmentType === KPI_ADJUSTMENT_TYPES.REDUCTION) {
          // Giảm 50% KPI cho chấn thương
          adjustedTargets.run = Math.round(originalTargets.run * 0.5);
          adjustedTargets.swim = Math.round(originalTargets.swim * 0.5);
          notes.push('Giảm 50% KPI do chấn thương');
        } else if (adjustmentType === KPI_ADJUSTMENT_TYPES.EXEMPTION) {
          // Miễn hoàn toàn
          adjustedTargets.run = 0;
          adjustedTargets.swim = 0;
          notes.push('Miễn KPI hoàn toàn do chấn thương nặng');
        }
        break;
        
      case KPI_EXCEPTION_TYPES.SICKNESS:
        const reductionPercent = durationDays > 15 ? 0.7 : 0.3;
        adjustedTargets.run = Math.round(originalTargets.run * (1 - reductionPercent));
        adjustedTargets.swim = Math.round(originalTargets.swim * (1 - reductionPercent));
        notes.push(`Giảm ${reductionPercent * 100}% KPI do ốm ${durationDays} ngày`);
        break;
        
      case KPI_EXCEPTION_TYPES.PREGNANCY:
        adjustedTargets.run = 0;
        adjustedTargets.swim = Math.round(originalTargets.swim * 0.3);
        notes.push('Miễn chạy, giảm 70% bơi cho thai kỳ');
        break;
        
      case KPI_EXCEPTION_TYPES.SWAP:
        if (adjustmentType === 'run_only') {
          adjustedTargets.swim = 0;
          adjustedTargets.run = originalTargets.run * 2;
          notes.push('Chỉ chạy, bơi = 0, chạy x2');
        } else if (adjustmentType === 'swim_only') {
          adjustedTargets.run = 0;
          adjustedTargets.swim = originalTargets.swim * 2;
          notes.push('Chỉ bơi, chạy = 0, bơi x2');
        }
        break;
        
      default:
        // Tùy chỉnh - giữ nguyên
        break;
    }
    
    return {
      original: originalTargets,
      adjusted: adjustedTargets,
      reductionPercent: {
        run: ((originalTargets.run - adjustedTargets.run) / originalTargets.run * 100).toFixed(1),
        swim: ((originalTargets.swim - adjustedTargets.swim) / originalTargets.swim * 100).toFixed(1)
      },
      notes: notes
    };
  }
  
  // Kiểm tra user có đặc cách active không
  static async getUserActiveException(userId) {
    try {
      const q = query(
        collection(db, 'kpi_exceptions'),
        where('userId', '==', userId),
        where('status', '==', EXCEPTION_STATUS.APPROVED)
      );
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        
        if (endDate >= now) {
          return {
            active: true,
            exception: {
              id: docSnap.id,
              ...data,
              endDate: endDate
            }
          };
        }
      }
      
      return { active: false };
    } catch (error) {
      console.error('Error checking active exception:', error);
      return { active: false, error: error.message };
    }
  }
  
  // Lấy thống kê đặc cách
  static async getExceptionStats() {
    try {
      const exceptionsRef = collection(db, 'kpi_exceptions');
      const querySnapshot = await getDocs(exceptionsRef);
      
      const stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        expired: 0,
        byType: {},
        byMonth: {}
      };
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        stats.total++;
        stats[data.status] = (stats[data.status] || 0) + 1;
        
        // Thống kê theo loại
        stats.byType[data.exceptionType] = (stats.byType[data.exceptionType] || 0) + 1;
        
        // Thống kê theo tháng
        const monthKey = `${data.year}-${data.month}`;
        stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
      });
      
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting exception stats:', error);
      return { success: false, error: error.message };
    }
  }
}

export default KPIExceptionService;
