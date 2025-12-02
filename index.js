/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import appName from './app.json';
import { FbBackgrdMsgHandler } from './src/utils/firebase';

import notifee from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';

// 앱 시작 시 TrackPlayer 서비스 초기화 시도 - 더 안전하게 수정
const setupTrackPlayer = async () => {
  if (Platform.OS === 'android') {
    try {
      // TrackPlayer 서비스 정리 시도 (3.2.0 버전 호환성)
      try {
        // 새 TrackPlayer 설정 전 기존 트랙 리셋
        await TrackPlayer.reset();
        console.log('이전 트랙 리셋 성공');
      } catch (e) {
        console.log('트랙 리셋 불필요 또는 실패:', e.message);
      }
    } catch (error) {
      console.error('앱 초기화 중 오류:', error);
    }
  }
};

// 앱 시작 시 초기화 시도
setupTrackPlayer();

// App 컴포넌트를 SafeAreaProvider로 감싸기
function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    // 헤드리스 모드에서 Firebase 메시지만 처리
    return null;
  }

  return (
      <SafeAreaProvider>
        <App />
      </SafeAreaProvider>
  );
}

// 백그라운드 메시지 핸들러 등록 - 완전히 단순화하여 StackOverflowError 방지
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('백그라운드 메시지 수신:', remoteMessage);

  // 직접 notifee를 사용하여 알림 표시 (최소한의 처리만)
  try {
    const { DisplayNotifee } = require('./src/utils/notifee');
    await DisplayNotifee(remoteMessage);
  } catch (error) {
    console.error('백그라운드 알림 표시 실패:', error);
  }

  return Promise.resolve();
});

// Notifee 백그라운드 이벤트 핸들러 - 최대한 단순화
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Notifee 백그라운드 이벤트:', type);
  // 최소한의 처리만 수행
  return Promise.resolve();
});

// 메인 앱 컴포넌트 등록
AppRegistry.registerComponent(appName[Platform.OS].name, () => HeadlessCheck);

// 헤드리스 태스크 등록 - 완전히 제거하여 충돌 방지
// Android의 헤드리스 태스크는 Firebase가 자동으로 처리하도록 함
// AppRegistry.registerHeadlessTask 제거

// TrackPlayer 서비스 등록 - PlaybackService import 문제 수정
try {
  TrackPlayer.registerPlaybackService(() => {
    try {
      // 동적 import 대신 직접 require 사용
      return require('./src/services/PlaybackService').default || require('./src/services/PlaybackService');
    } catch (error) {
      console.error('PlaybackService 로드 오류:', error);
      // 기본 서비스 반환
      return async () => {
        console.log('기본 PlaybackService 실행');
      };
    }
  });
} catch (error) {
  console.error('TrackPlayer 서비스 등록 오류:', error);
}