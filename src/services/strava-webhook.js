
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
app.post('/strava/webhook', (req, res) => {
  console.log('Received Strava event:', req.body);
  // TODO: Xử lý event, lấy activity mới nhất về và lưu vào Firestore
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Strava webhook server listening on port ${PORT}`);
});