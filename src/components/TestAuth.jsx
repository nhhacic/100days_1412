import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

function TestAuth() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login success:', result.user);
    } catch (error) {
      console.error('Login error:', error.message);
      alert('Lỗi: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Firebase Auth</h1>
      
      <div className="mb-4">
        <p>User: {user ? user.email : 'Chưa đăng nhập'}</p>
        <p>UID: {user?.uid}</p>
      </div>

      <div className="space-y-4 max-w-md">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full"
            placeholder="Email"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full"
            placeholder="Password"
          />
        </div>
        <div className="space-x-4">
          <button 
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Đăng nhập test
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestAuth;
