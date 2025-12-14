
import express from 'express';
import bodyParser from 'body-parser';
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Bước xác thực webhook của Strava
app.get('/strava/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': verifyToken } = req.query;
  if (mode === 'subscribe' && verifyToken === 'strava_verify_token_cua_shark_Ha') {
    return res.json({ 'hub.challenge': challenge });
  }
  res.status(403).send('Verification failed');
});

// Nhận event từ Strava
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

// Khởi tạo Firebase Admin SDK (chỉ cần init 1 lần)
try {
  initializeApp({ credential: applicationDefault() });
} catch (e) {}
const adminDb = getFirestore();

app.post('/strava/webhook', async (req, res) => {
  console.log('Received Strava event:', req.body);
  const event = req.body;
  // Chỉ xử lý event activity mới
  if (event.object_type === 'activity' && event.aspect_type === 'create') {
    try {
      // 1. Tìm user có strava_athlete.id = event.owner_id
      const usersRef = adminDb.collection('users');
      const snapshot = await usersRef.where('strava_athlete.id', '==', event.owner_id).get();
      if (snapshot.empty) {
        console.log('Không tìm thấy user với owner_id:', event.owner_id);
        return res.status(200).send('No user');
      }
      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();
      const accessToken = userData.strava_access_token;
      if (!accessToken) {
        console.log('User không có access_token');
        return res.status(200).send('No token');
      }
      // 2. Gọi Strava API lấy chi tiết activity
      const activityId = event.object_id;
      const actRes = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const activity = actRes.data;
      // 3. Lấy danh sách activities cũ, thêm activity mới vào đầu, lưu lại
      const oldActs = userData.strava_activities || [];
      const exists = oldActs.some(a => a.id === activity.id);
      if (!exists) {
        const newActs = [activity, ...oldActs];
        await usersRef.doc(userId).update({ strava_activities: newActs });
        console.log('Đã lưu activity mới cho user', userId);
      } else {
        console.log('Activity đã tồn tại, không lưu lại');
      }
    } catch (err) {
      console.error('Lỗi xử lý event Strava:', err);
    }
  }
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Strava webhook server listening on port ${PORT}`);
});