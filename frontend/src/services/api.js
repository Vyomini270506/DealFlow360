import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('dealflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Disable HTTP caching to ensure fresh MongoDB data on every API request
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
