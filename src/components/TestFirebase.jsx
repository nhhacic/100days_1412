import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { fetchSignInMethodsForEmail, createUserWithEmailAndPassword } from 'firebase/auth';

function TestFirebase() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testEmailCheck = async () => {
    setLoading(true);
    setResult('');
    try {
      console.log('Testing email:', email);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      console.log('Result:', methods);
      setResult(`✅ Success! Methods: ${JSON.stringify(methods)}`);
    } catch (error) {
      console.error('Error:', error);
      setResult(`❌ Error: ${error.code} - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestUser = async () => {
    setLoading(true);
    setResult('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created:', userCredential.user);
      setResult(`✅ User created: ${userCredential.user.email}`);
    } catch (error) {
      console.error('Error:', error);
      setResult(`❌ Error: ${error.code} - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Firebase Connection</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full"
            placeholder="test@example.com"
          />
        </div>
        
        <div>
          <label className="block mb-2">Password (for create test)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full"
            placeholder="password123"
          />
        </div>
      </div>

      <div className="space-x-4 mb-6">
        <button
          onClick={testEmailCheck}
          disabled={loading || !email}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          Test Email Check
        </button>
        
        <button
          onClick={createTestUser}
          disabled={loading || !email || !password}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          Create Test User
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded ${result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <p>Current domain: {window.location.hostname}</p>
        <p>Firebase project: challenge-100days-deepseek</p>
        <p className="text-red-600">
          ⚠️ Cần thêm domain này vào Firebase Console → Authentication → Settings → Authorized domains
        </p>
      </div>
    </div>
  );
}

export default TestFirebase;
