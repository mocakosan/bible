// src/types/env.d.ts
// react-native-dotenv 타입 정의

declare module '@env' {
    export const API_BASE_URL: string;
    export const WEB_VIEW_BASE_URL: string;
    export const DEV_VIEW_BASE_URL: string;
    export const AUDIO_BASE_URL: string;
    export const AUDIO_BASE_URL_BACKUP: string;

    export const BIBLE25_USER_API: string;
    export const BIBLE25_POINT_API: string;
    export const BIBLE25_BACKEND_URL: string;

    export const NAVER_CONSUMER_KEY: string;
    export const NAVER_CONSUMER_SECRET: string;
    export const NAVER_APP_NAME: string;
    export const NAVER_SERVICE_URL_SCHEME_IOS: string;
    export const NAVER_DISABLE_APP_AUTH_IOS: string;

    export const DAWU_BASE_URL: string;
    export const DAWU_PARTNER_CODE: string;
    export const DAWU_API_KEY: string;
    export const DAWU_ENCRYPTION_KEY: string;
    export const DAWU_ENCRYPTION_IV: string;

    export const MINIMUM_POINTS_REQUIRED: string;
}