// config.js 파일
// 프로젝트 루트에 .env 또는 .env.production, .env.development 파일을 생성하여 아래 값들을 저장
// 그리고 react-native-dotenv 또는 react-native-config 패키지를 사용하여 환경 변수 로드

// API 엔드포인트
export const API_CONFIG = {
  BIBLE25_BACKEND_URL: process.env.BIBLE25_BACKEND_URL || 'https://bible25backend.givemeprice.co.kr',
  BIBLE25_USER_API: process.env.BIBLE25_USER_API || 'https://bible25backend.givemeprice.co.kr/login/finduser',
  BIBLE25_POINT_API: process.env.BIBLE25_POINT_API || 'https://bible25backend.givemeprice.co.kr/point',
};

// 네이버 관련 설정
export const NAVER_CONFIG = {
  CONSUMER_KEY: process.env.NAVER_CONSUMER_KEY || 'v5NY3AmWuiA3eOohYS64',
  CONSUMER_SECRET: process.env.NAVER_CONSUMER_SECRET || 'e62hO7vCnZ',
  APP_NAME: process.env.NAVER_APP_NAME || '바이블25',
  SERVICE_URL_SCHEME_IOS: process.env.NAVER_SERVICE_URL_SCHEME_IOS || 'com.clsk.media',
  DISABLE_NAVER_APP_AUTH_IOS: process.env.NAVER_DISABLE_APP_AUTH_IOS === 'true',
};

// 다우기술 API 관련 설정
export const DAWU_API_CONFIG = {
  BASE_URL: process.env.DAWU_BASE_URL || 'https://test-box-api.addcon.co.kr',
  PARTNER_CODE: process.env.DAWU_PARTNER_CODE || 'PABUU3',
  API_KEY: process.env.DAWU_API_KEY || 'qT5XTtIaZVXbIoiAXm291dlt5Nw4JyBN',
  ENCRYPTION_KEY: process.env.DAWU_ENCRYPTION_KEY || 'wUX6jjQEPEvyytlMmzP0kRa3dUXpWlFl',
  ENCRYPTION_IV: process.env.DAWU_ENCRYPTION_IV || 'wUX6jjQEPEvyytlM',
};

// 앱 관련 설정
export const APP_CONFIG = {
  MINIMUM_POINTS_REQUIRED: parseInt(process.env.MINIMUM_POINTS_REQUIRED || '1000', 10),
};

// 인증 토큰 캐싱을 위한 객체
export const AUTH_CACHE = {
  accessToken: null,
  tokenExpireTime: 0,
};
