// src/services/HymnPlaybackService.ts
import TrackPlayer, {
    Event,
    State,
    RepeatMode,
    AppKilledPlaybackBehavior,
    Capability,
} from "react-native-track-player";
import { AppState } from "react-native";
import { defaultStorage } from "../utils/mmkv";

let processingTrack = false;
let appState = "active";

const HymnPlaybackService = async () => {
    try {
        console.log("[HYMN_SERVICE] 🎬 찬송가 플레이어 서비스 시작");

        processingTrack = false;
        appState = "active";

        try {
            await TrackPlayer.updateOptions({
                repeatMode: RepeatMode.Off,
                android: {
                    appKilledPlaybackBehavior:
                    AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                },
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                    Capability.SeekTo,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                ],
                compactCapabilities: [Capability.Play, Capability.Pause],
                notification: {
                    stopWithApp: true,
                },
            });
            console.log("[HYMN_SERVICE] ✅ 찬송가 플레이어 옵션 설정 완료");
            await TrackPlayer.setRepeatMode(RepeatMode.Off);
        } catch (error) {
            console.error("[HYMN_SERVICE] ⚠️ 옵션 설정 오류:", error);
        }

        // Queue end 이벤트 리스너 - 찬송가용
        const queueEndListener = TrackPlayer.addEventListener(
            Event.PlaybackQueueEnded,
            async (event) => {
                console.log("[HYMN_SERVICE] 🎵 찬송가 재생 완료");

                // 자동재생이 켜져있으면 다음 곡으로
                const autoPlayEnabled = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;
                if (autoPlayEnabled) {
                    const currentHymnId = defaultStorage.getNumber("current_hymn_id") ?? 1;
                    if (currentHymnId < 647) {
                        console.log(`[HYMN_SERVICE] ⏭ 다음 찬송가로 이동: ${currentHymnId + 1}`);
                        defaultStorage.set("current_hymn_id", currentHymnId + 1);
                        defaultStorage.set("hymn_should_play_next", true);
                    }
                }
            }
        );

        // Playback state 이벤트 리스너
        const stateListener = TrackPlayer.addEventListener(
            Event.PlaybackState,
            (event) => {
                console.log(`[HYMN_SERVICE] 🎵 재생 상태 변경: ${event.state}`);
            }
        );

        // 에러 이벤트 리스너
        const errorListener = TrackPlayer.addEventListener(
            Event.PlaybackError,
            (event) => {
                console.error("[HYMN_SERVICE] ❌ 재생 오류:", event);
                processingTrack = false;
            }
        );

        // 앱 상태 변화 감지
        const appStateSubscription = AppState.addEventListener(
            "change",
            async (nextAppState) => {
                console.log(`[HYMN_SERVICE] 📱 앱 상태 변경: ${appState} → ${nextAppState}`);

                if (appState === "active" && nextAppState === "background") {
                    console.log("[HYMN_SERVICE] ⬇️ 백그라운드로 이동");
                } else if (appState === "background" && nextAppState === "active") {
                    console.log("[HYMN_SERVICE] ⬆️ 포그라운드로 복귀");
                }

                appState = nextAppState;
            }
        );

        return () => {
            console.log("[HYMN_SERVICE] 🛑 찬송가 플레이어 리스너 정리");
            queueEndListener.remove();
            stateListener.remove();
            errorListener.remove();
            appStateSubscription.remove();
            processingTrack = false;
        };
    } catch (error) {
        console.error("[HYMN_SERVICE] ❌ 서비스 오류:", error);
        processingTrack = false;
    }
};

export default HymnPlaybackService;
export { HymnPlaybackService };