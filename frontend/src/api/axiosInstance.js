import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000, // 요청 제한 시간 (ms)
});

api.interceptors.request.use(
  (config) => {
    // 토큰이 있다면 여기에 자동으로 붙일 수 있음 (현재 로그인X라 주석)
    // const token = sessionStorage.getItem("token");
    // if (token) {
    //   config.headers["Authorization"] = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data; // data만 바로 반환하게
  },
  (error) => {
    console.error("API 응답 오류:", error.response || error.message);
    return Promise.reject(error);
  }
);


export default api;