import axios from 'axios';

// Strava Configuration từ environment variables
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = window.location.origin + window.location.pathname + '#/auth/callback';

// Validate
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
  console.error('Missing Strava configuration. Check your .env file.');
}

class StravaService {
  constructor() {
    this.accessToken = localStorage.getItem('strava_access_token');
    this.refreshToken = localStorage.getItem('strava_refresh_token');
    this.expiresAt = localStorage.getItem('strava_expires_at');
    this.athlete = localStorage.getItem('strava_athlete');
  }

  // ========== AUTH METHODS ==========
  
  redirectToStravaAuth() {
    console.log('Redirecting to Strava auth...');
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=activity:read_all,profile:read_all`;
    window.location.href = stravaAuthUrl;
  }

  async handleCallback(code) {
    try {
      console.log('Exchanging code for token...');
      const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      });

      console.log('Token response received:', response.data);
      this.saveTokens(response.data);
      
      window.location.href = window.location.origin + window.location.pathname + '#/dashboard';
      
      return response.data;
    } catch (error) {
      console.error('Strava auth error:', error.response?.data || error.message);
      throw error;
    }
  }

  async refreshTokenIfNeeded() {
    if (!this.isAuthenticated() && this.refreshToken) {
      try {
        console.log('Refreshing Strava token...');
        const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        });
        
        console.log('Token refreshed:', response.data);
        this.saveTokens(response.data);
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearTokens();
        return false;
      }
    }
    return this.isAuthenticated();
  }

  // ========== STORAGE METHODS ==========

  saveTokens(data) {
    localStorage.setItem('strava_access_token', data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_expires_at', data.expires_at);
    localStorage.setItem('strava_athlete', JSON.stringify(data.athlete));
    
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = data.expires_at;
    this.athlete = data.athlete;
  }

  clearTokens() {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_expires_at');
    localStorage.removeItem('strava_athlete');
    
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    this.athlete = null;
  }

  // ========== AUTH STATUS ==========

  isAuthenticated() {
    if (!this.accessToken || !this.expiresAt) return false;
    const isExpired = Date.now() >= (this.expiresAt * 1000);
    return !isExpired;
  }

  getAthleteInfo() {
    if (!this.athlete) return null;
    try {
      return JSON.parse(this.athlete);
    } catch {
      return null;
    }
  }

  // ========== API METHODS ==========

  async getActivities(afterTimestamp = null) {
    try {
      const isAuthenticated = await this.refreshTokenIfNeeded();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Strava');
      }

      const params = {
        per_page: 200,
        page: 1
      };

      if (afterTimestamp) {
        params.after = afterTimestamp;
      } else {
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
        params.after = thirtyDaysAgo;
      }

      console.log('Fetching Strava activities with params:', params);
      
      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params
      });

      console.log(`Received ${response.data.length} activities from Strava`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Strava activities:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        this.clearTokens();
        throw new Error('Session expired. Please reconnect Strava.');
      }
      
      throw error;
    }
  }

  async getActivity(activityId) {
    try {
      await this.refreshTokenIfNeeded();
      
      const response = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching activity:', error);
      throw error;
    }
  }

  async getAthleteStats(athleteId) {
    try {
      await this.refreshTokenIfNeeded();
      
      const response = await axios.get(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching athlete stats:', error);
      throw error;
    }
  }

  // ========== HELPER METHODS ==========

  parseActivityType(activity) {
    const type = activity.type?.toLowerCase() || '';
    const sportType = activity.sport_type?.toLowerCase() || '';
    
    if (type.includes('run') || sportType.includes('run')) {
      return 'run';
    } else if (type.includes('swim') || sportType.includes('swim')) {
      return 'swim';
    } else {
      return 'other';
    }
  }

  filterActivitiesByDate(activities, startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date).getTime();
      return activityDate >= start && activityDate <= end;
    });
  }

  calculateDistanceByType(activities, type) {
    return activities
      .filter(activity => this.parseActivityType(activity) === type)
      .reduce((total, activity) => total + (activity.distance || 0), 0) / 1000;
  }
}

export default new StravaService();
