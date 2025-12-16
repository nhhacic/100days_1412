import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { 
  collection, getDocs, addDoc, query, where, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { 
  Star, Calendar, Waves, Footprints, CheckCircle, AlertCircle, 
  X, ChevronDown, ChevronUp, Award
} from 'lucide-react';
import { formatDate as formatDateHelper } from '../utils/formatDate';

function EventActivitySelector({ user, activities, onClose, onActivityLinked, initialEventId, modalOnly = false }) {
  const [events, setEvents] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [expanded, setExpanded] = useState(false); // Mặc định thu gọn
  const [showModal, setShowModal] = useState(false); // Modal để gán activity
  const canvasRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // If parent passes an initialEventId, and events already loaded, try to open modal for that event
    if (initialEventId && events.length > 0) {
      const found = events.find(e => e.id === initialEventId);
      if (found) {
        setSelectedEvent(found);
        setSelectedActivity(null);
        setShowModal(true);
        setExpanded(true);
      }
    }
  }, [initialEventId, events]);

  // Fireworks canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles = [];
    const fireworks = [];
    let raf = null;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    window.addEventListener('resize', resize);

    function random(min, max) { return Math.random() * (max - min) + min; }

    class Particle {
      constructor(x, y, vx, vy, color, life) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.life = life; this.age = 0; this.alpha = 1;
      }
      update(dt) {
        this.age += dt;
        this.vy += 0.0025 * dt; // gravity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha = Math.max(0, 1 - this.age / this.life);
      }
      draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function spawnFirework() {
      const sx = random(width * 0.2, width * 0.8);
      const sy = height + 20;
      const tx = random(width * 0.2, width * 0.8);
      const ty = random(height * 0.1, height * 0.5);
      const color = `hsl(${Math.floor(random(0,360))}deg 80% 60%)`;
      // ascend particle
      const ascent = new Particle(sx, sy, (tx - sx) / 300, (ty - sy) / 300, color, 1.0);
      ascent.isRocket = true;
      fireworks.push(ascent);
    }

    function explode(x, y, baseColor) {
      const count = Math.floor(random(18, 36));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + random(-0.2, 0.2);
        const speed = random(0.6, 2.4);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = `hsla(${Math.floor(random(0,360))}, 90%, ${random(50,70)}%, 1)`;
        particles.push(new Particle(x, y, vx, vy, color, random(0.9, 1.8)));
      }
    }

    let last = performance.now();
    function loop(now) {
      const dt = (now - last) / 16.666; // approx frames
      last = now;

      ctx.clearRect(0, 0, width, height);

      // launch new fireworks occasionally
      if (Math.random() < 0.03) spawnFirework();

      // update rockets
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i];
        f.update(dt);
        // draw rocket as bright point
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (f.vy >= 0 || f.y < height * 0.12) {
          // explode
          explode(f.x, f.y, f.color);
          fireworks.splice(i, 1);
        }
      }

      // update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        p.draw(ctx);
        if (p.alpha <= 0) particles.splice(i, 1);
      }

      // subtle glow
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,0,width,height);
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all events (không dùng orderBy để tránh lỗi composite index)
      const eventsQuery = query(
        collection(db, 'special_events'),
        where('isActive', '==', true)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = [];
      const now = new Date();
      
      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Event data:', doc.id, data); // Debug
        
        // Chỉ lấy sự kiện không phải special_day (charity_event, competition)
        if (data.eventType !== 'special_day') {
          // Lấy endDate - có thể từ endDate hoặc date
          const endDate = data.endDate?.toDate?.() || 
                         (data.endDate ? new Date(data.endDate) : null) ||
                         data.date?.toDate?.() ||
                         (data.date ? new Date(data.date) : null);
          
          // Lấy startDate
          const startDate = data.startDate?.toDate?.() || 
                           (data.startDate ? new Date(data.startDate) : null) ||
                           data.date?.toDate?.() ||
                           (data.date ? new Date(data.date) : null);
          
          // Chỉ lấy sự kiện chưa kết thúc hoặc kết thúc trong 7 ngày gần đây
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (!endDate || endDate >= sevenDaysAgo) {
            eventsData.push({
              id: doc.id,
              ...data,
              startDate: startDate,
              endDate: endDate
            });
          }
        }
      });
      
      // Sort by createdAt desc (client-side)
      eventsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('Filtered events:', eventsData); // Debug
      setEvents(eventsData);

      // Load participations của user này
      if (user?.uid) {
        const participationsQuery = query(
          collection(db, 'event_participations'),
          where('userId', '==', user.uid)
        );
        const participationsSnapshot = await getDocs(participationsQuery);
        const participationsData = [];
        participationsSnapshot.forEach(doc => {
          const data = doc.data();
          participationsData.push({
            id: doc.id,
            ...data,
            linkedAt: data.linkedAt?.toDate?.() || new Date()
          });
        });
        // Sort client-side
        participationsData.sort((a, b) => b.linkedAt - a.linkedAt);
        setMyParticipations(participationsData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkActivity = async () => {
    if (!selectedEvent || !selectedActivity) {
      setError('Vui lòng chọn sự kiện và activity');
      return;
    }

    // Kiểm tra đã tham gia sự kiện này chưa
    const alreadyParticipated = myParticipations.some(p => p.eventId === selectedEvent.id);
    if (alreadyParticipated) {
      setError('Bạn đã đăng ký activity cho sự kiện này rồi! Mỗi người chỉ được 1 lần/sự kiện.');
      return;
    }

    // Kiểm tra activity có nằm trong khoảng thời gian sự kiện không
    const activityDate = new Date(selectedActivity.start_date);
    if (selectedEvent.startDate && activityDate < selectedEvent.startDate) {
      setError('Activity này diễn ra trước ngày bắt đầu sự kiện');
      return;
    }
    if (selectedEvent.endDate && activityDate > selectedEvent.endDate) {
      setError('Activity này diễn ra sau ngày kết thúc sự kiện');
      return;
    }

    // Kiểm tra loại activity phù hợp
    const activityType = selectedActivity.sport_type?.toLowerCase();
    const isSwim = activityType === 'swim';
    const isRun = activityType === 'run';
    
    if (selectedEvent.activityType === 'swim' && !isSwim) {
      setError('Sự kiện này chỉ dành cho hoạt động bơi');
      return;
    }
    if (selectedEvent.activityType === 'run' && !isRun) {
      setError('Sự kiện này chỉ dành cho hoạt động chạy');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'event_participations'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0],
        eventId: selectedEvent.id,
        eventName: selectedEvent.name,
        activityId: selectedActivity.id,
        activityName: selectedActivity.name,
        activityType: activityType,
        distance: selectedActivity.distance,
        activityDate: Timestamp.fromDate(new Date(selectedActivity.start_date)),
        linkedAt: serverTimestamp()
      });

      setSuccess('Đã gán activity vào sự kiện thành công! Activity này sẽ được tính full km.');
      setSelectedEvent(null);
      setSelectedActivity(null);
      loadData();
      
      if (onActivityLinked) {
        onActivityLinked();
      }

      // Auto close after 3 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
    } catch (err) {
      console.error('Error linking activity:', err);
      setError('Lỗi gán activity: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return formatDateHelper(date);
  };

  const formatDistance = (meters) => {
    return (meters / 1000).toFixed(2);
  };

  // Lọc activities phù hợp với sự kiện đã chọn
  const getFilteredActivities = () => {
    if (!selectedEvent || !activities) return [];
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      const activityType = activity.sport_type?.toLowerCase();
      
      // Check date range
      if (selectedEvent.startDate && activityDate < selectedEvent.startDate) return false;
      if (selectedEvent.endDate && activityDate > selectedEvent.endDate) return false;
      
      // Check activity type
      if (selectedEvent.activityType === 'swim' && activityType !== 'swim') return false;
      if (selectedEvent.activityType === 'run' && activityType !== 'run') return false;
      
      // Check not already linked
      const alreadyLinked = myParticipations.some(p => p.activityId === activity.id);
      if (alreadyLinked) return false;
      
      return true;
    });
  };

  // Tính số sự kiện user có thể tham gia (chưa đăng ký)
  const availableEventsCount = events.filter(e => 
    !myParticipations.some(p => p.eventId === e.id)
  ).length;

  // Không có sự kiện hoặc đã đăng ký hết -> ẩn component
  if (!loading && (events.length === 0 || availableEventsCount === 0)) {
    if (myParticipations.length > 0) {
      // Chỉ hiện badge nhỏ nếu đã tham gia sự kiện
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-700">
              Đã đăng ký {myParticipations.length} sự kiện đặc biệt
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            {expanded ? 'Ẩn' : 'Chi tiết'}
          </button>
          {expanded && (
            <div className="absolute mt-2 right-0 bg-white border rounded-lg shadow-lg p-3 z-10">
              {myParticipations.map(p => (
                <div key={p.id} className="text-xs text-gray-600 py-1">
                  {p.eventName}: {formatDistance(p.distance)} km
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  // Loading
  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center text-yellow-700 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          Đang tải sự kiện...
        </div>
      </div>
    );
  }

  return (
    <>
      {!modalOnly && (
        /* Compact view - mặc định */
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg overflow-hidden event-banner-animate event-banner-glow event-banner-fireworks">
          <canvas ref={canvasRef} className="event-banner-canvas pointer-events-none absolute inset-0 w-full h-full" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-yellow-100/50 transition"
          >
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2 text-xl">🎉</span>
              <div>
                <span className="font-medium text-gray-900 text-sm">Sự kiện Đặc biệt</span>
                <span className="text-xs text-gray-600 ml-2">
                  ({availableEventsCount} sự kiện có thể tham gia)
                </span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded content */}
          {expanded && (
            <div className="px-3 pb-3 border-t border-yellow-200">
              {/* Danh sách sự kiện */}
              <div className="mt-3 space-y-3">
                {events.map(event => {
                  const alreadyParticipated = myParticipations.some(p => p.eventId === event.id);
                  const participation = myParticipations.find(p => p.eventId === event.id);
                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border ${
                        alreadyParticipated 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base">{event.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              event.activityType === 'swim' ? 'bg-cyan-100 text-cyan-700' :
                              event.activityType === 'run' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {event.activityType === 'swim' ? '🏊 Bơi' : event.activityType === 'run' ? '🏃 Chạy' : '🏊🏃 Cả hai'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              event.eventType === 'charity_event' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {event.eventType === 'charity_event' ? '❤️ Từ thiện' : '🏆 Giải đấu'}
                            </span>
                          </div>
                          
                          {/* Thời gian */}
                          <div className="text-sm text-gray-600 mt-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span className="font-medium">Thời gian:</span>
                            <span className="ml-1">{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                          </div>
                          
                          {/* Mô tả */}
                          {event.description && (
                            <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                              📝 {event.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status / Action */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {alreadyParticipated ? (
                          <div className="flex items-center justify-between bg-green-100 p-2 rounded-lg">
                            <div className="flex items-center text-green-700">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <div>
                                <span className="font-medium text-sm">Đã đăng ký</span>
                                {participation && (
                                  <span className="text-xs ml-2">
                                    ({participation.activityName} - {formatDistance(participation.distance)} km)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          ) : (
                          <div className="flex items-center justify-between">
                            <p className="mt-0 p-2 bg-blue-50 rounded text-xs text-blue-700">
                              💡 Activity được gán sẽ tính <strong>full km</strong> (không giới hạn quota)
                            </p>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setSelectedActivity(null);
                                setError('');
                                setShowModal(true);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm rounded-lg hover:opacity-90 font-medium shadow"
                            >
                              Gán activity
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
            </div>
          )}
        </div>
      )}

      {/* Modal gán activity */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Gán activity</h3>
                  <p className="text-sm opacity-90">{selectedEvent.name}</p>
                </div>
                <button 
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-700 font-medium">Thành công!</p>
                  <p className="text-sm text-gray-600 mt-1">{success}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    Chọn activity để gán (trong khoảng {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}):
                  </p>

                  {getFilteredActivities().length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Không có activity phù hợp</p>
                      <p className="text-xs mt-1">Hãy hoàn thành activity trong khoảng thời gian sự kiện</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getFilteredActivities().map(activity => (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivity(activity)}
                          className={`w-full p-3 rounded-lg border text-left transition ${
                            selectedActivity?.id === activity.id
                              ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {activity.sport_type?.toLowerCase() === 'swim' ? (
                                <Waves className="w-4 h-4 mr-2 text-cyan-500" />
                              ) : (
                                <Footprints className="w-4 h-4 mr-2 text-green-500" />
                              )}
                              <span className="font-medium text-sm">{activity.name}</span>
                            </div>
                            <span className="text-sm font-bold text-orange-600">
                              {formatDistance(activity.distance)} km
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            {formatDate(activity.start_date)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div className="p-4 border-t bg-gray-50 flex gap-2">
                <button
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleLinkActivity}
                  disabled={!selectedActivity || submitting}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium text-sm flex items-center justify-center"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Award className="w-4 h-4 mr-1" />
                      Xác nhận
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default EventActivitySelector;
