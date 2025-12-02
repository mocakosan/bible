import notifee, { EventType } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { NavigationContainer } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  BackHandler,
  DeviceEventEmitter,
  InteractionManager,
  Linking,
  NativeModules,
  Platform,
  Alert,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";
import RNExitApp from "react-native-exit-app";
import * as RootNavigation from "./RootNavigation";
import { AppCodePushUpdateScreen } from "./src/[CODEPUSH]/AppCodePushUpdateScreen";
import CustomStatusBar from "./src/[CODEPUSH]/CustomStatusBar";
import useCodePush from "./src/[CODEPUSH]/useCodePush";
import { AppNavigator } from "./src/components/navigator";
import { FrameProvider } from "./src/provider/baseFrame/FrameProvider";
import ReduxProvider from "./src/provider/redux/ReduxProvider";
import { color } from "./src/utils";
import { requestUserPermission } from "./src/utils/firebase";
import { defaultStorage } from "./src/utils/mmkv";
import ReactNativeIdfaAaid from "@sparkfabrik/react-native-idfa-aaid";
import axios from "axios";
import {
  InterstitialAd,
  AdEventType,
  MobileAds,
} from "react-native-google-mobile-ads";

const adUnitId = "ca-app-pub-1162719494234001/2683008272";
const interstitial = InterstitialAd.createForAdRequest(adUnitId);
const RNAdPopcornRewardModule = NativeModules.RNAdPopcornRewardModule;

// 안전한 ADID 가져오기 함수
const getAdvertisingIdSafely = async () => {
  try {
    let adid = { id: "", isAdTrackingLimited: false };

    if (Platform.OS === "android") {
      try {
        adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
      } catch (error) {
        console.log("Android ADID 가져오기 실패:", error);
        // Android에서 실패 시 대안 시도
        try {
          adid =
              await ReactNativeIdfaAaid.getAdvertisingInfoAndCheckAuthorization(
                  true
              );
        } catch (fallbackError) {
          console.log("Android ADID 대안도 실패:", fallbackError);
        }
      }
    } else if (Platform.OS === "ios") {
      const { IDFAModule } = NativeModules;
      try {
        if (IDFAModule && IDFAModule.getIDFA) {
          const idfa = await IDFAModule.getIDFA();
          adid.id = idfa;
        } else {
          throw new Error("IDFAModule not available");
        }
      } catch (error) {
        console.log("iOS IDFA 가져오기 실패, 대안 시도:", error);
        try {
          adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
          if (!adid || !adid.id) {
            adid =
                await ReactNativeIdfaAaid.getAdvertisingInfoAndCheckAuthorization(
                    true
                );
          }
        } catch (fallbackError) {
          console.log("iOS ADID 대안도 실패:", fallbackError);
        }
      }
    }

    // ADID 검증
    if (
        !adid ||
        !adid.id ||
        adid.id === "" ||
        adid.id === "00000000-0000-0000-0000-000000000000"
    ) {
      console.log("유효하지 않은 ADID:", adid);
      return null;
    }

    return adid;
  } catch (error) {
    console.error("ADID 가져오기 전체 실패:", error);
    return null;
  }
};

// 안드로이드 광고 ID 설정 화면으로 이동하는 함수
const openAdvertisingIdSettings = async () => {
  if (Platform.OS === "android") {
    // 1. 네이티브 모듈을 통한 안드로이드 설정의 구글 메뉴 열기 시도
    try {
      const { SettingsModule } = NativeModules;
      if (SettingsModule) {
        try {
          // 안드로이드 설정 앱의 Google 메뉴 직접 열기 시도
          await SettingsModule.openAndroidGoogleMenu();
          console.log(
              "네이티브 모듈로 안드로이드 설정의 Google 메뉴 열기 성공"
          );
          return;
        } catch (error) {
          console.log(
              "안드로이드 Google 메뉴 실패, 기본 Google 설정 시도:",
              error
          );
          try {
            await SettingsModule.openGoogleSettings();
            console.log("네이티브 모듈로 Google 설정 열기 성공");
            return;
          } catch (error2) {
            console.log("Google 설정 실패, 계정 설정 시도:", error2);
            try {
              await SettingsModule.openAccountSettings();
              console.log("네이티브 모듈로 계정 설정 열기 성공");
              return;
            } catch (error3) {
              console.log("계정 설정 실패, 개인정보 설정 시도:", error3);
              try {
                await SettingsModule.openPrivacySettings();
                console.log("네이티브 모듈로 개인정보 설정 열기 성공");
                return;
              } catch (error4) {
                console.log("개인정보 설정 실패, 일반 설정 시도:", error4);
                await SettingsModule.openSettings();
                console.log("네이티브 모듈로 일반 설정 열기 성공");
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log("네이티브 모듈 사용 불가, Linking 방식 시도:", error);
    }

    // 2. 안드로이드 설정 앱 내부의 Google 관련 메뉴들을 우선 시도
    const androidGoogleSettingsOptions = [
      "android.settings.GOOGLE_SETTINGS", // 직접적인 Google 설정
      "android.settings.SYNC_SETTINGS", // 계정 동기화 (Google 계정 포함)
      "android.settings.USER_SETTINGS", // 사용자 및 계정
      "android.settings.ACCOUNT_SYNC_SETTINGS", // 계정 및 백업
      "android.settings.PRIVACY_SETTINGS", // 개인정보보호 (Google 관련 설정 포함)
    ];

    let settingsOpened = false;

    for (const settingUrl of androidGoogleSettingsOptions) {
      if (settingsOpened) break;

      try {
        const supported = await Linking.canOpenURL(settingUrl);
        if (supported) {
          await Linking.openURL(settingUrl);
          console.log(
              `안드로이드 설정의 Google 관련 메뉴 열기 성공: ${settingUrl}`
          );
          settingsOpened = true;
        } else {
          console.log(`지원되지 않는 안드로이드 Google 설정: ${settingUrl}`);
        }
      } catch (error) {
        console.log(`안드로이드 Google 설정 열기 실패 (${settingUrl}):`, error);
      }
    }

    // 3. 구글 설정이 안되면 일반 설정들 시도
    if (!settingsOpened) {
      const generalSettingsOptions = [
        "android.settings.APPLICATION_DETAILS_SETTINGS", // 앱 세부정보
        "android.settings.SETTINGS", // 일반 설정
        "android.settings.SECURITY_SETTINGS", // 보안 설정
      ];

      for (const settingUrl of generalSettingsOptions) {
        if (settingsOpened) break;

        try {
          const supported = await Linking.canOpenURL(settingUrl);
          if (supported) {
            await Linking.openURL(settingUrl);
            console.log(`일반 설정 열기 성공: ${settingUrl}`);
            settingsOpened = true;
          } else {
            console.log(`지원되지 않는 설정: ${settingUrl}`);
          }
        } catch (error) {
          console.log(`설정 열기 실패 (${settingUrl}):`, error);
        }
      }
    }

    // 4. 모든 설정이 실패한 경우에만 웹 검색으로 안내
    if (!settingsOpened) {
      try {
        await Linking.openURL(
            "https://www.google.com/search?q=안드로이드+설정+구글+광고+ID"
        );
        console.log("웹 검색으로 이동 성공");
      } catch (finalError) {
        console.log("모든 설정 열기 방법 실패:", finalError);
      }
    }
  }
};

// 앱 종료 함수
const exitApp = () => {
  try {
    if (Platform.OS === "android") {
      // 1. TrackPlayer 정리
      TrackPlayer.pause()
          .then(() => TrackPlayer.reset())
          .catch((e) => console.log("앱 종료 시 TrackPlayer 정리 오류:", e))
          .finally(() => {
            // 2. 앱 종료
            try {
              RNExitApp.exitApp();
            } catch (exitError) {
              console.log("RNExitApp 실패, BackHandler 사용:", exitError);
              BackHandler.exitApp();
            }
          });
    }
  } catch (error) {
    console.log("앱 종료 중 오류:", error);
    // 최후 수단
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    }
  }
};

// 광고 ID 알림 창을 표시하는 함수
const showAdvertisingIdAlert = () => {
  Alert.alert(
      "광고 ID 설정 필요",
      "앱 사용을 위해 광고 ID 설정이 필요합니다.\n\n설정 방법:\n1. 휴대폰 '설정' 앱 → '구글' 메뉴\n2. '광고' 클릭\n3. '광고 ID 재설정' 클릭\n4. 앱 재시작\n\n만약 '구글' 메뉴가 없다면:\n1. 설정 → 개인정보보호 → 광고",
      [
        {
          text: "설정으로 이동",
          onPress: async () => {
            await openAdvertisingIdSettings();
          },
        },
        {
          text: "수동으로 설정",
          onPress: () => {
            Alert.alert(
                "수동 설정 안내",
                "1. 휴대폰 '설정' 앱을 열어주세요\n2. '구글' 메뉴를 찾아 들어가세요\n   (없다면 '계정' 또는 '사용자 및 계정')\n3. '광고' 메뉴를 찾아 클릭\n4. '광고 ID 재설정' 또는 '새 광고 ID 받기'\n5. 앱을 다시 시작해주세요\n\n* 구글 메뉴가 없다면:\n   설정 → 개인정보보호 → 광고를 찾아보세요",
                [
                  {
                    text: "확인",
                    onPress: () => {
                      console.log("사용자가 수동 설정 안내 확인 후 앱 종료");
                    },
                  },
                ]
            );
          },
        },
      ]
  );
};

function App(): JSX.Element {
  const { isUpdating, syncProgress, codePushAppVersion } = useCodePush();
  const [point, setPoint] = useState(null);
  const [user, setUser] = useState([]);
  const [playerInitialized, setPlayerInitialized] = useState(false);
  const [adidError, setAdidError] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            // 메인 화면에서 뒤로가기 (앱 종료) 시 오디오 정리
            if (!RootNavigation.navigationRef.current?.canGoBack()) {
              TrackPlayer.pause()
                  .then(() => TrackPlayer.reset())
                  .catch((e) =>
                      console.log("앱 종료 시 TrackPlayer 정리 오류:", e)
                  );
            }
            // 기본 뒤로가기 동작은 계속 진행
            return false;
          }
      );

      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 안전한 ADID 가져오기
        const adid = await getAdvertisingIdSafely();

        // ADID를 가져오지 못했을 때의 처리
        if (!adid) {
          console.log("ADID를 가져올 수 없습니다. 설정 안내를 표시합니다.");
          setAdidError(true);

          // 1초 후에 알림 표시 (앱 로딩 완료 후)
          setTimeout(() => {
            showAdvertisingIdAlert();
          }, 1000);

          // ADID 없이도 앱이 계속 실행될 수 있도록 기본값 설정
          setPoint({ userId: null, points: 0 });
          setUser([]);
          return;
        }

        console.log("ADID 성공적으로 가져옴:", adid.id);

        // 사용자 정보 조회
        try {
          const response = await axios.get(
              `https://bible25backend.givemeprice.co.kr/login/finduser`,
              {
                params: { adid: adid.id },
                timeout: 10000, // 10초 타임아웃
              }
          );

          console.log("사용자 조회 응답:", response.data);

          if (response.data && response.data.userId) {
            try {
              const response1 = await axios.get(
                  `https://bible25backend.givemeprice.co.kr/point`,
                  {
                    params: {
                      userId: response.data.userId,
                      type: "all",
                      period: "all",
                    },
                    timeout: 10000, // 10초 타임아웃
                  }
              );

              setPoint(response.data);
              setUser(response1.data.list || []);
            } catch (pointError) {
              console.error("포인트 정보 조회 오류:", pointError);
              // 포인트 조회 실패해도 사용자 정보는 설정
              setPoint(response.data);
              setUser([]);
            }
          } else {
            // 사용자를 찾지 못한 경우
            console.log("등록된 사용자가 아닙니다.");
            setPoint({ userId: null, points: 0 });
            setUser([]);
          }
        } catch (networkError) {
          console.error("네트워크 요청 오류:", networkError);

          if (axios.isAxiosError(networkError)) {
            console.error("Request details:", networkError.config);
            console.error("Response details:", networkError.response?.data);

            // 네트워크 오류 시에도 앱이 계속 실행되도록 기본값 설정
            if (
                networkError.code === "NETWORK_ERROR" ||
                networkError.code === "ECONNABORTED"
            ) {
              console.log("네트워크 연결 문제로 오프라인 모드로 실행");
              setPoint({ userId: null, points: 0, offline: true });
              setUser([]);
            }
          }
        }
      } catch (error) {
        console.error("전체 데이터 가져오기 오류:", error);
        setAdidError(true);

        // 모든 오류 상황에서도 앱이 크래시되지 않도록 기본값 설정
        setPoint({ userId: null, points: 0, error: true });
        setUser([]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log("Ad preloaded and ready to show");
        }
    );

    // 미리 로드 시작
    interstitial.load();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      MobileAds()
          .initialize()
          .then(() => {
            console.log("Mobile Ads initialized successfully");
          })
          .catch((error) => {
            console.error("Mobile Ads initialization failed:", error);
          });
    });

    return () => {
      task.cancel();
    };
  }, []);

  useEffect(() => {
    // SDK 초기화 - ADID 에러가 아닐 때만 실행
    if (point?.userId && !adidError) {
      if (Platform.OS === "android") {
        try {
          NativeModules.GreenpModule.initialized(
              "E2AUb4tZJ6",
              point?.userId || "",
              (result: boolean, message: string) => {
                if (result) {
                  console.log("Greenp 초기화 성공");
                } else {
                  console.log("Greenp 초기화 실패:", message);
                }
              }
          );
        } catch (error) {
          console.log("Greenp 모듈 초기화 오류:", error);
        }
      }
    }
  }, [point?.userId, adidError]);

  // TrackPlayer 초기화 - 안정적인 설정을 위한 로직 개선
  useEffect(() => {
    let isMounted = true;

    // 앱 시작 시 강제 종료 여부 확인
    const checkForcedClose = async () => {
      try {
        const wasForcedClosed = await defaultStorage.getBoolean(
            "app_was_force_closed"
        );

        if (wasForcedClosed) {
          console.log("앱이 강제 종료된 후 재시작됨, 복구 진행 중");
          try {
            await TrackPlayer.reset();
            console.log("강제 종료 후 TrackPlayer 트랙 리셋 완료");
          } catch (e) {
            console.log("TrackPlayer 트랙 리셋 실패:", e.message);
          }
        }

        // 상태 초기화
        defaultStorage.set("app_was_force_closed", false);
      } catch (error) {
        console.log("강제 종료 체크 오류:", error);
      }
    };

    checkForcedClose();

    // 네이티브 이벤트 리스너 설정
    const resetSubscription = DeviceEventEmitter.addListener(
        "TrackPlayerReset",
        async () => {
          console.log("네이티브에서 TrackPlayer 리셋 요청 받음");
          if (isMounted) {
            try {
              await TrackPlayer.reset();
              console.log("네이티브 요청으로 트랙 리셋 완료");
            } catch (error) {
              console.log("네이티브 요청으로 트랙 리셋 중 오류:", error);
            }
          }
        }
    );

    // 앱 종료 이벤트 리스너
    const destroySubscription = DeviceEventEmitter.addListener(
        "AppDestroyed",
        async () => {
          console.log("네이티브에서 앱 종료 이벤트 받음");
          if (isMounted) {
            try {
              await TrackPlayer.pause();
              await TrackPlayer.reset();
              console.log("앱 종료 전 오디오 정리 완료");
            } catch (error) {
              console.log("앱 종료 이벤트 처리 중 오류:", error);
            }
          }
        }
    );

    const setupTrackPlayer = async () => {
      try {
        // 앱이 포어그라운드에 있는지 확인
        if (AppState.currentState !== 'active') {
          console.log('앱이 활성 상태가 아니므로 TrackPlayer 설정 지연');
          return;
        }

        // 1초 지연 후 설정 시도 (안정성 향상)
        setTimeout(async () => {
          if (!isMounted) return;

          try {
            // 기존 서비스 확인 및 리셋
            let needsSetup = true;
            try {
              const state = await TrackPlayer.getPlaybackState();
              console.log("기존 TrackPlayer 상태 확인:", state);
              needsSetup = false;
            } catch (e) {
              console.log("TrackPlayer 서비스 초기화 필요:", e.message);
              needsSetup = true;
            }

            // 필요한 경우 새로 설정
            if (needsSetup) {
              try {
                await TrackPlayer.setupPlayer({
                  androidPlaybackOptions: {
                    maxCacheSize: 5 * 1024 * 1024, // 5MB 캐시
                    maxBuffer: 20000, // 20초 버퍼
                  },
                });
                console.log("새 TrackPlayer 서비스 설정 완료");
              } catch (setupError) {
                if (
                    setupError.code ===
                    "android_cannot_setup_player_in_background"
                ) {
                  console.log(
                      "백그라운드에서 설정 불가, 앱이 포그라운드로 돌아오면 재시도 예정"
                  );
                  return;
                }
                throw setupError;
              }
            }

            // 옵션 설정 - try-catch로 각각 감싸기
            try {
              await TrackPlayer.updateOptions({
                capabilities: [
                  Capability.Play,
                  Capability.Pause,
                  Capability.Stop,
                  Capability.SeekTo,
                ],
                compactCapabilities: [Capability.Play, Capability.Pause],
                notificationCapabilities: [
                  Capability.Play,
                  Capability.Pause,
                  Capability.Stop,
                ],
                android: {
                  appKilledPlaybackBehavior:
                  AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                  alwaysPauseOnInterruption: true,
                  stoppingAppPausesPlayback: true,
                },
                notification: {
                  channel: {
                    id: "bible-audio",
                    name: "성경 오디오",
                  },
                  color: color.bible,
                },
              });
            } catch (optionError) {
              console.error("TrackPlayer 옵션 설정 실패:", optionError);
            }

            if (isMounted) {
              setPlayerInitialized(true);
            }

            console.log("TrackPlayer 초기화 완료");
          } catch (error) {
            console.error("TrackPlayer 설정 오류:", error);
          }
        }, 1000);
      } catch (error) {
        console.error("TrackPlayer 초기화 과정 오류:", error);
      }
    };

    // 초기화 시작
    setupTrackPlayer();

    // 앱 상태 변화 감지 - 백그라운드에서 돌아왔을 때 재확인
    const appStateSubscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (nextAppState === "active" && !playerInitialized) {
            console.log("앱이 활성화되었고 플레이어가 초기화되지 않음, 재시도");
            setupTrackPlayer();
          } else if (nextAppState === "background") {
            // 앱이 백그라운드로 갈 때 플래그 설정
            defaultStorage.set("app_was_force_closed", true);
          } else if (nextAppState === "active") {
            // 정상적으로 포그라운드로 돌아왔을 때 플래그 해제
            defaultStorage.set("app_was_force_closed", false);
          }
        }
    );

    // 클린업
    return () => {
      isMounted = false;
      resetSubscription.remove();
      destroySubscription.remove();
      appStateSubscription.remove();

      // 앱 종료 시 TrackPlayer 리소스 정리
      if (playerInitialized) {
        TrackPlayer.pause()
            .then(() => TrackPlayer.reset())
            .catch((e) => console.log("TrackPlayer 정리 중 오류:", e));
      }
    };
  }, [playerInitialized]);

  const moveUrl = useCallback((url: string) => {
    setTimeout(() => {
      Linking.openURL(`${url}`);
    }, 1000);
  }, []);

  const localMoveUrl = useCallback((localUrl: any) => {
    try {
      const parseLocalUrl = JSON.parse(localUrl);
      const screen = parseLocalUrl.screen;
      setTimeout(() => {
        RootNavigation.navigate(`${screen}`);
      }, 2500);
    } catch (error) {
      console.error("Local URL 파싱 오류:", error);
    }
  }, []);

  const iosRemoteMessage = useCallback(async () => {
    try {
      const message = (await notifee.getInitialNotification()) as any;

      if (
          message?.notification?.data?.url &&
          !message?.notification?.data?.localUrl
      ) {
        moveUrl(message?.notification?.data?.url);
      }

      if (
          !message?.notification?.data?.url &&
          message?.notification?.data?.localUrl
      ) {
        localMoveUrl(message?.notification?.data?.localUrl);
      }
    } catch (error) {
      console.error("iOS 리모트 메시지 처리 오류:", error);
    }
  }, [moveUrl, localMoveUrl]);

  const androidRemoteMessage = useCallback(async () => {
    try {
      const message = await messaging().getInitialNotification();

      if (message?.data?.url && !message?.data?.localUrl) {
        moveUrl(message?.data?.url);
      }

      if (!message?.data?.url && message?.data?.localUrl) {
        localMoveUrl(message?.data?.localUrl);
      }
    } catch (error) {
      console.error("Android 리모트 메시지 처리 오류:", error);
    }
  }, [moveUrl, localMoveUrl]);

  useEffect(() => {
    const bibleNames = ["nkrv"];

    const fontStyle = {
      name: "NotoSansCJKkr-Bold",
      fontName: "NotoSansCJKkr-Bold",
      size: 20,
      backgroundColor: "white",
      fontColor: "black",
      julColor: color.bible,
    };

    const settingFontStyle = {
      size: 22,
    };

    const pushSetting = true;
    const mmkvKey = [
      "bibleNames",
      "fontStyle",
      "pushSetting",
      "illDocFontStyle",
      "settingFontStyle",
    ];

    const mmkvValue = [
      bibleNames,
      fontStyle,
      pushSetting,
      fontStyle,
      settingFontStyle,
    ];

    try {
      const machingKey = defaultStorage.getAllKeys();

      mmkvKey.forEach((name, index) => {
        !machingKey.includes(name) &&
        defaultStorage.set(name, JSON.stringify(mmkvValue[index]));
      });
    } catch (error) {
      console.error("MMKV 초기화 오류:", error);
    }

    // Firebase 권한 요청
    requestUserPermission();

    // Firebase 메시지 처리를 더 안전하게
    let unsubscribe: (() => void) | null = null;

    try {
      const firebaseUnsubscribe = messaging().onMessage(async (remoteMessage) => {
        try {
          console.log('포어그라운드 Firebase 메시지 수신:', remoteMessage);

          // Notifee 포어그라운드 이벤트 핸들러
          const unsubscribeNotifee = notifee.onForegroundEvent(
              ({ type, detail }: { type: EventType; detail: any }) => {
                if (type === EventType.PRESS) {
                  if (remoteMessage?.data?.url && !remoteMessage?.data?.localUrl) {
                    moveUrl(remoteMessage?.data?.url);
                  }

                  if (!remoteMessage?.data?.url && remoteMessage?.data?.localUrl) {
                    localMoveUrl(remoteMessage?.data?.localUrl);
                  }
                }
              }
          );

          // 일정 시간 후 이벤트 리스너 정리
          setTimeout(() => {
            unsubscribeNotifee();
          }, 5000);

        } catch (error) {
          console.error("Firebase 메시지 처리 오류:", error);
        }
      });

      unsubscribe = firebaseUnsubscribe;
    } catch (error) {
      console.error("Firebase 메시지 리스너 설정 오류:", error);
    }

    // 플랫폼별 초기 메시지 처리
    if (Platform.OS === "ios") {
      iosRemoteMessage();
    }

    if (Platform.OS === "android") {
      androidRemoteMessage();
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Firebase 메시지 리스너 정리 오류:", error);
        }
      }
    };
  }, [iosRemoteMessage, androidRemoteMessage, moveUrl, localMoveUrl]);

  return (
      <>
        <CustomStatusBar barStyle="dark-content" backgroundColor={color.bible} />
        {isUpdating ? (
            <AppCodePushUpdateScreen
                appVersion={codePushAppVersion}
                syncProgress={syncProgress}
            />
        ) : (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <NavigationContainer ref={RootNavigation.navigationRef}>
                <FrameProvider>
                  <ReduxProvider>
                    <AppNavigator />
                  </ReduxProvider>
                </FrameProvider>
                <Toast />
              </NavigationContainer>
            </GestureHandlerRootView>
        )}
      </>
  );
}

export default App;