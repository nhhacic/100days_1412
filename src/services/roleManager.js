// Hệ thống phân quyền và quản lý đặc cách KPI

export const ROLES = {
  SUPER_ADMIN: 'super_admin',     // Toàn quyền
  ADMIN: 'admin',                 // Quản trị viên
  MODERATOR: 'moderator',         // Điều phối viên
  USER: 'user'                    // Người chơi
};

export const PERMISSIONS = {
  // Quản lý thành viên
  VIEW_ALL_USERS: 'view_all_users',
  APPROVE_USERS: 'approve_users',
  REJECT_USERS: 'reject_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  BULK_OPERATIONS: 'bulk_operations',
  
  // Quản lý KPI và đặc cách
  VIEW_KPI_REPORTS: 'view_kpi_reports',
  MANAGE_KPI_EXCEPTIONS: 'manage_kpi_exceptions',
  ADJUST_KPI_TARGETS: 'adjust_kpi_targets',
  MANAGE_INJURY_CASES: 'manage_injury_cases',
  APPROVE_KPI_REDUCTIONS: 'approve_kpi_reductions',
  
  // Hệ thống
  MANAGE_SYSTEM_CONFIG: 'manage_system_config',
  MANAGE_ROLES: 'manage_roles',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  EXPORT_DATA: 'export_data',
  
  // Tracklog
  VIEW_TRACKLOGS: 'view_tracklogs',
  VALIDATE_TRACKLOGS: 'validate_tracklogs',
  FLAG_TRACKLOGS: 'flag_tracklogs',
  OVERRIDE_TRACKLOG_RESULTS: 'override_tracklog_results'
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.APPROVE_USERS,
    PERMISSIONS.REJECT_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.BULK_OPERATIONS,
    PERMISSIONS.VIEW_KPI_REPORTS,
    PERMISSIONS.MANAGE_KPI_EXCEPTIONS,
    PERMISSIONS.ADJUST_KPI_TARGETS,
    PERMISSIONS.MANAGE_INJURY_CASES,
    PERMISSIONS.APPROVE_KPI_REDUCTIONS,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_SYSTEM_LOGS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_TRACKLOGS,
    PERMISSIONS.VALIDATE_TRACKLOGS,
    PERMISSIONS.FLAG_TRACKLOGS,
    PERMISSIONS.OVERRIDE_TRACKLOG_RESULTS
  ],
  
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.APPROVE_USERS,
    PERMISSIONS.REJECT_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.BULK_OPERATIONS,
    PERMISSIONS.VIEW_KPI_REPORTS,
    PERMISSIONS.MANAGE_KPI_EXCEPTIONS,
    PERMISSIONS.ADJUST_KPI_TARGETS,
    PERMISSIONS.MANAGE_INJURY_CASES,
    PERMISSIONS.APPROVE_KPI_REDUCTIONS,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    PERMISSIONS.VIEW_SYSTEM_LOGS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_TRACKLOGS,
    PERMISSIONS.VALIDATE_TRACKLOGS,
    PERMISSIONS.FLAG_TRACKLOGS
  ],
  
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.APPROVE_USERS,
    PERMISSIONS.REJECT_USERS,
    PERMISSIONS.VIEW_KPI_REPORTS,
    PERMISSIONS.MANAGE_KPI_EXCEPTIONS,
    PERMISSIONS.MANAGE_INJURY_CASES,
    PERMISSIONS.APPROVE_KPI_REDUCTIONS,
    PERMISSIONS.VIEW_TRACKLOGS,
    PERMISSIONS.VALIDATE_TRACKLOGS,
    PERMISSIONS.FLAG_TRACKLOGS
  ],
  
  [ROLES.USER]: [
    PERMISSIONS.VIEW_TRACKLOGS
  ]
};

export class RoleManager {
  static hasPermission(user, permission) {
    if (!user || !user.role) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }
  
  static canApproveUsers(user) {
    return this.hasPermission(user, PERMISSIONS.APPROVE_USERS);
  }
  
  static canEditUsers(user) {
    return this.hasPermission(user, PERMISSIONS.EDIT_USERS);
  }
  
  static canDeleteUsers(user) {
    return this.hasPermission(user, PERMISSIONS.DELETE_USERS);
  }
  
  static canManageSystemConfig(user) {
    return this.hasPermission(user, PERMISSIONS.MANAGE_SYSTEM_CONFIG);
  }
  
  static canManageKPIExceptions(user) {
    return this.hasPermission(user, PERMISSIONS.MANAGE_KPI_EXCEPTIONS);
  }
  
  static canAdjustKPITargets(user) {
    return this.hasPermission(user, PERMISSIONS.ADJUST_KPI_TARGETS);
  }
  
  static getRoleDisplayName(role) {
    const names = {
      [ROLES.SUPER_ADMIN]: '👑 Super Admin',
      [ROLES.ADMIN]: '🛡️ Admin',
      [ROLES.MODERATOR]: '🔧 Moderator',
      [ROLES.USER]: '👤 User'
    };
    return names[role] || role;
  }
  
  static getRoleColor(role) {
    const colors = {
      [ROLES.SUPER_ADMIN]: 'bg-gradient-to-r from-purple-600 to-pink-600',
      [ROLES.ADMIN]: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      [ROLES.MODERATOR]: 'bg-gradient-to-r from-green-600 to-teal-600',
      [ROLES.USER]: 'bg-gray-600'
    };
    return colors[role] || 'bg-gray-600';
  }
  
  static getRoleBadge(role) {
    const badgeClasses = {
      [ROLES.SUPER_ADMIN]: 'px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-medium',
      [ROLES.ADMIN]: 'px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs font-medium',
      [ROLES.MODERATOR]: 'px-2 py-1 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-xs font-medium',
      [ROLES.USER]: 'px-2 py-1 bg-gray-500 text-white rounded-full text-xs font-medium'
    };
    
    return {
      className: badgeClasses[role] || 'px-2 py-1 bg-gray-500 text-white rounded-full text-xs font-medium',
      text: this.getRoleDisplayName(role)
    };
  }
  
  // Kiểm tra nếu user có quyền cao hơn hoặc bằng role được chỉ định
  static hasRoleOrHigher(user, requiredRole) {
    const roleHierarchy = {
      [ROLES.SUPER_ADMIN]: 4,
      [ROLES.ADMIN]: 3,
      [ROLES.MODERATOR]: 2,
      [ROLES.USER]: 1
    };
    
    const userLevel = roleHierarchy[user?.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
}

export const KPI_EXCEPTION_TYPES = {
  INJURY: 'injury',              // Chấn thương
  SICKNESS: 'sickness',          // Ốm đau
  BUSINESS_TRIP: 'business_trip', // Công tác
  FAMILY_EVENT: 'family_event',  // Sự kiện gia đình
  PREGNANCY: 'pregnancy',        // Mang thai
  OTHER: 'other'                 // Khác
};

export const KPI_ADJUSTMENT_TYPES = {
  REDUCTION: 'reduction',        // Giảm KPI
  EXEMPTION: 'exemption',        // Miễn KPI
  EXTENSION: 'extension',        // Gia hạn
  SWAP: 'swap',                  // Đổi môn (chỉ bơi hoặc chỉ chạy)
  CUSTOM: 'custom'               // Tùy chỉnh
};

export const EXCEPTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};
