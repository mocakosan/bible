import messaging, {
  FirebaseMessagingTypes
} from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import { check, PERMISSIONS, request } from 'react-native-permissions';
import { baseAxios } from '../api';
import { api } from '../api/define';
import { DisplayNotifee, SetBadgeNotifee } from './notifee';

export const MessageParams = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) => {
  const { notification } = remoteMessage;
  const params = Object.assign({
    title: notification?.title ?? '',
    body: notification?.body ?? ''
  });
  return params;
};

export async function requestUserPermission() {
  const androidReqPermission = async () => {
    const platformPermissions = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
    const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    await messaging().registerDeviceForRemoteMessages();
    const token = await FbGetFcmToken();
    console.log(
      '🚀 ~ file: firebase.ts:113 ~ androidReqPermission ~ android token:',
      token
    );

    try {
      baseAxios.post(api.POST_APP_PUSH_FCM_TOKEN, {
        deviceId: token,
        pushyn: 1
      });

      if (result === 'denied') await request(platformPermissions);
    } catch (error) {
      Alert.alert('permission error');
      console.error(error);
    }
  };

  const iosRequestPermission = async () => {
    const authorizationStatus = await messaging().requestPermission();
    await messaging().registerDeviceForRemoteMessages();

    const enabled =
      authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await messaging()
        .getToken()
        .then((fcmToken) => {
          console.log(
            '🚀 ~ file: firebase.ts:148 ~ .then ~ ios Token:',
            fcmToken
          );
          baseAxios.post(api.POST_APP_PUSH_FCM_TOKEN, {
            deviceId: fcmToken,
            pushyn: 1
          });
        })
        .catch((error) => console.error(error));
    } else {
      console.error('User has notification permissions disabled');
    }
  };

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  else if (Platform.OS === 'android') {
    await androidReqPermission();
  } else if (Platform.OS === 'ios') {
    await iosRequestPermission();
  }
}

export const FbGetFcmToken = async () => {
  const fcmToken = await messaging().getToken();
  return fcmToken;
};

/**
 * @description background message handler
 */
export const FbBackgrdMsgHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    await DisplayNotifee(remoteMessage);
  });
  SetBadgeNotifee();
};
/**
 * @description message handler
 */
export const FbDeviceHandler = messaging().onMessage(async (remoteMessage) => {
  /* await */ DisplayNotifee(remoteMessage);
  await SetBadgeNotifee();
});

export const iosHeadlessCheck = async () => {
  const result = await messaging().getIsHeadless();

  return result;
};
