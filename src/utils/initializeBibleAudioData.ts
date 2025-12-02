// utils/initializeBibleAudioData.ts
// CSV 파일을 읽어서 오디오 데이터를 초기화하는 헬퍼

import { initializeAudioData } from './timeBasedBibleSystem';
import { defaultStorage } from './mmkv';
import RNFS from 'react-native-fs';

/**
 * 앱 시작 시 CSV 데이터 초기화
 * App.tsx 또는 초기 로딩 화면에서 호출
 */
export const initializeBibleAudioDataOnAppStart = async (): Promise<boolean> => {
    try {
        console.log('📚 성경 오디오 데이터 초기화 시작...');

        // 이미 초기화되어 있는지 확인
        const isInitialized = await initializeAudioData();
        if (isInitialized) {
            console.log('✅ 이미 초기화된 오디오 데이터 사용');
            return true;
        }

        // CSV 파일 읽기 시도
        // 1. 번들된 애셋에서 읽기 (React Native)
        try {
            const csvPath = `${RNFS.MainBundlePath}/Bible_Chapter_Mapping.csv`;
            const csvContent = await RNFS.readFile(csvPath, 'utf8');

            const success = await initializeAudioData(csvContent);
            if (success) {
                console.log('✅ 번들 애셋에서 CSV 데이터 로드 완료');
                return true;
            }
        } catch (bundleError) {
            console.log('번들 애셋에서 CSV 읽기 실패, 다른 방법 시도');
        }

        // 2. 다운로드된 파일에서 읽기
        try {
            const documentsPath = `${RNFS.DocumentDirectoryPath}/Bible_Chapter_Mapping.csv`;
            const exists = await RNFS.exists(documentsPath);

            if (exists) {
                const csvContent = await RNFS.readFile(documentsPath, 'utf8');
                const success = await initializeAudioData(csvContent);
                if (success) {
                    console.log('✅ 문서 디렉토리에서 CSV 데이터 로드 완료');
                    return true;
                }
            }
        } catch (docError) {
            console.log('문서 디렉토리에서 CSV 읽기 실패');
        }

        console.log('⚠️ CSV 파일을 찾을 수 없습니다. 기본값 사용');
        return false;

    } catch (error) {
        console.error('❌ 오디오 데이터 초기화 실패:', error);
        return false;
    }
};

/**
 * 수동으로 CSV 파일 업로드 및 초기화
 * 설정 페이지에서 사용
 */
export const uploadAndInitializeCSV = async (csvContent: string): Promise<boolean> => {
    try {
        console.log('📤 CSV 파일 업로드 및 초기화 시작...');

        const success = await initializeAudioData(csvContent);

        if (success) {
            // 문서 디렉토리에 저장 (다음 실행을 위해)
            try {
                const documentsPath = `${RNFS.DocumentDirectoryPath}/Bible_Chapter_Mapping.csv`;
                await RNFS.writeFile(documentsPath, csvContent, 'utf8');
                console.log('✅ CSV 파일 저장 완료');
            } catch (saveError) {
                console.log('CSV 파일 저장 실패:', saveError);
            }

            console.log('✅ CSV 데이터 초기화 성공');
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ CSV 업로드 및 초기화 실패:', error);
        return false;
    }
};

/**
 * 오디오 데이터 통계 가져오기
 */
export const getAudioDataStats = (): any => {
    try {
        const statsJson = defaultStorage.getString('bible_audio_stats');
        if (statsJson) {
            return JSON.parse(statsJson);
        }

        return null;
    } catch (error) {
        console.error('통계 데이터 로드 실패:', error);
        return null;
    }
};

/**
 * 오디오 데이터 초기화 상태 확인
 */
export const isAudioDataInitialized = (): boolean => {
    try {
        const audioDataMap = defaultStorage.getString('bible_audio_data_map');
        return !!audioDataMap;
    } catch (error) {
        return false;
    }
};

/**
 * 오디오 데이터 초기화 (개발/테스트용)
 */
export const clearAudioData = (): void => {
    try {
        defaultStorage.delete('bible_audio_data_map');
        defaultStorage.delete('bible_audio_stats');
        console.log('✅ 오디오 데이터 초기화 완료');
    } catch (error) {
        console.error('오디오 데이터 초기화 실패:', error);
    }
};