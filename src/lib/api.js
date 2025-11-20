import axios from 'axios'

// Get API base URL from environment variable
// In development: uses Vite proxy (empty string = relative URL)
// In production: points to Railway backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for AI processing (model download can take time on first run)
})

export default api

