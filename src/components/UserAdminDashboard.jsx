import React from 'react';
import AdminIntegratedDashboard from './AdminIntegratedDashboard';

// User-facing copy of the admin dashboard: same layout but with admin actions disabled
export default function UserAdminDashboard(props) {
  return <AdminIntegratedDashboard limitedMode={true} {...props} />;
}
