import axios from 'axios'

// Use environment variable for API URL in production, or /api for local development
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: API_BASE_URL })

export const authAPI = {
  register:   (data)  => api.post('/auth/register', data),
  registerDoctor: (formData) => api.post('/auth/register-doctor', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
  login:      (data)  => api.post('/auth/login', data),
  verifyOtp:  (data)  => api.post('/auth/verify-otp', data),
  resendOtp:  (email) => api.post(`/auth/resend-otp?email=${email}`),
  me:         (token) => api.get(`/auth/me?token=${token}`),
  updateProfile: (data) => api.put('/auth/profile', data),
  search:     (query, role) => api.get('/auth/search', { params: { query, role } }),
  doctors:    () => api.get('/auth/doctors'),
}

export const healthAPI = {
  getProfile:  (userId) => api.get(`/health/profile/${userId}`),
  saveProfile: (data)   => api.post('/health/profile', data),
  getRisks:    (userId) => api.get(`/health/risks/${userId}`),
  getHistory:  (userId) => api.get(`/health/history/${userId}`),
}

export const reportsAPI = {
  upload: (fd)     => api.post('/reports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list:   (userId) => api.get(`/reports/list/${userId}`),
  getOne: (id)     => api.get(`/reports/${id}`),
}

export const mapAPI = {
  hospitals: (lat, lng) => api.get('/map/hospitals', { params: lat != null ? { lat, lng } : {} }),
  nearby:    (lat, lng, radius = 15, type = null) =>
    api.get('/map/nearby', { params: { lat, lng, radius_km: radius, ...(type ? { type } : {}) } }),
  outbreaks: () => api.get('/map/outbreaks'),
}

export const alertsAPI = {
  list:        (userId) => api.get(`/alerts/${userId}`),
  markRead:    (id)     => api.put(`/alerts/read/${id}`),
  markAllRead: (userId) => api.put(`/alerts/read-all/${userId}`),
}

export const wellnessAPI = {
  healthScore:  (userId) => api.get(`/wellness/health-score/${userId}`),
  dietPlan:     (userId) => api.get(`/wellness/diet-plan/${userId}`),
  exercisePlan: (userId) => api.get(`/wellness/exercise-plan/${userId}`),
  enhancedExercisePlan: (userId) => api.get(`/wellness/enhanced-exercise-plan/${userId}`),
  exerciseVideos: () => api.get('/wellness/exercise-videos'),
  customDietPlan: (data) => api.post('/wellness/custom-diet-plan', data),
  periodCare: () => api.get('/wellness/period-care'),
}

export const chatbotAPI = {
  chat: (message, history = [], healthScore = null, userProfile = null, language = 'en') =>
    api.post('/chatbot/chat', { message, history, health_score: healthScore, user_profile: userProfile, language }),
  translate: (text, targetLanguage) =>
    api.post('/chatbot/translate', { text, target_language: targetLanguage }),
  translateBatch: (texts, targetLanguage) =>
    api.post('/chatbot/translate-batch', { texts, target_language: targetLanguage }),
}

export const accessAPI = {
  sendRequest:    (data)                  => api.post('/access/request', data),
  myRequests:     (userId, role)          => api.get(`/access/my-requests/${userId}?role=${role}`),
  respond:        (data)                  => api.put('/access/respond', data),
  checkAccess:    (doctorId, patientId)   => api.get(`/access/check/${doctorId}/${patientId}`),
  patientData:    (patientId, doctorId)   => api.get(`/access/patient-data/${patientId}?doctor_id=${doctorId}`),
  revoke:         (requestId, userId)     => api.put(`/access/revoke/${requestId}?user_id=${userId}`),
  myDoctors:      (patientId)             => api.get(`/access/my-doctors/${patientId}`),
  myPatients:     (doctorId)              => api.get(`/access/my-patients/${doctorId}`),
}

export const chatAPI = {
  send:          (data)           => api.post('/chat/send', data),
  thread:        (userA, userB)   => api.get(`/chat/thread/${userA}/${userB}`),
  conversations: (userId)         => api.get(`/chat/conversations/${userId}`),
  unreadCount:   (userId)         => api.get(`/chat/unread-count/${userId}`),
}

export const ratingsAPI = {
  rate:      (data)                   => api.post('/ratings/rate', data),
  doctor:    (doctorId)               => api.get(`/ratings/doctor/${doctorId}`),
  myRating:  (doctorId, patientId)    => api.get(`/ratings/my-rating/${doctorId}/${patientId}`),
}

export const lifePrintAPI = {
  summary: (subjectId, requesterId, requesterRole = 'patient') =>
    api.get(`/life-print/summary/${subjectId}`, {
      params: { requester_id: requesterId, requester_role: requesterRole }
    }),
}

export default api
