import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Components
import Welcome from './components/Welcome';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminIntegratedDashboard from './components/AdminIntegratedDashboard';
import AdminConfig from './components/AdminConfig';
import StravaCallback from './components/StravaCallback';
import TestFirebase from './components/TestFirebase';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state:', firebaseUser ? firebaseUser.email : 'No user');
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải ứng dụng...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Routes>
          {/* Welcome/Rules Page - Accessible to everyone */}
          <Route path="/" element={<Welcome />} />
          
          {/* Test Firebase Route */}
          <Route path="/test-firebase" element={<TestFirebase />} />
          
          {/* Registration - Only for non-logged in users */}
          <Route path="/register" element={
            !user ? <Register /> : <Dashboard user={user} />
          } />
          
          {/* Login - Only for non-logged in users */}
          <Route path="/login" element={
            !user ? <Login /> : <Dashboard user={user} />
          } />
          
          {/* Dashboard - Only for logged in users with approved status */}
          <Route path="/dashboard" element={
            user ? <Dashboard user={user} /> : <Welcome />
          } />
          
          {/* Admin Integrated Dashboard - Complete management with approvals */}
          <Route path="/admin-dashboard" element={
            user ? <AdminIntegratedDashboard /> : <Login />
          } />
          
          {/* Admin Configuration (separate) */}
          <Route path="/admin" element={
            user ? <AdminConfig /> : <Login />
          } />
          
          {/* Strava Callback */}
          <Route path="/auth/callback" element={<StravaCallback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
