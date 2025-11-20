import axios from 'axios';

// 환경변수에서 API URL 가져오기
export const API_CONFIG = {
    BASE_URL: process.env.API_BASE_URL || 'https://bible25backend.givemeprice.co.kr',
    WEB_VIEW_BASE_URL: process.env.WEB_WIEW_BASE_URL || 'https://bible25frontend.givemeprice.co.kr',
    AUDIO_BASE_URL: process.env.AUDIO_BASE_URL || 'https://data.bible25.com/bible/audio/',
    AUDIO_BASE_URL_BACKUP: process.env.AUDIO_BASE_URL_BACKUP || 'https://ch2ho.bible25.co.kr/kviruslab/bible/audio_ver02/',
};

// Axios 인스턴스 생성
export const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
    (config) => {
        console.log(`[API 요청] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params);
        return config;
    },
    (error) => {
        console.error('[API 요청 에러]', error);
        return Promise.reject(error);
    }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API 응답] ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        console.error('[API 응답 에러]', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        return Promise.reject(error);
    }
);

// API 엔드포인트 상수
export const API_ENDPOINTS = {
    // 찬송가
    HYMN_LIST: '/chansong/song',
    HYMN_DETAIL: '/chansong/song', // ?id={id} 파라미터 사용
    HYMN_CATEGORY: '/hymm/category',
    HYMN_CATEGORY_LIST: '/hymm/list',

    // 교독문, 주기도문, 사도신경
    GYODOK: '/chansong/gyodok', // ?version={version}
    KIDO: '/chansong/kido', // ?version={version}
    SADO: '/chansong/sado', // ?version={version}

    // 기타
    POINT: '/point',
    USER: '/login/finduser',
    BILLBOARD: '/advertisement',
};