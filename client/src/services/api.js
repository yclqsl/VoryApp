import axios from "axios";

export const api = axios.create({
  baseURL: "https://voryapp.onrender.com/api",
});