import axios from "axios";

export const api = axios.create({
  baseURL: "https://voryapp.onrender.com/api",
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("vory_token") || localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}

  return config;
});
