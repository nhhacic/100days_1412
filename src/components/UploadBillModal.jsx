import React, { useState } from 'react';
import { db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function UploadBillModal({ open, onClose, userId, month, year, amount }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn file ảnh bill');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      // Upload file lên Firebase Storage
      const storageRef = ref(storage, `penalty_bills/${userId}_${year}_${month}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const proofUrl = await getDownloadURL(storageRef);
      // Lưu record vào Firestore
      await addDoc(collection(db, 'penalty_payments'), {
        userId,
        month,
        year,
        amount,
        proofUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess('Đã gửi bill thành công! Chờ admin xác nhận.');
      setFile(null);
    } catch (err) {
      setError('Lỗi upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">×</button>
        <h3 className="text-lg font-bold mb-2">Nộp bill chuyển khoản phạt</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ảnh bill chuyển khoản *</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="text-sm text-gray-600">Số tiền: <b>{amount?.toLocaleString()} VND</b> cho tháng {month}/{year}</div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg">Hủy</button>
            <button type="submit" disabled={uploading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-60">
              {uploading ? 'Đang gửi...' : 'Gửi bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadBillModal;
