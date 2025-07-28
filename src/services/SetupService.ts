import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
} from "react-native-track-player";
import { AppState } from "react-native";

const setupPlayer = async (
    options: Parameters<typeof TrackPlayer.setupPlayer>[0]
) => {
  const setup = async () => {
    try {
      // 앱이 포그라운드에 있을 때만 설정
      if (AppState.currentState === 'active') {
        await TrackPlayer.setupPlayer(options);
      } else {
        throw new Error('android_cannot_setup_player_in_background');
      }
    } catch (error) {
      return (error as Error & { code?: string }).code;
    }
  };

  while ((await setup()) === "android_cannot_setup_player_in_background") {
    // 앱이 포그라운드로 돌아올 때까지 대기
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
};

export const SetupService = async () => {
  await setupPlayer({
    autoHandleInterruptions: false,
    waitForBuffer: true,
  });

  await TrackPlayer.updateOptions({
    android: {
      // 중요: 앱 종료 시 서비스도 중지
      appKilledPlaybackBehavior:
      AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      alwaysPauseOnInterruption: true,
      stopForegroundGracePeriod: 5,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    progressUpdateEventInterval: 2,
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
    ],
  });

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
};