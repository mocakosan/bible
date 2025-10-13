import TrackPlayer, {
  Event,
  State,
  RepeatMode,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import { Platform, AppState } from "react-native";
import { defaultStorage } from "../utils/mmkv";
import { BibleStep } from "../utils/define";
import { illdocSelectSlice, bibleSelectSlice } from "../provider/redux/slice";
import { store } from "../provider/redux/store";

// 전역 변수
let processingChapter = false;
let processingTimer: NodeJS.Timeout | null = null;
let lastProcessTimestamp = 0;
let lastChapterInfo = { book: 0, jang: 0 };
let appState = "active";
let backgroundEventCount = 0;

// 성경 오디오 파일 목록
const bibleAudioList: string[] = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa",
  "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est", "Job", "Psa", "Pro",
  "Ecc", "Son", "Isa", "Jer", "Lam", "Eze", "Dan", "Hos", "Joe", "Amo",
  "Oba", "Jon", "Mic", "Nah", "Hab", "Zep", "Hag", "Zec", "Mal", "Mat",
  "Mar", "Luk", "Joh", "Act", "Rom", "1Co", "2Co", "Gal", "Eph", "Phi",
  "Col", "1Th", "2Th", "1Ti", "2Ti", "Tit", "Phm", "Heb", "Jam", "1Pe",
  "2Pe", "1Jo", "2Jo", "3Jo", "Jud", "Rev",
];

// 플래그 초기화 함수
const clearProcessingFlags = () => {
  processingChapter = false;
  if (processingTimer) {
    clearTimeout(processingTimer);
    processingTimer = null;
  }
};

// 음원 URL 생성 함수
const createSoundUrl = (book: number, jang: number): string => {
  const baseUrl = process.env.AUDIO_BASE_URL || "https://your-audio-url.com/";
  return `${baseUrl}${bibleAudioList[book - 1]}${String(jang).padStart(3, "0")}.mp3`;
};

// 트랙 로드 함수
const loadTrack = async (book: number, jang: number): Promise<boolean> => {
  try {
    console.log(`Loading track for Book ${book}, Chapter ${jang}`);

    await TrackPlayer.reset();
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    const url = createSoundUrl(book, jang);

    await TrackPlayer.add({
      id: "bible",
      url: url,
      title: `${bibleAudioList[book - 1]} ${jang}`,
      artist: "성경",
      artwork: require("../assets/img/bibile25.png"),
    });

    const soundSpeed = defaultStorage.getNumber("last_audio_speed") ?? 1;
    if (soundSpeed !== 1) {
      await TrackPlayer.setRate(soundSpeed);
    }

    return true;
  } catch (error) {
    console.error("Error loading track:", error);
    return false;
  }
};

// 안전한 타임아웃 설정
const safeSetTimeout = (callback: () => void, delay: number) => {
  if (processingTimer) {
    clearTimeout(processingTimer);
  }
  processingTimer = setTimeout(() => {
    callback();
    processingTimer = null;
  }, delay);
};

// 다음 장으로 이동하는 함수
const moveToNextChapter = async () => {
  const now = Date.now();

  if (processingChapter && now - lastProcessTimestamp > 5000) {
    console.log("Force clearing stuck processing flag");
    clearProcessingFlags();
  }

  if (processingChapter) {
    console.log("Already processing chapter change, skipping");
    return;
  }

  processingChapter = true;
  lastProcessTimestamp = now;
  console.log("Starting to process next chapter");

  try {
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

// PlaybackService 함수 - ES6 export로 변경
const PlaybackService = async () => {
  try {
    console.log("PlaybackService started");

    clearProcessingFlags();
    lastChapterInfo = { book: 0, jang: 0 };
    backgroundEventCount = 0;
    appState = "active";

    try {
      await TrackPlayer.updateOptions({
        repeatMode: RepeatMode.Off,
        android: {
          appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        notification: {
          stopWithApp: true,
        },
      });
      console.log("RepeatMode disabled");
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    } catch (error) {
      console.error("Error setting repeat mode:", error);
    }

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

    // 앱 상태 변화 감지
    const appStateSubscription = AppState.addEventListener(
        "change",
        async (nextAppState) => {
          console.log("App state changed from", appState, "to", nextAppState);

          if (appState === "active" && nextAppState === "background") {
            backgroundEventCount = 0;
          }

          appState = nextAppState;
        }
    );

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

// CommonJS 호환성을 위한 module.exports (하지만 조건부로)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlaybackService;
}