/**
 * Strava Webhook Cloud Function
 * Nhận webhook events từ Strava khi có activity mới
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");

// Khởi tạo Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Giới hạn instances để kiểm soát chi phí
setGlobalOptions({maxInstances: 10});

// Verify token cho Strava webhook
const STRAVA_VERIFY_TOKEN = "strava_verify_token_cua_shark_Ha";

/**
 * Gửi push notification đến user
 * @param {Array} tokens - Mảng FCM tokens
 * @param {string} title - Tiêu đề notification
 * @param {string} body - Nội dung notification
 * @param {Object} data - Data payload
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log("No FCM tokens to send");
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      click_action: "OPEN_APP",
    },
    webpush: {
      notification: {
        icon: "/logo192.png",
        badge: "/logo192.png",
        vibrate: [200, 100, 200],
      },
      fcmOptions: {
        link: "https://100ngay.web.app",
      },
    },
    tokens: tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ Push sent: ${response.successCount} success, ${response.failureCount} failed`);

    // Xử lý tokens không hợp lệ
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`Token failed: ${tokens[idx]}`, resp.error?.message);
        }
      });
    }
  } catch (error) {
    console.error("❌ Error sending push:", error);
  }
}

/**
 * Trigger: Gửi push notification khi có notification mới trong Firestore
 */
exports.onNotificationCreated = onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
      const notification = event.data?.data();
      if (!notification) return;

      console.log("📬 New notification created:", notification.title);

      const {title, message, targetUsers, sendToAll} = notification;

      try {
        let tokens = [];

        if (sendToAll) {
          // Lấy tất cả FCM tokens từ users
          const usersSnapshot = await db.collection("users")
              .where("pushNotificationsEnabled", "==", true)
              .get();

          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.fcmTokens && userData.fcmTokens.length > 0) {
              tokens = tokens.concat(userData.fcmTokens);
            }
          });
        } else if (targetUsers && targetUsers.length > 0) {
          // Lấy tokens của các users được chọn
          for (const userId of targetUsers) {
            const userDoc = await db.collection("users").doc(userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              if (userData.fcmTokens && userData.pushNotificationsEnabled) {
                tokens = tokens.concat(userData.fcmTokens);
              }
            }
          }
        }

        if (tokens.length > 0) {
          // Loại bỏ tokens trùng lặp
          tokens = [...new Set(tokens)];
          await sendPushNotification(tokens, title, message, {
            notificationId: event.params.notificationId,
            type: notification.type || "admin",
          });
        }
      } catch (error) {
        console.error("Error processing notification:", error);
      }
    },
);

/**
 * API: Gửi push notification thủ công
 */
exports.sendPush = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const {tokens, title, body, data} = req.body;

  if (!tokens || !title) {
    return res.status(400).json({error: "Missing tokens or title"});
  }

  try {
    await sendPushNotification(tokens, title, body || "", data || {});
    return res.status(200).json({success: true});
  } catch (error) {
    return res.status(500).json({error: error.message});
  }
});

/**
 * Strava Webhook - Xử lý cả GET (verification) và POST (events)
 * URL: https://us-central1-days-73553.cloudfunctions.net/stravaWebhook
 */
exports.stravaWebhook = onRequest(async (req, res) => {
  // CORS headers
  res.set("Access-Control-Allow-Origin", "*");

  // ========== GET: Verification request từ Strava ==========
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const verifyToken = req.query["hub.verify_token"];

    console.log("Strava verification request:", {mode, verifyToken});

    if (mode === "subscribe" && verifyToken === STRAVA_VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully");
      return res.status(200).json({"hub.challenge": challenge});
    }

    console.log("❌ Webhook verification failed");
    return res.status(403).send("Verification failed");
  }

  // ========== POST: Event từ Strava ==========
  if (req.method === "POST") {
    const event = req.body;
    console.log("📩 Strava event received:", JSON.stringify(event));

    // Chỉ xử lý event tạo activity mới
    if (event.object_type === "activity" && event.aspect_type === "create") {
      try {
        // 1. Tìm user có strava_athlete.id = event.owner_id
        const usersRef = db.collection("users");
        const snapshot = await usersRef
            .where("strava_athlete.id", "==", event.owner_id)
            .get();

        if (snapshot.empty) {
          console.log("User không tìm thấy với owner_id:", event.owner_id);
          return res.status(200).send("No user found");
        }

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        let accessToken = userData.strava_access_token;

        if (!accessToken) {
          console.log("User không có access_token");
          return res.status(200).send("No token");
        }

        // 2. Refresh token nếu hết hạn
        const now = Math.floor(Date.now() / 1000);
        if (userData.strava_expires_at && now >= userData.strava_expires_at - 300) {
          console.log("Token expired, refreshing...");
          try {
            // Lấy credentials từ environment
            const clientId = process.env.STRAVA_CLIENT_ID;
            const clientSecret = process.env.STRAVA_CLIENT_SECRET;

            if (clientId && clientSecret) {
              const refreshRes = await axios.post(
                  "https://www.strava.com/api/v3/oauth/token",
                  {
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "refresh_token",
                    refresh_token: userData.strava_refresh_token,
                  },
              );

              accessToken = refreshRes.data.access_token;

              // Cập nhật token mới vào Firestore
              await usersRef.doc(userId).update({
                strava_access_token: refreshRes.data.access_token,
                strava_refresh_token: refreshRes.data.refresh_token,
                strava_expires_at: refreshRes.data.expires_at,
              });

              console.log("✅ Token refreshed successfully");
            }
          } catch (refreshError) {
            console.error("Token refresh error:", refreshError.message);
          }
        }

        // 3. Gọi Strava API lấy chi tiết activity
        const activityId = event.object_id;
        console.log("Fetching activity:", activityId);

        const actResponse = await axios.get(
            `https://www.strava.com/api/v3/activities/${activityId}`,
            {headers: {Authorization: `Bearer ${accessToken}`}},
        );

        const activity = actResponse.data;
        console.log("Activity fetched:", activity.name, activity.type);

        // 4. Lưu activity vào Firestore
        const oldActivities = userData.strava_activities || [];
        const exists = oldActivities.some((a) => a.id === activity.id);

        if (!exists) {
          const newActivities = [activity, ...oldActivities];
          await usersRef.doc(userId).update({
            strava_activities: newActivities,
          });
          console.log("✅ Đã lưu activity mới cho user:", userId, "-", activity.name);

          // 5. Gửi push notification cho user
          if (userData.fcmTokens && userData.pushNotificationsEnabled) {
            const distanceKm = (activity.distance / 1000).toFixed(2);
            await sendPushNotification(
                userData.fcmTokens,
                "🏃 Activity mới đã ghi nhận!",
                `${activity.name} - ${distanceKm}km`,
                {type: "activity", activityId: String(activity.id)},
            );
          }
        } else {
          console.log("Activity đã tồn tại, bỏ qua");
        }
      } catch (error) {
        console.error("❌ Error processing Strava event:", error.message);
      }
    } else if (event.aspect_type === "update") {
      console.log("Activity updated - ignoring");
    } else if (event.aspect_type === "delete") {
      console.log("Activity deleted - ignoring");
    }

    // Luôn trả về 200 để Strava không retry
    return res.status(200).send("OK");
  }

  // Các method khác
  return res.status(405).send("Method not allowed");
});
