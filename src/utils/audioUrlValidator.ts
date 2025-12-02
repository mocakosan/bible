//
// interface UrlValidationResult {
//     isValid: boolean;
//     url: string;
//     error?: string;
//     statusCode?: number;
// }
//
// export const generateHymnUrl = (hymnId: number, isAccompany: boolean): string => {
//     const baseUrl = 'https://data.bible25.com/chansong/';
//     const urlType = isAccompany ? 'audio_mr/' : 'audio/';
//     return `${baseUrl}${urlType}${hymnId}.mp3`;
// };
//
// export const validateAudioUrl = async (
//     url: string,
//     timeoutMs: number = 5000
// ): Promise<UrlValidationResult> => {
//     try {
//         console.log(`🔍 URL 검증 시작: ${url}`);
//
//         const controller = new AbortController();
//         const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
//
//         const response = await fetch(url, {
//             method: 'HEAD',
//             signal: controller.signal,
//         });
//
//         clearTimeout(timeoutId);
//
//         if (response.ok) {
//             console.log(`✅ URL 검증 성공 (${response.status})`);
//             return {
//                 isValid: true,
//                 url,
//                 statusCode: response.status,
//             };
//         } else {
//             console.error(`❌ URL 검증 실패: HTTP ${response.status}`);
//             return {
//                 isValid: false,
//                 url,
//                 error: `HTTP ${response.status}: ${response.statusText}`,
//                 statusCode: response.status,
//             };
//         }
//     } catch (error) {
//         console.error(`❌ URL 검증 오류:`, error);
//         return {
//             isValid: false,
//             url,
//             error: error instanceof Error ? error.message : '알 수 없는 오류',
//         };
//     }
// };
//
// export const validateHymnUrl = async (
//     hymnId: number,
//     isAccompany: boolean,
//     timeoutMs: number = 5000
// ): Promise<UrlValidationResult> => {
//     const url = generateHymnUrl(hymnId, isAccompany);
//     return validateAudioUrl(url, timeoutMs);
// };
//
//
// export const tryAlternativeHymnUrl = async (
//     hymnId: number,
//     preferredIsAccompany: boolean
// ): Promise<UrlValidationResult> => {
//     console.log(`🔄 대체 URL 시도: ${hymnId}장`);
//
//     // 먼저 선호하는 모드 시도
//     const primaryResult = await validateHymnUrl(hymnId, preferredIsAccompany);
//     if (primaryResult.isValid) {
//         return primaryResult;
//     }
//
//     console.log(`⚠️ ${preferredIsAccompany ? '반주' : '찬양'} 실패, 대체 모드 시도`);
//
//     // 실패 시 반대 모드 시도
//     const alternativeResult = await validateHymnUrl(hymnId, !preferredIsAccompany);
//     if (alternativeResult.isValid) {
//         console.log(`✅ ${!preferredIsAccompany ? '반주' : '찬양'} 모드로 대체 성공`);
//     }
//
//     return alternativeResult;
// };