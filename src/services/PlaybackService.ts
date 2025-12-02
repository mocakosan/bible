import TrackPlayer, {
  Event,
  State,
  RepeatMode,
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";
import { Platform, AppState } from "react-native";
import { defaultStorage } from "../utils/mmkv";
import { BibleStep } from "../utils/define";
import { illdocSelectSlice, bibleSelectSlice } from "../provider/redux/slice";
import { store } from "../provider/redux/store";

// 전역 변수
let processingChapter = false;
let processingHymn = false; // ✅ 찬송가 처리 플래그 추가
let processingTimer: NodeJS.Timeout | null = null;
let lastProcessTimestamp = 0;
let lastChapterInfo = { book: 0, jang: 0 };
let lastHymnId = 0; // ✅ 마지막 처리된 찬송가 ID
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
  processingHymn = false; // ✅ 찬송가 플래그도 초기화
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
    console.log(`[BACKGROUND_SERVICE] Loading track for Book ${book}, Chapter ${jang}`);

    await TrackPlayer.reset();
    console.log(`[BACKGROUND_SERVICE] Player reset completed`);

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    const url = createSoundUrl(book, jang);
    console.log(`[BACKGROUND_SERVICE] Track URL: ${url}`);

    await TrackPlayer.add({
      id: `bible-bg-${book}-${jang}-${Date.now()}`,
      url: url,
      title: `${bibleAudioList[book - 1]} ${jang}`,
      artist: "성경",
      artwork: require("../assets/img/bibile25.png"),
    });
    console.log(`[BACKGROUND_SERVICE] Track added to queue`);

    const soundSpeed = defaultStorage.getNumber("last_audio_speed") ?? 1;
    if (soundSpeed !== 1) {
      await TrackPlayer.setRate(soundSpeed);
      console.log(`[BACKGROUND_SERVICE] Playback rate set to ${soundSpeed}`);
    }

    // 큐 상태 확인
    const queue = await TrackPlayer.getQueue();
    console.log(`[BACKGROUND_SERVICE] Queue length: ${queue.length}`);

    const state = await TrackPlayer.getState();
    console.log(`[BACKGROUND_SERVICE] Player state after load: ${state}`);

    console.log(`[BACKGROUND_SERVICE] ✅ Track loaded successfully`);
    return true;
  } catch (error) {
    console.error("[BACKGROUND_SERVICE] ❌ Error loading track:", error);
    return false;
  }
};

// ✅ 찬송가 다음 곡으로 이동하는 함수 - 001~099장 URL 패딩 수정
const moveToNextHymn = async () => {
  const now = Date.now();

  if (processingHymn && now - lastProcessTimestamp > 5000) {
    console.log("[HYMN_SERVICE] ⚠️ Force clearing stuck processing flag");
    processingHymn = false;
  }

  if (processingHymn) {
    console.log("[HYMN_SERVICE] ⚠️ Already processing hymn change, skipping");
    return;
  }

  processingHymn = true;
  lastProcessTimestamp = now;
  console.log("[HYMN_SERVICE] 🚀 Starting to process next hymn");

  try {
    const currentHymnId = defaultStorage.getNumber("current_hymn_id") ?? 1;
    const randomPlay = defaultStorage.getBoolean("hymn_random_play_enabled") ?? false;
    const isAccompany = defaultStorage.getBoolean("hymn_is_accompany") ?? false;

    console.log(`[HYMN_SERVICE] 📖 Current hymn: ${currentHymnId}장`);
    console.log(`[HYMN_SERVICE] 📝 Last processed hymn: ${lastHymnId}장`);

    let nextHymnId: number;

    if (randomPlay) {
      nextHymnId = Math.floor(Math.random() * 647) + 1;
      console.log(`[HYMN_SERVICE] 🎲 Random hymn: ${nextHymnId}장`);
    } else if (currentHymnId < 647) {
      nextHymnId = currentHymnId + 1;
      console.log(`[HYMN_SERVICE] ➡️ Next hymn: ${nextHymnId}장`);
    } else {
      console.log("[HYMN_SERVICE] 🏁 Last hymn reached - stopping");
      processingHymn = false;
      return;
    }

    if (lastHymnId === nextHymnId && lastHymnId !== 0) {
      console.log(`[HYMN_SERVICE] ⚠️ Already processing hymn ${nextHymnId} - skipping`);
      processingHymn = false;
      return;
    }

    lastHymnId = nextHymnId;
    console.log(`[HYMN_SERVICE] ✅ lastHymnId set to ${nextHymnId} before loading`);

    // ✅ 스토리지 업데이트 - 포그라운드 동기화를 위해
    defaultStorage.set("current_hymn_id", nextHymnId);
    defaultStorage.set("hymn_was_playing", true);

    console.log(`[HYMN_SERVICE] 🔄 백그라운드에서 트랙 로드 시작: ${nextHymnId}장`);

    try {
      await TrackPlayer.reset();
      console.log(`[HYMN_SERVICE] ✅ 플레이어 리셋 완료`);

      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      console.log(`[HYMN_SERVICE] ✅ RepeatMode.Off 설정`);

      // ✅ 🔥 여기가 핵심 수정 부분: 001~099장을 위한 3자리 패딩 추가
      const paddedHymnId = String(nextHymnId).padStart(3, '0');
      const audioUrl = isAccompany
          ? `https://data.bible25.com/chansong/audio_mr/${paddedHymnId}.mp3`
          : `https://data.bible25.com/chansong/audio/${paddedHymnId}.mp3`;

      console.log(`[HYMN_SERVICE] 🔍 반주모드: ${isAccompany}`);
      console.log(`[HYMN_SERVICE] 🎵 트랙 URL: ${audioUrl}`);
      console.log(`[HYMN_SERVICE] 📌 Padded ID: ${paddedHymnId} (Original: ${nextHymnId})`);

      await TrackPlayer.add({
        id: `hymn-${nextHymnId}`,
        url: audioUrl,
        title: `찬송가 ${nextHymnId}장`,
        artist: isAccompany ? '반주' : '찬양',
      });

      console.log(`[HYMN_SERVICE] ✅ 트랙 추가 완료`);

      console.log(`[HYMN_SERVICE] 🎵 재생 시도 중...`);
      await TrackPlayer.play();
      console.log(`[HYMN_SERVICE] ✅ 백그라운드에서 ${nextHymnId}장 재생 시작`);

    } catch (playError) {
      console.error("[HYMN_SERVICE] ❌ 트랙 로드/재생 실패:", playError);

      console.log("[HYMN_SERVICE] 🔄 재생 재시도 중...");
      try {
        await TrackPlayer.play();
        console.log(`[HYMN_SERVICE] ✅ 재시도 성공: ${nextHymnId}장 재생`);
      } catch (retryError) {
        console.error("[HYMN_SERVICE] ❌ 재시도도 실패:", retryError);
        defaultStorage.set("hymn_background_next", true);
        console.log("[HYMN_SERVICE] 📱 포그라운드 복귀 시 자동 로드 예정");
        lastHymnId = 0;
      }
    }

    setTimeout(() => {
      processingHymn = false;
      console.log("[HYMN_SERVICE] ✅ Processing flag cleared");
    }, 2000);

  } catch (error) {
    console.error("[HYMN_SERVICE] ❌ Error handling next hymn:", error);
    processingHymn = false;
    lastHymnId = 0;
  }
};

// 다음 장으로 이동하는 함수 - 개선된 버전
const moveToNextChapter = async () => {
  const now = Date.now();

  // 강제 플래그가 오래 걸려도 빠지지 않도록 기본 플래그 정리 유틸
  const clearProcessingFlags = () => {
    processingChapter = false;
    if (processingTimer) {
      clearTimeout(processingTimer);
      processingTimer = null;
    }
  };

  // 처리 중 타임아웃 해제
  if (processingChapter && now - lastProcessTimestamp > 5000) {
    console.log("[BACKGROUND_SERVICE] ⚠️ Force clearing stuck processing flag");
    clearProcessingFlags();
  }
  if (processingChapter) {
    console.log("[BACKGROUND_SERVICE] ⚠️ Already processing chapter change, skipping");
    return;
  }

  processingChapter = true;
  lastProcessTimestamp = now;
  console.log("[BACKGROUND_SERVICE] 🚀 Starting to process next chapter");
  console.log(`[BACKGROUND_SERVICE] 📋 Last chapter info before processing: ${lastChapterInfo.book}권 ${lastChapterInfo.jang}장`);

  try {
    // 수동 이동 이후 자동진행 1회 강제 플래그
    const forceOnce = defaultStorage.getBoolean("force_auto_next_once") ?? false;
    if (forceOnce) {
      console.log("[BACKGROUND_SERVICE] force_auto_next_once → skip guards once");
      lastChapterInfo = { book: 0, jang: 0 };
      processingChapter = false; // 이후 로직에서 다시 true로 세팅됨
      defaultStorage.set("force_auto_next_once", false);
      processingChapter = true;
      lastProcessTimestamp = Date.now();
    }

    // 수동 이동 이후 백그라운드 자동진행 재개를 위한 가드 우회
    const manualAt = defaultStorage.getNumber("manual_navigation_at") ?? 0;
    if (Date.now() - manualAt < 10000) {
      console.log("[BACKGROUND_SERVICE] Manual navigation within 10s, reset markers");
      lastChapterInfo = { book: 0, jang: 0 };
      processingChapter = true; // 계속 처리
    }

    // 현재 위치 읽기
    const currentBook = defaultStorage.getNumber("bible_book") ?? 1;
    const currentJang = defaultStorage.getNumber("bible_jang") ?? 1;
    console.log(`[BACKGROUND_SERVICE] 📖 Current: ${currentBook}권 ${currentJang}장`);

    //'과거(이전장/이전권)'로 이동한 경우 내부 마커 초기화
    const wentBackward =
        currentBook < lastChapterInfo.book ||
        (currentBook === lastChapterInfo.book && currentJang < lastChapterInfo.jang);
    if (wentBackward) {
      console.log("[BACKGROUND_SERVICE] Detected backward navigation → reset markers");
      lastChapterInfo = { book: 0, jang: 0 };
      processingChapter = true; // 계속 처리
    }

    // 다음 장 계산
    let nextBook = currentBook;
    let nextJang = currentJang + 1;

    // 다음 장 계산 로직 - BibleStep 구조 수정
    const maxChapters = BibleStep[currentBook - 1]?.count || 1;
    console.log(`[BACKGROUND_SERVICE] 📊 Max chapters in book ${currentBook}: ${maxChapters}`);

    if (nextJang > maxChapters) {
      if (currentBook === 66) {
        console.log("[BACKGROUND_SERVICE] 🏁 Reached end of Bible");
        clearProcessingFlags();
        return;
      }
      nextBook = currentBook + 1;
      nextJang = 1;
    }
    console.log(`[BACKGROUND_SERVICE] 🎯 Target: ${nextBook}권 ${nextJang}장`);
    console.log(`[BACKGROUND_SERVICE] 📝 Last processed chapter: ${lastChapterInfo.book}권 ${lastChapterInfo.jang}장`);

    // 이미 다음 장을 처리했는지 확인 (목표 장 기준)
    // 단, 초기값(0,0)은 무시
    if (
        lastChapterInfo.book === nextBook &&
        lastChapterInfo.jang === nextJang &&
        lastChapterInfo.book !== 0
    ) {
      console.log(
          `[BACKGROUND_SERVICE] ⚠️ Already processed target chapter: ${nextBook}권 ${nextJang}장 - skipping`
      );
      clearProcessingFlags();
      return;
    }

    // 상태 업데이트
    defaultStorage.set("bible_book", nextBook);
    defaultStorage.set("bible_jang", nextJang);
    defaultStorage.set("bible_book_connec", nextBook);
    defaultStorage.set("bible_jang_connec", nextJang);

    // Redux 상태 업데이트 - changePage 액션 사용
    try {
      store.dispatch(bibleSelectSlice.actions.changePage({
        book: nextBook,
        jang: nextJang,
      }));
      console.log(`[BACKGROUND_SERVICE] 🔄 Redux state updated`);
    } catch (error) {
      console.error("[BACKGROUND_SERVICE] ⚠️ Redux dispatch error (non-critical):", error);
    }

    // 트랙 로드 및 재생
    const success = await loadTrack(nextBook, nextJang);

    if (success) {
      console.log(`[BACKGROUND_SERVICE] 🔄 Track loaded, attempting immediate playback...`);

      try {
        console.log(`[BACKGROUND_SERVICE] 🎵 Calling TrackPlayer.play()...`);
        await TrackPlayer.play();
        console.log(`[BACKGROUND_SERVICE] ✅ Started playback of ${nextBook}권 ${nextJang}장`);
        lastChapterInfo = { book: nextBook, jang: nextJang };
      } catch (playError) {
        console.error(`[BACKGROUND_SERVICE] ❌ Failed to start playback:`, playError);
        console.log(`[BACKGROUND_SERVICE] 🔄 Retrying playback immediately...`);
        try {
          await TrackPlayer.play();
          console.log(`[BACKGROUND_SERVICE] ✅ Playback started on retry`);
          lastChapterInfo = { book: nextBook, jang: nextJang };
        } catch (retryError) {
          console.error(`[BACKGROUND_SERVICE] ❌ Retry also failed:`, retryError);
        }
      }
    } else {
      console.error(`[BACKGROUND_SERVICE] ❌ Failed to load track`);
    }

    // 플래그 해제
    setTimeout(() => {
      processingChapter = false;
      console.log("[BACKGROUND_SERVICE] ✅ Processing flag cleared");
    }, 2000);

  } catch (error) {
    console.error("[BACKGROUND_SERVICE] ❌ Error handling next chapter:", error);
    clearProcessingFlags();

    // 에러 발생 시 재시도 (한 번만)
    setTimeout(() => {
      console.log("[BACKGROUND_SERVICE] 🔄 Retrying after error...");
      moveToNextChapter();
    }, 3000);
  }
};

// PlaybackService 함수
const PlaybackService = async () => {
  try {
    console.log("[BACKGROUND_SERVICE] 🎬 PlaybackService started");

    clearProcessingFlags();
    lastChapterInfo = { book: 0, jang: 0 };
    lastHymnId = 0; // ✅ 찬송가 초기화
    backgroundEventCount = 0;
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
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
        ],
        notification: {
          stopWithApp: true,
        },
      });
      console.log("[BACKGROUND_SERVICE] ✅ RepeatMode disabled and capabilities set");
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    } catch (error) {
      console.error("[BACKGROUND_SERVICE] ⚠️ Error setting repeat mode:", error);
    }

    // Queue end 이벤트 리스너 - 백그라운드 전용 (성경 + 성경일독 + 찬송가 모두 지원)
    const queueEndListener = TrackPlayer.addEventListener(
        Event.PlaybackQueueEnded,
        async (event) => {
          console.log("[BACKGROUND_SERVICE] 🎵 Queue ended event received");
          console.log(`[BACKGROUND_SERVICE] 📱 App state: ${AppState.currentState}`);

          // ⭐ 백그라운드에서만 처리 (포어그라운드는 각 플레이어에서 처리)
          if (AppState.currentState === "active") {
            console.log("[BACKGROUND_SERVICE] ℹ️ App is active, letting foreground player handle it");
            return;
          }

          // ✅ 찬송가 플레이어인지 먼저 확인 (우선순위 높임)
          const isHymnPlayer = defaultStorage.getBoolean("is_hymn_player") ?? false;
          const hymnAutoPlay = defaultStorage.getBoolean("hymn_auto_play_enabled") ?? false;

          console.log(`[BACKGROUND_SERVICE] 🔍 플래그 확인:`);
          console.log(`[BACKGROUND_SERVICE]   - is_hymn_player: ${isHymnPlayer}`);
          console.log(`[BACKGROUND_SERVICE]   - hymn_auto_play_enabled: ${hymnAutoPlay}`);

          if (isHymnPlayer) {
            console.log("[BACKGROUND_SERVICE] 🎵 찬송가 플레이어 감지됨");

            if (!hymnAutoPlay) {
              console.log("[BACKGROUND_SERVICE] ❌ 찬송가 자동재생 비활성화");
              return;
            }

            console.log("[BACKGROUND_SERVICE] ✅ 찬송가 다음 곡으로 이동 시작");
            moveToNextHymn();
            return;
          }

          // 성경일독 플레이어인지 일반 성경 플레이어인지 확인
          const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;
          console.log(`[BACKGROUND_SERVICE] 📖 Player type: ${isIlldocPlayer ? "성경일독" : "일반성경"}`);

          // 일반 성경 플레이어의 경우 자동 다음 장 설정 확인
          if (!isIlldocPlayer) {
            const autoNextEnabled = defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

            if (!autoNextEnabled) {
              console.log(`[BACKGROUND_SERVICE] ❌ Auto next disabled for Bible player`);
              return;
            }
          }

          console.log("[BACKGROUND_SERVICE] ✅ Attempting to move to next chapter in background");
          moveToNextChapter();
        }
    );

    // Playback state 이벤트 리스너
    const stateListener = TrackPlayer.addEventListener(
        Event.PlaybackState,
        (event) => {
          console.log(`[BACKGROUND_SERVICE] 🎵 Playback state changed: ${event.state}`);

          if (event.state === State.Playing) {
            const isHymnPlayer = defaultStorage.getBoolean("is_hymn_player") ?? false;
            const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;

            let playerType = "Bible";
            if (isHymnPlayer) {
              playerType = "Hymn";
            } else if (isIlldocPlayer) {
              playerType = "IllDoc";
            }

            console.log(`[BACKGROUND_SERVICE] Current player is ${playerType}`);
            console.log(`[BACKGROUND_SERVICE] 플래그 상태: hymn=${isHymnPlayer}, illdoc=${isIlldocPlayer}`);

            TrackPlayer.setRepeatMode(RepeatMode.Off).catch((e) => {
              console.error("[BACKGROUND_SERVICE] Error setting repeat mode on state change:", e);
            });
          }
        }
    );

    // 에러 이벤트 리스너
    const errorListener = TrackPlayer.addEventListener(
        Event.PlaybackError,
        (event) => {
          console.error("[BACKGROUND_SERVICE] ❌ Playback error:", event);
          clearProcessingFlags();
        }
    );

    // 앱 상태 변화 감지
    const appStateSubscription = AppState.addEventListener(
        "change",
        async (nextAppState) => {
          console.log(`[BACKGROUND_SERVICE] 📱 App state changed from ${appState} to ${nextAppState}`);

          if (appState === "active" && nextAppState === "background") {
            console.log("[BACKGROUND_SERVICE] ⬇️ App moved to background - ready for background playback");
            backgroundEventCount = 0;
          } else if (appState === "background" && nextAppState === "active") {
            console.log("[BACKGROUND_SERVICE] ⬆️ App returned to foreground");

            // ✅ 찬송가 플레이어 마커 리셋
            lastHymnId = 0;
          }

          appState = nextAppState;
        }
    );

    return () => {
      console.log("[BACKGROUND_SERVICE] 🛑 Cleaning up listeners");
      queueEndListener.remove();
      stateListener.remove();
      errorListener.remove();
      appStateSubscription.remove();
      clearProcessingFlags();
    };
  } catch (error) {
    console.error("[BACKGROUND_SERVICE] ❌ Error in PlaybackService:", error);
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