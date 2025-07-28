import TrackPlayer, {
  Event,
  State,
  AppKilledPlaybackBehavior,
  RepeatMode,
} from "react-native-track-player";
import { AppState } from "react-native";
import { defaultStorage } from "../utils/mmkv";

import { bibleSelectSlice } from "../provider/redux/slice";
import { BibleStep } from "../utils/define";
import axios from "axios";
import { api } from "../api/define";
import {store} from "../provider/redux/store";

// 프로세싱 플래그
let processingChapter = false;
let lastChapterInfo = { book: 0, jang: 0 };
let backgroundEventCount = 0;
let appState = "active";

// 프로세싱 플래그 초기화 함수
const clearProcessingFlags = () => {
  processingChapter = false;
  console.log("Processing flags cleared");
};

// 트랙 로드 함수
const loadTrack = async (book: number, jang: number): Promise<boolean> => {
  try {
    const bookCode = bibleAudioList[book - 1];
    const track = {
      id: `${book}-${jang}`,
      url: `https://bible25file.s3.ap-northeast-2.amazonaws.com/audiobible_개역개정/${book
          .toString()
          .padStart(2, "0")}_${bookCode}/${book
          .toString()
          .padStart(2, "0")}_${bookCode}_${jang
          .toString()
          .padStart(3, "0")}.mp3`,
      title: `${BibleStep[book - 1].title} ${jang}장`,
      artist: "성경일독",
      artwork: "https://bible25frontend.givemeprice.co.kr/images/logo2.png",
    };

    await TrackPlayer.reset();
    await TrackPlayer.add([track]);
    console.log(`Track loaded: ${track.title}`);
    return true;
  } catch (error) {
    console.error("Error loading track:", error);
    return false;
  }
};

// 다음 챕터로 이동
const moveToNextChapter = async () => {
  try {
    if (processingChapter) {
      console.log("Already processing chapter change");
      return;
    }

    processingChapter = true;
    console.log("Moving to next chapter");

    const autoNextEnabled = defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;
    const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;

    if (isIlldocPlayer || !autoNextEnabled) {
      console.log(
          `Auto next chapter skipped: isIlldocPlayer=${isIlldocPlayer}, autoNextEnabled=${autoNextEnabled}`
      );
      clearProcessingFlags();
      return;
    }

    const currentBook = defaultStorage.getNumber("bible_book") ?? 1;
    const currentJang = defaultStorage.getNumber("bible_jang") ?? 1;

    let nextBook = currentBook;
    let nextJang = currentJang + 1;

    // 다음 장 계산 로직
    const maxChapters = BibleStep[currentBook - 1]?.jang || 1;
    if (nextJang > maxChapters) {
      nextBook = currentBook + 1;
      nextJang = 1;

      if (nextBook > 66) {
        console.log("Reached end of Bible");
        clearProcessingFlags();
        return;
      }
    }

    // 상태 업데이트
    defaultStorage.set("bible_book", nextBook);
    defaultStorage.set("bible_jang", nextJang);

    // Redux 상태 업데이트
    try {
      store.dispatch(bibleSelectSlice.actions.updateStep({
        book: nextBook,
        jang: nextJang,
      }));
    } catch (error) {
      console.error("Redux dispatch error:", error);
    }

    const success = await loadTrack(nextBook, nextJang);

    if (success) {
      await TrackPlayer.play();
      console.log("Started playback of next chapter");
    }

    setTimeout(() => {
      processingChapter = false;
      console.log("Cleared processing flag");
    }, 2000);
  } catch (error) {
    console.error("Error handling next chapter:", error);
    clearProcessingFlags();

    setTimeout(() => {
      console.log("Retrying after error");
      moveToNextChapter();
    }, 3000);
  }
};

// 성경 오디오 목록
export const bibleAudioList: string[] = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa",
  "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro",
  "Ecc", "Son", "Isa", "Jer", "Lam", "Eze", "Dan", "Hos", "Joe", "Amo",
  "Oba", "Jon", "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal", "Mat",
  "Mar", "Luk", "Joh", "Act", "Rom", "1Co", "2Co", "Gal", "Eph", "Phi",
  "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jam", "1Pe",
  "2Pe", "1Jo", "2Jo", "3Jo", "Jud", "Rev"
];

// PlaybackService 함수
const PlaybackService = async () => {
  try {
    console.log("PlaybackService started");

    // 초기화
    clearProcessingFlags();
    lastChapterInfo = { book: 0, jang: 0 };
    backgroundEventCount = 0;
    appState = "active";

    // 서비스가 이미 실행 중인지 확인
    try {
      const isServiceRunning = await TrackPlayer.isServiceRunning();

      if (isServiceRunning) {
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
            stopForegroundGracePeriod: 5,
          },
          stopWithApp: true,
        });

        await TrackPlayer.setRepeatMode(RepeatMode.Off);
      }
    } catch (error) {
      console.error("Error updating options:", error);
    }

    // 앱 상태 변화 감지
    const appStateSubscription = AppState.addEventListener(
        "change",
        async (nextAppState) => {
          console.log("App state changed from", appState, "to", nextAppState);

          if (appState === "active" && nextAppState === "background") {
            backgroundEventCount = 0;

            try {
              // 백그라운드로 갈 때 포그라운드 서비스 정지 준비
              const state = await TrackPlayer.getState();
              if (state !== State.Playing) {
                // 재생 중이 아니면 서비스 정지
                await TrackPlayer.stop();
                await TrackPlayer.reset();
              }
            } catch (error) {
              console.error("Error handling background transition:", error);
            }
          }

          appState = nextAppState;
        }
    );

    // Queue end 이벤트 리스너
    const queueEndListener = TrackPlayer.addEventListener(
        Event.PlaybackQueueEnded,
        async (event) => {
          console.log("Queue ended event received");

          if (AppState.currentState === "active") {
            console.log("App is active, attempting to move to next chapter");
            moveToNextChapter();
          } else {
            console.log("App is in background, skipping auto next");
          }
        }
    );

    // Progress 이벤트 리스너
    const progressListener = TrackPlayer.addEventListener(
        Event.PlaybackProgressUpdated,
        async (event) => {
          const info = event;
          const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;
          const autoNextEnabled = defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

          if (isIlldocPlayer || !autoNextEnabled) {
            return;
          }

          if (AppState.currentState !== "active") {
            if (
                info.position > 0 &&
                info.duration > 0 &&
                info.position >= info.duration - 0.5 &&
                !processingChapter
            ) {
              console.log(
                  `Background mode - Progress near end: ${info.position}/${info.duration}`
              );
              moveToNextChapter();
            }
          }
        }
    );

    // Playback state 이벤트 리스너
    const stateListener = TrackPlayer.addEventListener(
        Event.PlaybackState,
        (event) => {
          console.log(`Playback state changed: ${event.state}`);

          if (event.state === State.Playing) {
            const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;
            console.log(
                `Current player is ${isIlldocPlayer ? "IllDoc" : "Bible"}`
            );

            TrackPlayer.setRepeatMode(RepeatMode.Off).catch((e) => {
              console.error("Error setting repeat mode on state change:", e);
            });
          }
        }
    );

    // 에러 이벤트 리스너
    const errorListener = TrackPlayer.addEventListener(
        Event.PlaybackError,
        (event) => {
          console.error("Playback error:", event);
          clearProcessingFlags();
        }
    );

    // 클린업 함수 반환
    return () => {
      queueEndListener.remove();
      stateListener.remove();
      errorListener.remove();
      progressListener.remove();
      appStateSubscription.remove();
      clearProcessingFlags();
    };
  } catch (error) {
    console.error("Error in PlaybackService:", error);
    clearProcessingFlags();
  }
};

// ES6 export와 CommonJS export 모두 지원
export default PlaybackService;
export { PlaybackService };

// CommonJS 호환성을 위한 module.exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlaybackService;
}