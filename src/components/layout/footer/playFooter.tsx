import { Box, Button, Slider, Text, VStack } from "native-base";
import { memo, useEffect, useCallback, useRef, useState } from "react";
import FontAwesomeIcons from "react-native-vector-icons/FontAwesome";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // SafeArea 추가

import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import {
  AppState,
  TouchableOpacity,
  Alert,
  Platform,
  BackHandler,
} from "react-native";
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  State,
  Event,
  Capability,
  RepeatMode,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import { useDispatch } from "react-redux";
import {
  bibleSelectSlice,
  illdocSelectSlice,
} from "../../../provider/redux/slice";
import { BibleStep } from "../../../utils/define";
import { defaultStorage } from "../../../utils/mmkv";

export const bibleAudioList: string[] = [
  "Gen",
  "Exo",
  "Lev",
  "Num",
  "Deu",
  "Jos",
  "Jdg",
  "Rut",
  "1Sa",
  "2Sa",
  "1Ki",
  "2Ki",
  "1Ch",
  "2Ch",
  "Ezr",
  "Neh",
  "Est",
  "Job",
  "Psa",
  "Pro",
  "Ecc",
  "Son",
  "Isa",
  "Jer",
  "Lam",
  "Eze",
  "Dan",
  "Hos",
  "Joe",
  "Amo",
  "Oba",
  "Jon",
  "Mic",
  "Nah",
  "Hab",
  "Zep",
  "Hag",
  "Zec",
  "Mal",
  "Mat",
  "Mar",
  "Luk",
  "Joh",
  "Act",
  "Rom",
  "1Co",
  "2Co",
  "Gal",
  "Eph",
  "Phi",
  "Col",
  "1Th",
  "2Th",
  "1Ti",
  "2Ti",
  "Tit",
  "Phm",
  "Heb",
  "Jam",
  "1Pe",
  "2Pe",
  "1Jo",
  "2Jo",
  "3Jo",
  "Jud",
  "Rev",
];

// 가드 추가 : 이미 같은 장이 재생 중이면 다시 시작하지 않도록 확인하는 함수
async function ensureNotRestarting(book: number, jang: number) {
  try {
    const queue = await TrackPlayer.getQueue();
    const state = await TrackPlayer.getState();
    const pos = await TrackPlayer.getPosition();
    const urlPart = `${bibleAudioList[book - 1]}${String(jang).padStart(3, "0")}.mp3`;
    const sameTrack =
      queue.length > 0 &&
      typeof (queue[0] as any)?.url === "string" &&
      (queue[0] as any).url.includes(urlPart);
    const isActive = state === State.Playing || state === State.Buffering;
    if (sameTrack && isActive && pos > 1) return true;
  } catch {}
  return false;
}

// 플레이어 초기화 함수 - 단순화
const setupPlayer = async (): Promise<boolean> => {
  try {
    let isSetup = false;
    try {
      isSetup = await TrackPlayer.isServiceRunning();
    } catch (error) {
      isSetup = false;
    }

    if (!isSetup) {
      // 다시 한 번 앱 상태 확인

      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: false, // 자동 인터럽션 처리 비활성화
        waitForBuffer: true,
      });
    }

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
      progressUpdateEventInterval: 1, // 1초마다 업데이트
      android: {
        // 중요: 앱 종료 시 재생 중지 및 알림 제거
        appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        alwaysPauseOnInterruption: true,
        stoppingAppPausesPlayback: true,
      },

      repeatMode: RepeatMode.Off,
    });

    defaultStorage.set("is_illdoc_player", false);
    defaultStorage.set("auto_next_chapter_enabled", true);

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    console.log(
        "TrackPlayer initialized successfully - PlayFooterLayout (Simplified)"
    );
    return true;
  } catch (error) {
    console.error("TrackPlayer 초기화 실패:", error);

    return false;
  }
};

// 플레이어 종료 함수
const stopAndResetPlayer = async () => {
  try {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    }
    await TrackPlayer.reset();
    console.log("TrackPlayer stopped and reset successfully");
  } catch (error) {
    console.error("TrackPlayer 종료 실패:", error);
  }
};

interface PlayFooterLayoutProps {
  onTrigger: () => void;
  openSound: boolean;
}

const PlayFooterLayout = ({ onTrigger, openSound }: PlayFooterLayoutProps) => {
  const { color } = useBaseStyle();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets(); // SafeArea insets 추가

  // 상태 관리
  const [soundSpeed, setSoundSpeed] = useState<number>(1);
  const [isPlayerInitialized, setIsPlayerInitialized] =
      useState<boolean>(false);
  const [enableAutoNext, setEnableAutoNext] = useState<boolean>(true);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [autoPlayPending, setAutoPlayPending] = useState<boolean>(false);

  // 현재 책/장 상태를 실시간으로 추적
  const [currentBook, setCurrentBook] = useState(
      () =>
          defaultStorage.getNumber("bible_book") ??
          defaultStorage.getNumber("bible_book_connec") ??
          1
  );
  const [currentJang, setCurrentJang] = useState(
      () =>
          defaultStorage.getNumber("bible_jang") ??
          defaultStorage.getNumber("bible_jang_connec") ??
          1
  );

  // 네비게이션 및 화면 포커스 상태
  const { navigation } = useNativeNavigation();
  const isFocused = useIsFocused();
  const appStateRef = useRef(AppState.currentState);

  // 현재 재생 중인 트랙 정보를 추적하는 ref 추가
  const currentTrackRef = useRef<{ book: number; jang: number } | null>(null);
  const lastProcessedChapterRef = useRef<{ book: number; jang: number } | null>(
      null
  );

  // TrackPlayer 훅
  const playbackState = usePlaybackState();
  const progress = useProgress();

  // 재생 상태 계산
  const isPlaying = playbackState.state === State.Playing;

  // 상태 동기화 함수 - 중복 방지 강화
  const syncBibleState = useCallback(
      (book: number, jang: number) => {
        // 현재 상태와 동일하면 동기화하지 않음
        const currentStoredBook = defaultStorage.getNumber("bible_book");
        const currentStoredJang = defaultStorage.getNumber("bible_jang");

        if (currentStoredBook === book && currentStoredJang === jang) {
          console.log(
              `[SYNC] ⚠️ 이미 동일한 상태입니다. 동기화 건너뜀: ${book}권 ${jang}장`
          );
          return;
        }

        console.log(
            `[SYNC] 상태 동기화: ${currentStoredBook}:${currentStoredJang} → ${book}권 ${jang}장`
        );

        // MMKV 저장소 업데이트
        defaultStorage.set("bible_book", book);
        defaultStorage.set("bible_jang", jang);
        defaultStorage.set("bible_book_connec", book);
        defaultStorage.set("bible_jang_connec", jang);
        defaultStorage.set("last_audio_book", book);
        defaultStorage.set("last_audio_jang", jang);
        defaultStorage.set("is_illdoc_player", false);
        defaultStorage.set("auto_next_chapter_enabled", enableAutoNext);

        // 로컬 상태 업데이트
        setCurrentBook(book);
        setCurrentJang(jang);

        // Redux 상태 업데이트
        try {
          dispatch(bibleSelectSlice.actions.changePage({ book, jang }));
          dispatch(illdocSelectSlice.actions.changePage({ book, jang }));
          console.log(`[SYNC] ✅ 상태 동기화 완료: ${book}권 ${jang}장`);
        } catch (error) {
          console.error("Redux 상태 업데이트 실패:", error);
        }
      },
      [dispatch, enableAutoNext]
  );

  // 음원 URL 생성 함수
  const soundUrl = useCallback((book: number, jang: number): string => {
    const baseUrl = process.env.AUDIO_BASE_URL || "https://your-audio-url.com/";
    return `${baseUrl}${bibleAudioList[book - 1]}${String(jang).padStart(
        3,
        "0"
    )}.mp3`;
  }, []);

  // 오디오 URL 검증 함수
  const validateAudioUrl = useCallback(
      async (book: number, jang: number): Promise<boolean> => {
        const url = soundUrl(book, jang);
        console.log(`[VALIDATION] 오디오 URL 확인: ${url}`);

        try {
          const response = await fetch(url, { method: "HEAD" });
          console.log(`[VALIDATION] URL 상태: ${response.status}`);
          return response.ok;
        } catch (error) {
          console.error(`[VALIDATION] URL 검증 실패:`, error);
          return false;
        }
      },
      [soundUrl]
  );

  // 트랙 로딩 함수 - 중복 방지 강화
  const loadTrack = useCallback(
      async (book: number, jang: number): Promise<boolean> => {
        try {
          console.log(`[LOAD] 트랙 로딩 시작: ${book}권 ${jang}장`);

          // 현재 재생 중인 트랙과 동일한지 확인
          if (
              currentTrackRef.current &&
              currentTrackRef.current.book === book &&
              currentTrackRef.current.jang === jang
          ) {
            console.log(
                `[LOAD] ❌ 이미 동일한 트랙이 로드됨. 건너뜀: ${book}권 ${jang}장`
            );
            return true;
          }

          if (!isPlayerInitialized) {
            const initialized = await setupPlayer();
            if (initialized) {
              setIsPlayerInitialized(true);
            } else {
              console.error("[LOAD] 플레이어 초기화 실패");
              return false;
            }
          }

          // URL 유효성 검사
          const isValidUrl = await validateAudioUrl(book, jang);
          if (!isValidUrl) {
            console.error(`[LOAD] 유효하지 않은 URL: ${book}권 ${jang}장`);
            return false;
          }

          // 현재 큐 완전 초기화
          try {
            await TrackPlayer.pause();
            await TrackPlayer.stop();
            await TrackPlayer.reset();
            console.log(`[LOAD] 기존 큐 완전 초기화 완료`);
          } catch (error) {
            console.warn(`[LOAD] 큐 초기화 중 경고:`, error);
          }

          // 새 트랙 추가
          const trackId = `bible-${book}-${jang}-${Date.now()}`; // 타임스탬프로 고유성 보장
          await TrackPlayer.add({
            id: trackId,
            url: soundUrl(book, jang),
            title: `${bibleAudioList[book - 1]} ${jang}장`,
            artist: "Bible Audio",
            artwork: require("../../../assets/img/bibile25.png"),
          });

          // 현재 트랙 정보 업데이트
          currentTrackRef.current = { book, jang };

          // 재생 속도 및 설정 적용
          if (soundSpeed !== 1) {
            await TrackPlayer.setRate(soundSpeed);
          }

          await TrackPlayer.setRepeatMode(RepeatMode.Off);

          console.log(
              `[LOAD] ✅ 트랙 로딩 완료: ${book}권 ${jang}장 (ID: ${trackId})`
          );
          return true;
        } catch (error) {
          console.error("[LOAD] 트랙 로딩 실패:", error);
          // 실패 시 현재 트랙 정보 초기화
          currentTrackRef.current = null;
          return false;
        }
      },
      [isPlayerInitialized, soundSpeed, soundUrl, validateAudioUrl]
  );

  // 자동 다음 장 처리 함수 - 완전히 재작성
  const handleAutoNextChapter = useCallback(async () => {
    console.log(`[AUTO_NEXT] === 자동 다음 장 처리 시작 ===`);

    // 현재 상태 로깅
    const currentState = {
      currentBook,
      currentJang,
      enableAutoNext,
      isProcessingAction,
      openSound,
      currentTrack: currentTrackRef.current,
      lastProcessed: lastProcessedChapterRef.current,
    };
    console.log(`[AUTO_NEXT] 현재 상태:`, currentState);

    // 기본 조건 체크
    if (isProcessingAction) {
      console.log(`[AUTO_NEXT] ❌ 이미 처리 중이므로 종료`);
      return;
    }

    if (!enableAutoNext) {
      console.log(`[AUTO_NEXT] ❌ 자동 다음 장이 비활성화되어 종료`);
      return;
    }

    // 현재 재생 중인 트랙 정보로 다음 장 계산
    const sourceBook = currentTrackRef.current?.book ?? currentBook;
    const sourceJang = currentTrackRef.current?.jang ?? currentJang;

    console.log(`[AUTO_NEXT] 소스 장: ${sourceBook}권 ${sourceJang}장`);

    // 이미 처리한 장인지 확인
    if (
        lastProcessedChapterRef.current &&
        lastProcessedChapterRef.current.book === sourceBook &&
        lastProcessedChapterRef.current.jang === sourceJang
    ) {
      console.log(
          `[AUTO_NEXT] ❌ 이미 처리한 장입니다: ${sourceBook}권 ${sourceJang}장`
      );
      return;
    }

    try {
      setIsProcessingAction(true);
      console.log(`[AUTO_NEXT] ✅ 처리 상태 활성화`);

      // 다음 장 계산
      const totalJang = BibleStep[sourceBook - 1]?.count ?? 1;
      let nextBook = sourceBook;
      let nextJang = sourceJang + 1;

      console.log(`[AUTO_NEXT] 현재 책의 총 장수: ${totalJang}`);
      console.log(`[AUTO_NEXT] 계산된 다음 장: ${nextJang}`);

      if (nextJang > totalJang) {
        if (sourceBook === 66) {
          console.log(`[AUTO_NEXT] ❌ 성경의 마지막 장에 도달, 종료`);
          return;
        } else {
          nextBook = sourceBook + 1;
          nextJang = 1;
          console.log(`[AUTO_NEXT] 📖 다음 책으로 이동: ${nextBook}권 1장`);
        }
      }

      console.log(`[AUTO_NEXT] 🎯 목표: ${nextBook}권 ${nextJang}장`);

      // 현재 처리한 장 기록
      lastProcessedChapterRef.current = { book: sourceBook, jang: sourceJang };

      // 플레이어 완전 정지 및 초기화
      console.log(`[AUTO_NEXT] 🔄 플레이어 완전 정지 시작`);
      try {
        await TrackPlayer.pause();
        await TrackPlayer.stop();
        await TrackPlayer.reset();

        // 현재 트랙 정보 초기화
        currentTrackRef.current = null;

        console.log(`[AUTO_NEXT] ✅ 플레이어 완전 정지 완료`);
      } catch (error) {
        console.warn(`[AUTO_NEXT] 플레이어 정지 중 경고:`, error);
      }

      // 상태 동기화
      console.log(`[AUTO_NEXT] 🔄 상태 동기화 시작`);
      syncBibleState(nextBook, nextJang);
      onTrigger();
      console.log(`[AUTO_NEXT] ✅ 상태 동기화 완료`);

      // 충분한 대기 시간
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 새 트랙 로드 및 재생
      console.log(`[AUTO_NEXT] 🔄 새 트랙 로드 시작`);
      const loadSuccess = await loadTrack(nextBook, nextJang);

      if (loadSuccess) {
        console.log(`[AUTO_NEXT] ✅ 트랙 로드 성공`);

        // 추가 대기 후 재생
        setTimeout(async () => {
          try {
            await TrackPlayer.play();
            console.log(
                `[AUTO_NEXT] ✅ 자동 재생 시작: ${nextBook}권 ${nextJang}장`
            );

            // 재생 성공 후 최종 상태 확인
            const finalState = {
              storageBook: defaultStorage.getNumber("bible_book"),
              storageJang: defaultStorage.getNumber("bible_jang"),
              currentTrack: currentTrackRef.current,
              localBook: currentBook,
              localJang: currentJang,
            };
            console.log(`[AUTO_NEXT] 🔍 최종 상태:`, finalState);
          } catch (error) {
            console.error(`[AUTO_NEXT] ❌ 자동 재생 실패:`, error);
          }
        }, 800);
      } else {
        console.error(`[AUTO_NEXT] ❌ 트랙 로드 실패`);
        // 로드 실패 시 현재 트랙 정보 초기화
        currentTrackRef.current = null;
      }
    } catch (error) {
      console.error(`[AUTO_NEXT] ❌ 전체 처리 실패:`, error);
      // 오류 시 상태 초기화
      currentTrackRef.current = null;
      lastProcessedChapterRef.current = null;
    } finally {
      // 처리 완료 후 충분한 시간 후 플래그 해제
      setTimeout(() => {
        setIsProcessingAction(false);
        console.log(`[AUTO_NEXT] ✅ 처리 상태 해제`);
        console.log(`[AUTO_NEXT] === 자동 다음 장 처리 완료 ===`);
      }, 2000); // 2초로 증가
    }
  }, [
    currentBook,
    currentJang,
    enableAutoNext,
    isProcessingAction,
    syncBibleState,
    onTrigger,
    loadTrack,
    openSound,
  ]);

  // 재생/일시정지 토글 함수 - 트랙 정보 관리 강화
  const onPlaySwitch = useCallback(async () => {
    if (isProcessingAction) {
      console.log("[PLAY] 이미 처리 중");
      return;
    }

    try {
      setIsProcessingAction(true);

      if (!isPlayerInitialized) {
        const initialized = await setupPlayer();
        if (!initialized) {
          Alert.alert("초기화 오류", "오디오 플레이어를 초기화할 수 없습니다.");
          return;
        }
        setIsPlayerInitialized(true);
      }

      if (isPlaying) {
        await TrackPlayer.pause();
        console.log("[PLAY] 일시정지");
      } else {
        // 재생 전 큐 확인
        const queue = await TrackPlayer.getQueue();
        if (queue.length === 0) {
          const success = await loadTrack(currentBook, currentJang);
          if (!success) {
            Alert.alert("로딩 오류", "오디오 트랙을 로드할 수 없습니다.");
            return;
          }
        }

        // 현재 트랙 정보 업데이트 (재생 시작 시)
        currentTrackRef.current = { book: currentBook, jang: currentJang };

        // 이전 처리 기록 초기화 (새로운 재생 시작)
        lastProcessedChapterRef.current = null;

        await TrackPlayer.play();
        console.log(`[PLAY] 재생 시작: ${currentBook}권 ${currentJang}장`);
        console.log(`[PLAY] 트랙 정보 업데이트:`, currentTrackRef.current);
      }
    } catch (error) {
      console.error("[PLAY] 재생/정지 오류:", error);
    } finally {
      setTimeout(() => {
        setIsProcessingAction(false);
      }, 300);
    }
  }, [
    isPlaying,
    isPlayerInitialized,
    currentBook,
    currentJang,
    loadTrack,
    isProcessingAction,
  ]);

  // 다음 장 버튼 핸들러 - 트랙 정보 관리 강화
  const onPressNext = useCallback(async () => {
    if (isProcessingAction) return;

    try {
      setIsProcessingAction(true);

      const totalJang = BibleStep[currentBook - 1]?.count ?? 1;
      let nextBook = currentBook;
      let nextJang = currentJang + 1;

      if (nextJang > totalJang) {
        if (currentBook === 66) return;
        nextBook = currentBook + 1;
        nextJang = 1;
      }

      console.log(
          `[NEXT_BTN] 수동 다음 장: ${currentBook}:${currentJang} → ${nextBook}:${nextJang}`
      );

      await TrackPlayer.pause();
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // 트랙 정보 초기화
      currentTrackRef.current = null;
      lastProcessedChapterRef.current = null;

      syncBibleState(nextBook, nextJang);
      onTrigger();
      setAutoPlayPending(true);
  
      // 추가: 수동 이동 플래그 + 내부 기록 재초기화 (백그라운드 자동진행 재개 유도)
      defaultStorage.set("manual_navigation_at", Date.now());
    } catch (error) {
      console.error("다음 장 이동 오류:", error);
    } finally {
      setTimeout(() => {
        setIsProcessingAction(false);
      }, 500);
    }
  }, [currentBook, currentJang, isProcessingAction, syncBibleState, onTrigger]);

  // 이전 장 버튼 핸들러 - 트랙 정보 관리 강화
  const onPressforward = useCallback(async () => {
    if (isProcessingAction) return;

    try {
      setIsProcessingAction(true);

      let nextBook = currentBook;
      let nextJang = currentJang - 1;

      if (nextJang === 0) {
        if (currentBook === 1) return;
        nextBook = currentBook - 1;
        nextJang = BibleStep[nextBook - 1]?.count ?? 1;
      }

      console.log(
          `[PREV_BTN] 수동 이전 장: ${currentBook}:${currentJang} → ${nextBook}:${nextJang}`
      );

      await TrackPlayer.pause();
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // 트랙 정보 초기화
      currentTrackRef.current = null;
      lastProcessedChapterRef.current = null;

      syncBibleState(nextBook, nextJang);
      onTrigger();
      setAutoPlayPending(true);
  
      // 추가: 수동 이동 플래그 + 내부 기록 재초기화 (백그라운드 자동진행 재개 유도)
      defaultStorage.set("manual_navigation_at", Date.now());
    } catch (error) {
      console.error("이전 장 이동 오류:", error);
    } finally {
      setTimeout(() => {
        setIsProcessingAction(false);
      }, 500);
    }
  }, [currentBook, currentJang, isProcessingAction, syncBibleState, onTrigger]);

  // 슬라이더 값 변경 핸들러
  const onSliderValueChanged = useCallback(
      async (value: number) => {
        try {
          if (!isPlayerInitialized) {
            await setupPlayer();
            setIsPlayerInitialized(true);
          }
          await TrackPlayer.seekTo(value);
        } catch (error) {
          console.error("슬라이더 값 변경 오류:", error);
        }
      },
      [isPlayerInitialized]
  );

  // 재생 속도 변경 함수
  const changeBasuk = useCallback(async (baesok: number) => {
    let newSpeed = 1;
    if (baesok === 1) {
      newSpeed = 1.2;
    } else if (baesok === 1.2) {
      newSpeed = 1.5;
    } else if (baesok === 1.5) {
      newSpeed = 1;
    }

    try {
      await TrackPlayer.setRate(newSpeed);
      setSoundSpeed(newSpeed);
      defaultStorage.set("last_audio_speed", newSpeed);
    } catch (error) {
      console.error("속도 변경 오류:", error);
    }
  }, []);

  // 재생 속도 표시 이름 가져오기
  const getBaeSokName = useCallback((): string => {
    switch (soundSpeed) {
      case 1:
        return "1";
      case 1.2:
        return "2";
      case 1.5:
        return "4";
      default:
        return "1";
    }
  }, [soundSpeed]);

  // 자동 다음 장 토글 함수
  const toggleAutoNext = useCallback(() => {
    const newValue = !enableAutoNext;
    setEnableAutoNext(newValue);
    defaultStorage.set("auto_next_chapter_enabled", newValue);
    console.log(`Auto next chapter ${newValue ? "enabled" : "disabled"}`);
  }, [enableAutoNext]);

  // ========== 이벤트 리스너 설정 ==========

  // 1. 모든 TrackPlayer 이벤트 로깅
  useEffect(() => {
    if (!isPlayerInitialized) return;

    const listeners = [
      TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
        console.log(`[EVENT] PlaybackState: ${data.state}`);
      }),

      TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (data) => {
        console.log(`[EVENT] PlaybackTrackChanged:`, data);
      }),

      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (data) => {
        console.log(`[EVENT] PlaybackQueueEnded:`, data);
        console.log(`[EVENT] 자동 다음 장 조건 확인:`);
        console.log(`  - enableAutoNext: ${enableAutoNext}`);
        console.log(`  - isProcessingAction: ${isProcessingAction}`);
        console.log(
            `  - currentBook: ${currentBook}, currentJang: ${currentJang}`
        );
      }),

      TrackPlayer.addEventListener(Event.PlaybackError, (data) => {
        console.error(`[EVENT] PlaybackError:`, data);
      }),

      TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log(`[EVENT] RemotePlay`);
      }),

      TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log(`[EVENT] RemotePause`);
      }),
    ];

    return () => {
      listeners.forEach((listener) => listener.remove());
    };
  }, [
    isPlayerInitialized,
    enableAutoNext,
    isProcessingAction,
    currentBook,
    currentJang,
  ]);

  // 2. 트랙 종료 이벤트 처리 - 더 엄격한 중복 방지
  useEffect(() => {
    if (!isPlayerInitialized || !enableAutoNext) return;

    let lastEventTime = 0;
    let isEventProcessing = false;
    let eventCounter = 0;

    const playbackQueueEndedListener = TrackPlayer.addEventListener(
        Event.PlaybackQueueEnded,
        async () => {
          const currentTime = Date.now();
          eventCounter++;

          console.log(
              `[FOREGROUND_PLAYER] 🎵 PlaybackQueueEnded 이벤트 #${eventCounter} 발생!`
          );

          // ⭐ 백그라운드에서는 PlaybackService가 처리하므로 여기서는 무시
          if (AppState.currentState !== "active") {
            console.log(`[FOREGROUND_PLAYER] ℹ️ 백그라운드 상태 - PlaybackService에서 처리`);
            return;
          }

          // 현재 재생 중인 트랙 정보 확인
          const currentTrackInfo = currentTrackRef.current;
          console.log(`[FOREGROUND_PLAYER] 현재 트랙 정보:`, currentTrackInfo);
          console.log(`[FOREGROUND_PLAYER] 이벤트 처리 상태:`);
          console.log(`  - enableAutoNext: ${enableAutoNext}`);
          console.log(`  - isProcessingAction: ${isProcessingAction}`);
          console.log(`  - isEventProcessing: ${isEventProcessing}`);
          console.log(
              `  - 마지막 이벤트로부터: ${currentTime - lastEventTime}ms`
          );

          // 엄격한 중복 이벤트 방지 (3초 이내의 중복 이벤트 무시)
          if (currentTime - lastEventTime < 3000) {
            console.log(
                `[FOREGROUND_PLAYER] ❌ 중복 이벤트 무시 (${
                    currentTime - lastEventTime
                }ms 간격)`
            );
            return;
          }

          // 이미 처리 중이면 무시
          if (isProcessingAction || isEventProcessing) {
            console.log(`[FOREGROUND_PLAYER] ❌ 이미 처리 중이므로 자동 다음 장 건너뜀`);
            return;
          }

          // 현재 트랙이 없으면 무시
          if (!currentTrackInfo) {
            console.log(`[FOREGROUND_PLAYER] ❌ 현재 트랙 정보가 없음. 이벤트 무시`);
            return;
          }

          lastEventTime = currentTime;
          isEventProcessing = true;

          console.log(`[FOREGROUND_PLAYER] ✅ 자동 다음 장 처리 시작 (포어그라운드)`);

          try {
            await handleAutoNextChapter();
          } catch (error) {
            console.error(`[FOREGROUND_PLAYER] ❌ 자동 다음 장 처리 중 오류:`, error);
          } finally {
            setTimeout(() => {
              isEventProcessing = false;
              console.log(`[FOREGROUND_PLAYER] ✅ 이벤트 처리 플래그 해제`);
            }, 3000);
          }
        }
    );

    return () => {
      playbackQueueEndedListener.remove();
    };
  }, [
    isPlayerInitialized,
    enableAutoNext,
    handleAutoNextChapter,
    isProcessingAction,
  ]);

  // 3. 진행률 기반 처리 완전 비활성화 (PlaybackQueueEnded만 사용)
  // 진행률 기반 체크는 디버깅용으로만 사용
  useEffect(() => {
    if (!isPlayerInitialized || !isPlaying) return;

    const logProgress = () => {
      if (progress.position > 0 && progress.duration > 0) {
        const percentage = (progress.position / progress.duration) * 100;
        const remainingTime = progress.duration - progress.position;

        // 95% 이상일 때만 로그 출력 (자동 넘김은 하지 않음)
        if (percentage >= 95) {
          console.log(
              `[PROGRESS_LOG] 진행률: ${percentage.toFixed(
                  1
              )}%, 남은시간: ${remainingTime.toFixed(1)}s`
          );

          // 99.8% 이상이면 곧 끝날 것이라는 알림만
          if (percentage >= 99.8) {
            console.log(
                `[PROGRESS_LOG] ⚠️ 트랙이 곧 종료됩니다. PlaybackQueueEnded 이벤트 대기 중...`
            );
          }
        }
      }
    };

    const interval = setInterval(logProgress, 1000); // 1초마다 로그만 출력
    return () => clearInterval(interval);
  }, [progress.position, progress.duration, isPlaying, isPlayerInitialized]);

  // 4. 자동 재생 처리 - 트랙 정보 관리 강화
  useEffect(() => {
    if (!autoPlayPending || !isPlayerInitialized || !openSound) return;

    const autoPlay = async () => {
      try {
        const noRestart = await ensureNotRestarting(currentBook, currentJang);
        if (noRestart) {
          currentTrackRef.current = { book: currentBook, jang: currentJang };
          lastProcessedChapterRef.current = null;
          await TrackPlayer.play().catch(() => {});
          setAutoPlayPending(false);
          return;
        }
        
        console.log(
            `[AUTO_PLAY] 자동 재생 시작: ${currentBook}권 ${currentJang}장`
        );

        // 기존 트랙 정보 초기화
        currentTrackRef.current = null;
        lastProcessedChapterRef.current = null;

        const success = await loadTrack(currentBook, currentJang);
        if (success) {
          // 트랙 로드 성공 시 트랙 정보 업데이트
          currentTrackRef.current = { book: currentBook, jang: currentJang };

          await TrackPlayer.play();
          console.log("[AUTO_PLAY] 자동 재생 성공");
          console.log(`[AUTO_PLAY] 트랙 정보 설정:`, currentTrackRef.current);
        }

        setAutoPlayPending(false);
      } catch (error) {
        console.error("[AUTO_PLAY] 자동 재생 실패:", error);
        setAutoPlayPending(false);
        // 실패 시 트랙 정보 초기화
        currentTrackRef.current = null;
      }
    };

    // 약간의 지연 후 실행
    const timer = setTimeout(autoPlay, 200);

    return () => clearTimeout(timer);
  }, [
    autoPlayPending,
    isPlayerInitialized,
    openSound,
    currentBook,
    currentJang,
    loadTrack,
  ]);

  // 5. 저장소 값 변경 감지 및 동기화
  useEffect(() => {
    const checkStorageChanges = () => {
      const storedBook =
          defaultStorage.getNumber("bible_book") ??
          defaultStorage.getNumber("bible_book_connec") ??
          1;
      const storedJang =
          defaultStorage.getNumber("bible_jang") ??
          defaultStorage.getNumber("bible_jang_connec") ??
          1;

      if (storedBook !== currentBook || storedJang !== currentJang) {
        console.log(
            `[STORAGE] 저장소 변경 감지: ${currentBook}:${currentJang} → ${storedBook}:${storedJang}`
        );
        setCurrentBook(storedBook);
        setCurrentJang(storedJang);

        if (openSound) {
          setAutoPlayPending(true);
        }
      }
    };

    const interval = setInterval(checkStorageChanges, 500);
    return () => clearInterval(interval);
  }, [currentBook, currentJang, openSound]);

  // 6. 저장소 상태 모니터링 (디버깅용)
  useEffect(() => {
    const monitorStorage = () => {
      const storageState = {
        bible_book: defaultStorage.getNumber("bible_book"),
        bible_jang: defaultStorage.getNumber("bible_jang"),
        bible_book_connec: defaultStorage.getNumber("bible_book_connec"),
        bible_jang_connec: defaultStorage.getNumber("bible_jang_connec"),
        is_illdoc_player: defaultStorage.getBoolean("is_illdoc_player"),
        auto_next_chapter_enabled: defaultStorage.getBoolean(
            "auto_next_chapter_enabled"
        ),
        last_audio_book: defaultStorage.getNumber("last_audio_book"),
        last_audio_jang: defaultStorage.getNumber("last_audio_jang"),
      };

      console.log(`[STORAGE] 현재 저장소 상태:`, storageState);
      console.log(`[LOCAL] 로컬 상태: ${currentBook}권 ${currentJang}장`);
    };

    const interval = setInterval(monitorStorage, 3000); // 3초마다 체크
    return () => clearInterval(interval);
  }, [currentBook, currentJang]);

  // 화면 포커스 변경 감지 및 상태 동기화
  useFocusEffect(
      useCallback(() => {
        console.log("Screen focused:", isFocused);

        // 화면에 포커스가 있을 때 성경 플레이어임을 표시
        defaultStorage.set("is_illdoc_player", false);
        defaultStorage.set("auto_next_chapter_enabled", enableAutoNext);

        // 화면에 포커스가 있을 때 상태 동기화 확인
        if (isPlayerInitialized) {
          // 최신 저장된 값 확인
          const storedBook =
              defaultStorage.getNumber("bible_book") ??
              defaultStorage.getNumber("bible_book_connec") ??
              currentBook;
          const storedJang =
              defaultStorage.getNumber("bible_jang") ??
              defaultStorage.getNumber("bible_jang_connec") ??
              currentJang;

          // 현재 상태와 저장된 값이 다른지 확인
          if (storedBook !== currentBook || storedJang !== currentJang) {
            console.log(
                `화면 포커스 시 상태 불일치 감지: ${currentBook}:${currentJang} → ${storedBook}:${storedJang}`
            );
            syncBibleState(storedBook, storedJang);
          }
        }

        // 화면에서 나갈 때 실행될 clean-up 함수
        return () => {
          console.log("Screen unfocused, stopping player");
        };
      }, [
        currentBook,
        currentJang,
        isPlayerInitialized,
        syncBibleState,
        enableAutoNext,
      ])
  );

  // 뒤로가기 버튼 처리 - 안드로이드 전용
  useEffect(() => {
    let backHandler: { remove: () => void } | null = null;

    if (Platform.OS === "android") {
      backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        console.log("Hardware back button pressed");

        // 상태와 관계없이 항상 오디오 종료 및 리셋
        stopAndResetPlayer()
            .then(() => {
              console.log("Audio stopped and reset by back button");
            })
            .catch((error) => {
              console.error("Error stopping audio on back button:", error);
            });

        // 기본 뒤로가기 동작 허용 (false 반환)
        return false;
      });
    }

    return () => {
      if (Platform.OS === "android" && backHandler) {
        backHandler.remove();
      }
    };
  }, []);

  // 컴포넌트 초기화
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // 플레이어 초기 설정
        const isSetup = await setupPlayer();
        if (isMounted && isSetup) {
          setIsPlayerInitialized(true);

          // 명시적 반복 모드 비활성화
          await TrackPlayer.setRepeatMode(RepeatMode.Off);

          // 저장된 재생 속도 불러오기
          const savedSpeed = defaultStorage.getNumber("last_audio_speed") ?? 1;
          if (savedSpeed !== 1) {
            setSoundSpeed(savedSpeed);
            await TrackPlayer.setRate(savedSpeed);
          }

          // 자동 다음 장 설정 불러오기 - 기본값 true로 설정
          const savedAutoNext = defaultStorage.getBoolean(
              "auto_next_chapter_enabled"
          );
          if (savedAutoNext !== undefined) {
            setEnableAutoNext(savedAutoNext);
          } else {
            // 기본값을 true로 설정
            setEnableAutoNext(true);
            defaultStorage.set("auto_next_chapter_enabled", true);
          }

          // 성경 플레이어임을 표시 (성경일독과 구분)
          defaultStorage.set("is_illdoc_player", false);
        }
      } catch (error) {
        console.error("Error initializing player:", error);
      }
    };

    initialize();

    // ⭐⭐⭐ 앱 상태 변경 감지 - 백그라운드/포그라운드 재생 시간 동기화 추가 ⭐⭐⭐
    const subscription = AppState.addEventListener(
        "change",
        async (nextAppState) => {
          console.log(
              "App state changed from",
              appStateRef.current,
              "to",
              nextAppState
          );

          // 앱이 백그라운드로 이동할 때
          if (
              appStateRef.current === "active" &&
              (nextAppState === "background" || nextAppState === "inactive")
          ) {
            console.log("App moved to background");

            try {
              // ⭐ 백그라운드 진입 시 현재 재생 위치 저장
              const currentPosition = await TrackPlayer.getPosition();
              const playerState = await TrackPlayer.getState();

              console.log("[BACKGROUND] 현재 재생 위치 저장:", currentPosition);
              console.log("[BACKGROUND] 현재 재생 상태:", playerState);

              defaultStorage.set("last_audio_position", currentPosition);
              defaultStorage.set("was_playing_before_background", playerState === State.Playing);

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
            } catch (error) {
              console.error("Error setting options on background:", error);
            }
          }

          // ⭐ 앱이 다시 활성화될 때 - 재생 시간 동기화 추가
          if (
              appStateRef.current.match(/inactive|background/) &&
              nextAppState === "active"
          ) {
            console.log("App returned to foreground");

            try {
              // 백그라운드에서 재생 중이었는지 확인
              const wasPlaying = defaultStorage.getBoolean("was_playing_before_background") ?? false;
              const lastPosition = defaultStorage.getNumber("last_audio_position") ?? 0;

              console.log("[FOREGROUND] 복귀 - 이전 재생 상태:", wasPlaying);
              console.log("[FOREGROUND] 복귀 - 저장된 위치:", lastPosition);

              if (wasPlaying && isPlayerInitialized) {
                // 백그라운드에서 재생 중이었으면 현재 위치 가져오기
                const currentPosition = await TrackPlayer.getPosition();
                const currentState = await TrackPlayer.getState();

                console.log("[FOREGROUND] 현재 TrackPlayer 위치:", currentPosition);
                console.log("[FOREGROUND] 현재 TrackPlayer 상태:", currentState);

                // 재생 중이면 UI만 업데이트, 아니면 위치 복원
                if (currentState === State.Playing) {
                  console.log("[FOREGROUND] 백그라운드에서 계속 재생 중 - UI 상태만 동기화");
                  // progress는 useProgress() 훅이 자동으로 업데이트하므로 별도 처리 불필요
                } else if (currentState === State.Paused) {
                  // 일시정지 상태면 마지막 위치로 seek
                  if (lastPosition > 0) {
                    console.log("[FOREGROUND] 마지막 재생 위치로 복원:", lastPosition);
                    await TrackPlayer.seekTo(lastPosition);
                  }
                }
              }

              defaultStorage.set("is_illdoc_player", false);
              defaultStorage.set("auto_next_chapter_enabled", enableAutoNext);

              // 저장된 임시 값 정리
              defaultStorage.delete("was_playing_before_background");
              // last_audio_position은 다음 백그라운드 진입 시 덮어쓰므로 삭제하지 않음

            } catch (error) {
              console.error("[FOREGROUND] 복귀 시 동기화 오류:", error);
            }
          }

          appStateRef.current = nextAppState;
        }
    );

    // 컴포넌트 언마운트 시 플레이어 정지 및 구독 해제
    return () => {
      isMounted = false;
      subscription.remove();
      stopAndResetPlayer();
    };
  }, [enableAutoNext, isPlayerInitialized]);

  // 수동 테스트 함수 (개발용)
  const testAutoNext = useCallback(() => {
    console.log(`[TEST] 🧪 수동 자동 다음 장 테스트 시작`);
    handleAutoNextChapter();
  }, [handleAutoNextChapter]);

  // 개발 모드 확인
  const isDevelopment = __DEV__;

  // Android targetSdk 35 대응: 하단 패딩 계산
  const containerPaddingBottom = Platform.select({
    ios: insets.bottom,
    android: insets.bottom > 0 ? insets.bottom : 0,
    default: 0,
  });

  // UI 렌더링
  return (
      <>
        <Box
            bg="white"
            width="100%"
            height={85 + containerPaddingBottom} // SafeArea bottom 추가
            paddingBottom={`${containerPaddingBottom}px`} // 하단 패딩 추가
            alignSelf="center"
            display={openSound ? "flex" : "none"}
        >
          <VStack>
            <Slider
                w="100%"
                value={progress?.position}
                minValue={0}
                maxValue={progress?.duration > 0 ? progress.duration : 100}
                accessibilityLabel="sound"
                onChange={onSliderValueChanged}
                step={1}
            >
              <Slider.Track>
                <Slider.FilledTrack bg={color.bible} />
              </Slider.Track>
            </Slider>

            <Box flexDirection={"row"} justifyContent={"space-around"} w={"100%"}>
              <Button
                  variant={"bibleoutlined"}
                  padding={1.4}
                  marginTop={2}
                  width={"50"}
                  textAlign={"center"}
                  height={7}
                  onPress={() => changeBasuk(soundSpeed)}
              >
                <Text color={color.bible} fontSize={12} fontWeight={700}>
                  {getBaeSokName()} 배속
                </Text>
              </Button>

              <TouchableOpacity
                  style={{ marginTop: 10 }}
                  onPress={onPressforward}
                  disabled={isProcessingAction}
              >
                <FontAwesomeIcons
                    name="step-backward"
                    size={30}
                    color={isProcessingAction ? "#ccc" : color.bible}
                />
              </TouchableOpacity>

              <TouchableOpacity
                  onPress={onPlaySwitch}
                  disabled={isProcessingAction}
              >
                <FontAwesomeIcons
                    name={isPlaying ? "pause-circle" : "play-circle"}
                    style={{ marginTop: 5 }}
                    size={40}
                    color={isProcessingAction ? "#ccc" : color.bible}
                />
              </TouchableOpacity>

              <TouchableOpacity
                  style={{ marginTop: 10 }}
                  onPress={onPressNext}
                  disabled={isProcessingAction}
              >
                <FontAwesomeIcons
                    name="step-forward"
                    size={30}
                    color={isProcessingAction ? "#ccc" : color.bible}
                />
              </TouchableOpacity>

              <Button
                  variant={"bibleoutlined"}
                  marginTop={2}
                  padding={1.4}
                  width={"50"}
                  textAlign={"center"}
                  height={8}
                  onPress={() => navigation.navigate("HymnScreen", {})}
              >
                <Text color={color.bible} fontSize={13} fontWeight={700}>
                  찬송가
                </Text>
              </Button>
            </Box>
          </VStack>
        </Box>
      </>
  );
};

export default memo(PlayFooterLayout);