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
import { bibleAudioList } from "../components/layout/footer/playFooter";

// 전역 변수
let processingChapter = false;
let processingTimer = null;
let lastProcessTimestamp = 0;
let lastChapterInfo = { book: 0, jang: 0 };
let appState = "active";
let backgroundEventCount = 0;

// 플래그 초기화 함수
const clearProcessingFlags = () => {
  processingChapter = false;
  if (processingTimer) {
    clearTimeout(processingTimer);
    processingTimer = null;
  }
};

// 음원 URL 생성 함수
const createSoundUrl = (book, jang) => {
  const baseUrl = process.env.AUDIO_BASE_URL || "https://your-audio-url.com/";
  return `${baseUrl}${bibleAudioList[book - 1]}${String(jang).padStart(
    3,
    "0"
  )}.mp3`;
};

// 트랙 로드 함수
const loadTrack = async (book, jang) => {
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
const safeSetTimeout = (callback, delay) => {
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
    const autoNextEnabled =
      defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;
    const isIlldocPlayer =
      defaultStorage.getBoolean("is_illdoc_player") ?? false;

    if (isIlldocPlayer || !autoNextEnabled) {
      console.log(
        `Auto next chapter skipped: isIlldocPlayer=${isIlldocPlayer}, autoNextEnabled=${autoNextEnabled}`
      );
      clearProcessingFlags();
      return;
    }

    const currentBook = defaultStorage.getNumber("bible_book") ?? 1;
    const currentJang = defaultStorage.getNumber("bible_jang") ?? 1;

    if (
      lastChapterInfo.book === currentBook &&
      lastChapterInfo.jang === currentJang
    ) {
      if (now - lastProcessTimestamp < 3000) {
        console.log(
          `Already processed Book ${currentBook}, Chapter ${currentJang} recently`
        );
        clearProcessingFlags();
        return;
      }
    }

    let nextBook = currentBook;
    let nextJang = currentJang + 1;

    const totalJang = BibleStep[currentBook - 1]?.count || 1;
    if (nextJang > totalJang) {
      if (currentBook === 66) {
        console.log("End of Bible reached");
        clearProcessingFlags();
        return;
      } else {
        nextBook = currentBook + 1;
        nextJang = 1;
      }
    }

    console.log(
      `Moving to: Book ${nextBook}, Chapter ${nextJang} (from ${currentBook}:${currentJang})`
    );

    lastChapterInfo = { book: currentBook, jang: currentJang };

    await TrackPlayer.pause();
    await TrackPlayer.reset();
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    defaultStorage.set("bible_book", nextBook);
    defaultStorage.set("bible_jang", nextJang);
    defaultStorage.set("bible_book_connec", nextBook);
    defaultStorage.set("bible_jang_connec", nextJang);
    defaultStorage.set("is_illdoc_player", false);
    defaultStorage.set("auto_next_chapter_enabled", true);

    try {
      store.dispatch(
        bibleSelectSlice.actions.changePage({ book: nextBook, jang: nextJang })
      );
      store.dispatch(
        illdocSelectSlice.actions.changePage({ book: nextBook, jang: nextJang })
      );
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

// 노드 스타일로 export
module.exports = async function () {
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

    // 앱 상태 관찰
    const appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        console.log("App state changed from", appState, "to", nextAppState);

        if (appState === "active" && nextAppState === "background") {
          console.log("App moved to background");

          try {
            await TrackPlayer.setRepeatMode(RepeatMode.Off);
            await TrackPlayer.updateOptions({
              android: {
                appKilledPlaybackBehavior:
                  AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
              },
              notification: {
                stopWithApp: true,
              },
            });
            console.log("Kill behavior set on background transition");

            if (Platform.OS === "android") {
              try {
                setTimeout(() => {
                  if (AppState.currentState === "background") {
                    console.log(
                      "Still in background - preparing for possible kill"
                    );
                    TrackPlayer.pause().catch(() => {});
                  }
                }, 1000);
              } catch (error) {
                console.error("Error in background kill handler:", error);
              }
            }

            backgroundEventCount = 0;
          } catch (error) {
            console.error("Error setting options on background:", error);
          }
        }

        appState = nextAppState;
      }
    );

    // 재생 완료 이벤트 리스너
    const queueEndListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        console.log("PlaybackQueueEnded event");

        // 성경일독 플레이어인지 확인
        const isIlldocPlayer =
          defaultStorage.getBoolean("is_illdoc_player") ?? false;

        if (isIlldocPlayer) {
          console.log("🎯 IllDoc player - auto progress handled by component");
          return;
        }

        // 자동 다음 장 기능이 활성화되어 있는지 확인
        const autoNextEnabled =
          defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

        if (!autoNextEnabled) {
          console.log("Auto next chapter disabled");
          return;
        }

        if (appState === "background") {
          backgroundEventCount++;
          if (backgroundEventCount > 1) {
            console.log(
              `Ignoring duplicate background event #${backgroundEventCount}`
            );
            return;
          }
        }

        moveToNextChapter();

        if (appState === "background") {
          setTimeout(() => {
            backgroundEventCount = 0;
          }, 3000);
        }
      }
    );

    // 트랙 진행 상태 모니터링
    const progressListener = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      async (info) => {
        const isIlldocPlayer =
          defaultStorage.getBoolean("is_illdoc_player") ?? false;
        const autoNextEnabled =
          defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

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

    const stateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event) => {
        console.log(`Playback state changed: ${event.state}`);

        if (event.state === State.Playing) {
          const isIlldocPlayer =
            defaultStorage.getBoolean("is_illdoc_player") ?? false;
          console.log(
            `Current player is ${isIlldocPlayer ? "IllDoc" : "Bible"}`
          );

          TrackPlayer.setRepeatMode(RepeatMode.Off).catch((e) => {
            console.error("Error setting repeat mode on state change:", e);
          });
        }
      }
    );

    // 에러 이벤트
    const errorListener = TrackPlayer.addEventListener(
      Event.PlaybackError,
      (event) => {
        console.error("Playback error:", event);
        clearProcessingFlags();
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
