import TrackPlayer, {Event, State, RepeatMode, AppKilledPlaybackBehavior} from 'react-native-track-player';
import { Platform, AppState } from 'react-native';
import {defaultStorage} from "../utils/mmkv";
import {BibleStep} from "../utils/define";
import {illdocSelectSlice, bibleSelectSlice} from "../provider/redux/slice";
import {store} from "../provider/redux/store";
import {bibleAudioList} from "../components/layout/footer/playFooter";

// 전역 변수
let processingChapter = false;
let processingTimer = null;
let lastProcessTimestamp = 0;
let lastChapterInfo = { book: 0, jang: 0 };
let appState = 'active';
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
  const baseUrl = process.env.AUDIO_BASE_URL || 'https://your-audio-url.com/';
  return `${baseUrl}${bibleAudioList[book - 1]}${String(jang).padStart(3, "0")}.mp3`;
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
      artwork: require('../assets/img/bibile25.png'),
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

// 다음 장으로 이동하는 함수 - 백그라운드에서도 작동
const moveToNextChapter = async () => {
  // 백그라운드에서도 다음 장 재생 허용

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
      console.log(`Auto next chapter skipped: isIlldocPlayer=${isIlldocPlayer}, autoNextEnabled=${autoNextEnabled}`);
      clearProcessingFlags();
      return;
    }

    const currentBook = defaultStorage.getNumber("bible_book") ?? 1;
    const currentJang = defaultStorage.getNumber("bible_jang") ?? 1;

    if (lastChapterInfo.book === currentBook && lastChapterInfo.jang === currentJang) {
      if (now - lastProcessTimestamp < 3000) {
        console.log(`Already processed Book ${currentBook}, Chapter ${currentJang} recently`);
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

    console.log(`Moving to: Book ${nextBook}, Chapter ${nextJang} (from ${currentBook}:${currentJang})`);

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
      store.dispatch(bibleSelectSlice.actions.changePage({ book: nextBook, jang: nextJang }));
      store.dispatch(illdocSelectSlice.actions.changePage({ book: nextBook, jang: nextJang }));
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

// 백그라운드 전환 처리 - 계속 재생 유지
const handleBackgroundTransition = async () => {
  try {
    console.log('App moved to background - continuing playback');

    // 백그라운드에서도 계속 재생 유지 (앱 종료 시에만 정지)
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        alwaysPauseOnInterruption: false, // 인터럽션 시에도 재생 유지
        stoppingAppPausesPlayback: false, // 앱 정지 시에도 재생 유지
      },
      notification: {
        stopWithApp: true, // 앱 종료 시에만 알림 제거
      }
    });

    console.log("Background playback enabled - music continues in background");
  } catch (error) {
    console.error("Error in background transition:", error);
  }
};

// 노드 스타일로 export
module.exports = async function() {
  try {
    console.log("PlaybackService started - background playback enabled, stops only when app is killed");

    clearProcessingFlags();
    lastChapterInfo = { book: 0, jang: 0 };
    backgroundEventCount = 0;
    appState = 'active';

    try {
      // 백그라운드 재생 허용하되 앱 종료 시에만 음악 정지 설정
      await TrackPlayer.updateOptions({
        repeatMode: RepeatMode.Off,
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          alwaysPauseOnInterruption: false, // 인터럽션 시에도 재생 유지
          stoppingAppPausesPlayback: false, // 앱 정지 시에도 재생 유지
        },
        notification: {
          stopWithApp: true, // 앱 종료 시에만 알림 제거
        }
      });
      console.log("Background playback enabled - music continues until app is killed");
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    } catch (error) {
      console.error("Error setting playback options:", error);
    }

    // 앱 상태 관찰 - 백그라운드에서도 재생 유지
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('App state changed from', appState, 'to', nextAppState);

      if (appState === 'active' && nextAppState === 'background') {
        await handleBackgroundTransition();
        console.log('Background playback will continue normally');
      } else if (appState === 'background' && nextAppState === 'active') {
        console.log('App returned to foreground');
        backgroundEventCount = 0;
      }

      appState = nextAppState;
    });

    // 재생 완료 이벤트 리스너 - 백그라운드에서도 다음 장 재생
    const queueEndListener = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      console.log("PlaybackQueueEnded event");

      const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;

      if (isIlldocPlayer) {
        console.log("일독 플레이어에서는 자동 다음 장 기능 비활성화");
        return;
      }

      const autoNextEnabled = defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

      if (!autoNextEnabled) {
        console.log("자동 다음 장 기능이 비활성화됨");
        return;
      }

      // 백그라운드/포그라운드 관계없이 다음 장으로 이동
      try {
        console.log(`Auto next chapter - App state: ${AppState.currentState}`);
        await moveToNextChapter();
      } catch (error) {
        console.error("Error in auto next chapter:", error);
      }
    });

    // 트랙 진행 상태 모니터링 - 백그라운드/포그라운드 동일하게 처리
    const progressListener = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (info) => {
      const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;
      const autoNextEnabled = defaultStorage.getBoolean("auto_next_chapter_enabled") ?? false;

      if (isIlldocPlayer || !autoNextEnabled) {
        return;
      }

      // 백그라운드/포그라운드 관계없이 동일하게 처리
      if (
          info.position > 0 &&
          info.duration > 0 &&
          info.position >= info.duration - 0.5 &&
          !processingChapter
      ) {
        console.log(`Progress near end: ${info.position}/${info.duration} (App state: ${AppState.currentState})`);
        moveToNextChapter();
      }
    });

    const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      console.log(`Playback state changed: ${event.state}`);

      if (event.state === State.Playing) {
        const isIlldocPlayer = defaultStorage.getBoolean("is_illdoc_player") ?? false;
        console.log(`Current player is ${isIlldocPlayer ? 'IllDoc' : 'Bible'}`);

        TrackPlayer.setRepeatMode(RepeatMode.Off).catch(e => {
          console.error("Error setting repeat mode on state change:", e);
        });
      }
    });

    // 에러 이벤트
    const errorListener = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      console.error("Playback error:", event);
      clearProcessingFlags();
    });

    return () => {
      queueEndListener.remove();
      stateListener.remove();
      errorListener.remove();
      progressListener.remove();
      appStateSubscription?.remove();
      clearProcessingFlags();
    };

  } catch (error) {
    console.error("Error in PlaybackService:", error);
    clearProcessingFlags();
  }
};