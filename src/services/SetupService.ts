import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode
} from 'react-native-track-player';
import { AppState, Platform, PermissionsAndroid } from 'react-native';

// Android 13+ 알림 권한 요청
const requestNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '알림 권한',
            message: '음악 재생 제어를 위해 알림 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '취소',
            buttonPositive: '허용',
          }
      );
      console.log('Notification permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }
  return true; // Android 12 이하는 권한이 필요없음
};

const setupPlayer = async (
    options: Parameters<typeof TrackPlayer.setupPlayer>[0]
) => {
  const setup = async () => {
    try {
      // 서비스가 이미 실행 중인지 확인
      const isServiceRunning = await TrackPlayer.isServiceRunning();
      if (isServiceRunning) {
        console.log('TrackPlayer service already running');
        return null;
      }

      // 알림 권한 요청
      await requestNotificationPermission();

      // 백그라운드에서도 설정 가능하도록 수정
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true, // 자동 인터럽션 처리 활성화
        autoUpdateMetadata: true,
        waitForBuffer: true,
        ...options
      });

      console.log('TrackPlayer setup completed');
      return null;
    } catch (error) {
      console.error('TrackPlayer setup error:', error);
      return (error as Error & { code?: string }).code;
    }
  };

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    const result = await setup();

    if (result === 'android_cannot_setup_player_in_background') {
      console.log(`Retry ${retryCount + 1}/${maxRetries}: Background setup attempt`);
      retryCount++;

      // 짧은 대기 후 재시도
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    } else {
      break;
    }
  }

  if (retryCount >= maxRetries) {
    console.warn('Failed to setup player after maximum retries');
  }
};

export const SetupService = async () => {
  try {
    await setupPlayer({
      autoHandleInterruptions: true // 인터럽션 자동 처리
    });

    await TrackPlayer.updateOptions({
      android: {
        // 백그라운드 재생 허용, 앱 종료 시에만 음악 정지
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        alwaysPauseOnInterruption: false, // 인터럽션 시에도 재생 유지
        stoppingAppPausesPlayback: false, // 앱 정지 시에도 재생 유지
      },
      // 백그라운드에서도 알림 유지, 앱 종료 시에만 제거
      notification: {
        stopWithApp: true, // 앱 종료 시에만 알림 제거
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext
      ],
      progressUpdateEventInterval: 2,
      // 백그라운드 알림 기능
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious
      ]
    });

    // 반복 모드 비활성화
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    console.log('SetupService completed successfully - background playback enabled, stops only when app is killed');
  } catch (error) {
    console.error('SetupService failed:', error);
    throw error;
  }
};
