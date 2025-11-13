/**
 * API Base URL
 * 바이블25 백엔드 서버 주소
 */
export const API_BASE_URL = 'https://bible25backend.givemeprice.co.kr';

/**
 * Web View Base URL
 * 프론트엔드 웹 주소
 */
export const WEB_VIEW_BASE_URL = 'https://bible25frontend.givemeprice.co.kr';

/**
 * Development Web View Base URL
 * 개발용 프론트엔드 주소
 */
export const DEV_VIEW_BASE_URL = 'https://dev25frontend.givemeprice.co.kr';

/**
 * Audio Base URL
 * 성경 음성 파일 주소
 */
export const AUDIO_BASE_URL = 'https://data.bible25.com/bible/audio/';

/**
 * Audio Base URL Backup
 * 성경 음성 파일 백업 주소
 */
export const AUDIO_BASE_URL_BACKUP = 'https://ch2ho.bible25.co.kr/kviruslab/bible/audio_ver02/';

/**
 * API 엔드포인트
 */
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

    // 사용자 및 포인트
    USER: '/login/finduser',
    POINT: '/point',
    NAVER_PAY: '/point/naverpay',

    // 광고
    BILLBOARD: '/advertisement',
};

/**
 * 네이버 설정
 */
export const NAVER_CONFIG = {
    CONSUMER_KEY: 'v5NY3AmWuiA3eOohYS64',
    CONSUMER_SECRET: 'e62hO7vCnZ',
    APP_NAME: '바이블25',
    SERVICE_URL_SCHEME_IOS: 'com.clsk.media',
    DISABLE_APP_AUTH_IOS: true,
};

/**
 * 다우 (광고) 설정
 */
export const DAWU_CONFIG = {
    BASE_URL: 'https://box-api.addcon.co.kr',
    PARTNER_CODE: 'PADBJZ',
    API_KEY: 'V0SMlvCxHogSgFUwqhz8yv8JhrS72k59',
    ENCRYPTION_KEY: 'KP9NjUi1RpNobLP539OlOxNIRXfFhwE7',
    ENCRYPTION_IV: 'KP9NjUi1RpNobLP5',
};

/**
 * 포인트 설정
 */
export const POINT_CONFIG = {
    MINIMUM_REQUIRED: 1000, // 최소 포인트 요구량
};

// 개발 모드 확인
export const IS_DEV = __DEV__;

// 현재 사용할 웹뷰 URL (개발/프로덕션 자동 전환)
export const CURRENT_WEB_VIEW_URL = IS_DEV ? DEV_VIEW_BASE_URL : WEB_VIEW_BASE_URL;