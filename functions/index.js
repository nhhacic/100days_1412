/**
 * Strava Webhook Cloud Function
 * Nhận webhook events từ Strava khi có activity mới
 */

const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");

// Khởi tạo Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Giới hạn instances để kiểm soát chi phí
setGlobalOptions({maxInstances: 10});

// Verify token cho Strava webhook
const STRAVA_VERIFY_TOKEN = "strava_verify_token_cua_shark_Ha";

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
