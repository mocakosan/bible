import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { Alert, Platform } from "react-native";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { baseAxios } from "../api";
import { api } from "../api/define";
import { DisplayNotifee, SetBadgeNotifee } from "./notifee";

export const MessageParams = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) => {
  const { notification } = remoteMessage;
  const params = Object.assign({
    title: notification?.title ?? "",
    body: notification?.body ?? "",
  });
  return params;
};

export async function requestUserPermission() {
  const androidReqPermission = async () => {
    try {
      const platformPermissions = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
      const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);

      // 디바이스 등록을 먼저 시도
      await messaging().registerDeviceForRemoteMessages();
      const token = await FbGetFcmToken();

      console.log(
        "🚀 ~ file: firebase.ts:113 ~ androidReqPermission ~ android token:",
        token
      );

      // 토큰이 있을 때만 서버에 전송
      if (token) {
        try {
          await baseAxios.post(api.POST_APP_PUSH_FCM_TOKEN, {
            deviceId: token,
            pushyn: 1,
          });
        } catch (apiError) {
          console.error("FCM 토큰 서버 전송 실패:", apiError);
        }
      }

      if (result === "denied") {
        await request(platformPermissions);
      }
    } catch (error) {
      console.error("Android 권한 요청 오류:", error);
      // Alert 대신 콘솔 로그로 변경 (UI 스레드 충돌 방지)
      console.error("permission error");
    }
  };

  const iosRequestPermission = async () => {
    try {
      const authorizationStatus = await messaging().requestPermission();
      await messaging().registerDeviceForRemoteMessages();

      const enabled =
        authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const fcmToken = await messaging().getToken();
        console.log(
          "🚀 ~ file: firebase.ts:148 ~ .then ~ ios Token:",
          fcmToken
        );

        if (fcmToken) {
          try {
            await baseAxios.post(api.POST_APP_PUSH_FCM_TOKEN, {
              deviceId: fcmToken,
              pushyn: 1,
            });
          } catch (apiError) {
            console.error("FCM 토큰 서버 전송 실패:", apiError);
          }
        }
      } else {
        console.error("User has notification permissions disabled");
      }
    } catch (error) {
      console.error("iOS 권한 요청 오류:", error);
    }
  };

  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  else if (Platform.OS === "android") {
    await androidReqPermission();
  } else if (Platform.OS === "ios") {
    await iosRequestPermission();
  }
}

export const FbGetFcmToken = async () => {
  try {
    const fcmToken = await messaging().getToken();
    return fcmToken;
  } catch (error) {
    console.error("FCM 토큰 가져오기 실패:", error);
    return null;
  }
};

/**
 * @description background message handler - 개선된 버전 (무한 루프 방지)
 */
export const FbBackgrdMsgHandler = async () => {
  try {
    // 백그라운드 메시지 핸들러는 index.js에서 이미 설정되므로 여기서는 설정하지 않음
    // 대신 배지 설정만 수행
    await SetBadgeNotifee();
  } catch (error) {
    console.error("백그라운드 메시지 핸들러 설정 실패:", error);
  }
};

/**
 * @description message handler - 포어그라운드용
 */
export const FbDeviceHandler = messaging().onMessage(async (remoteMessage) => {
  console.log("포어그라운드 메시지 수신:", remoteMessage);
  try {
    await DisplayNotifee(remoteMessage);
    await SetBadgeNotifee();
  } catch (error) {
    console.error("포어그라운드 알림 표시 실패:", error);
  }
});

export const iosHeadlessCheck = async () => {
  try {
    const result = await messaging().getIsHeadless();
    return result;
  } catch (error) {
    console.error("iOS headless 체크 실패:", error);
    return false;
  }
};
