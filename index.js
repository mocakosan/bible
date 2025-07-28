/**
 * @format
 */
import { AppRegistry, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { PlaybackService } from './src/services/PlaybackService';

// 에러 핸들링 강화
const originalConsoleError = console.error;
console.error = (...args) => {
  // 특정 경고나 에러 무시 (필요한 경우)
  if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
          args[0].includes('Require cycle:'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// 앱 시작 시 TrackPlayer 서비스 초기화
const setupTrackPlayer = async () => {
  if (Platform.OS === 'android') {
    try {
      // 앱이 활성 상태일 때만 초기화
      if (AppState.currentState === 'active') {
        try {
          const isServiceRunning = await TrackPlayer.isServiceRunning();
          if (isServiceRunning) {
            // 기존 트랙 리셋
            await TrackPlayer.reset();
            console.log('이전 트랙 리셋 성공');
          }
        } catch (e) {
          console.log('트랙 리셋 불필요 또는 실패:', e.message);
        }
      }
    } catch (error) {
      console.error('앱 초기화 중 오류:', error);
    }
  }
};

// App 컴포넌트를 SafeAreaProvider로 감싸기
function MainApp({ isHeadless }) {
  // 헤드리스 모드 체크 개선
  if (isHeadless) {
    // 헤드리스 모드에서는 null 반환
    console.log('앱이 헤드리스 모드로 실행됨');
    return null;
  }

  return (
      <SafeAreaProvider>
        <App />
      </SafeAreaProvider>
  );
}

// 백그라운드 메시지 핸들러 등록 - 안전한 처리
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('백그라운드 메시지 수신:', remoteMessage);

  try {
    // DisplayNotifee 함수 안전하게 import
    const { DisplayNotifee } = require('./src/utils/notifee');
    if (DisplayNotifee && typeof DisplayNotifee === 'function') {
      await DisplayNotifee(remoteMessage);
    } else {
      console.warn('DisplayNotifee 함수를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('백그라운드 알림 표시 실패:', error);
  }

  return Promise.resolve();
});

// Notifee 백그라운드 이벤트 핸들러
notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    console.log('Notifee 백그라운드 이벤트:', type);
    // 필요한 경우 이벤트 처리 로직 추가
    return Promise.resolve();
  } catch (error) {
    console.error('Notifee 백그라운드 이벤트 처리 오류:', error);
    return Promise.resolve();
  }
});

// TrackPlayer 서비스 등록 - 안전한 처리
try {
  // PlaybackService 존재 여부 확인
  if (PlaybackService && typeof PlaybackService === 'function') {
    TrackPlayer.registerPlaybackService(() => PlaybackService);
    console.log('TrackPlayer 서비스 등록 성공');
  } else {
    console.warn('PlaybackService를 찾을 수 없습니다. 기본 서비스 사용');
    TrackPlayer.registerPlaybackService(() => require('./src/services/PlaybackService'));
  }
} catch (error) {
  console.error('TrackPlayer 서비스 등록 실패:', error);
}

// 앱 초기화 - 비동기 처리
const initializeApp = async () => {
  try {
    await setupTrackPlayer();
    console.log('앱 초기화 완료');
  } catch (error) {
    console.error('앱 초기화 실패:', error);
  }
};

// 앱 초기화 실행
initializeApp();

// 메인 앱 컴포넌트 등록
AppRegistry.registerComponent(appName, () => MainApp);