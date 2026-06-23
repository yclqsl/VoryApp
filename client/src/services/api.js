import axios from "axios";

function resolveApiBaseUrl() {
  if (typeof window === "undefined") {
    return "https://voryapp.onrender.com/api";
  }

  const host = window.location.hostname || "";

  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5000/api";
  }

  return "https://voryapp.onrender.com/api";
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vory_token") || localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});