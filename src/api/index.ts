import axios from 'axios';

export const baseAxios = axios.create({
  baseURL: process.env.API_BASE_URL,
});

baseAxios.interceptors.request.use(
  (config) => {
    // console.log(`${config.baseURL}${config.url}`, config.params)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

baseAxios.interceptors.response.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
