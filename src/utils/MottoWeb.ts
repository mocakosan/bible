import { NativeModules, Platform } from 'react-native';

interface MottoWebInterface {
    openMottoWeb(pubKey: string, uid: string, adId: string): Promise<boolean>;
}

const { MottoWeb } = NativeModules;

export const openMottoWeb = async (pubKey: string, uid: string, adId: string): Promise<void> => {
    try {
        if (Platform.OS === 'android') {
            await MottoWeb.openMottoWeb(pubKey, uid, adId);
        } else {
            console.warn('MottoWeb은 Android에서만 지원됩니다.');
        }
    } catch (error) {
        console.error('MottoWeb 열기 실패:', error);
        throw error;
    }
};

export default {
    openMottoWeb,
};