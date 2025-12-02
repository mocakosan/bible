import notifee, {
  AndroidImportance,
  AndroidStyle
} from '@notifee/react-native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
export async function DisplayNotifee(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) {
  const channelId = await notifee.createChannel({
    id: 'bible25',
    name: 'bible25 Channel',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 500]
  });

  await notifee.requestPermission();

  await notifee.displayNotification({
    title:
      Platform.OS === 'ios'
        ? `${remoteMessage?.notification?.title}`
        : `<b>${remoteMessage?.notification?.title}</b>`,
    // subtitle: `${dayjs(new Date()).format('YYYY-MM-DD')}`,
    body: `${remoteMessage?.notification?.body}`,
    android: {
      channelId,
      smallIcon: 'ic_launcher',
      vibrationPattern: [300, 500],
      largeIcon: require('../assets/img/ic_launcher.png') /*  largeIcon: FIREBASE_SEND_IMG */,
      // smallIconLevel: `${remoteMessage?.data?.imageUrl}`,
      style: {
        type: AndroidStyle.BIGPICTURE,
        picture: `${remoteMessage?.data?.imageUrl}`
      },
      badgeCount: 1
      // actions: [
      // 	{
      // 		title: 'Mark as Read',
      // 		pressAction: {
      // 			id: 'read',
      // 		},
      // 	},
      // ],
    },
    ios: {
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true
      },
      interruptionLevel: 'critical',
      critical: true,
      criticalVolume: 0.5,
      attachments: [
        {
          url: `${remoteMessage?.data?.imageUrl}`,
          thumbnailHidden: true
        }
      ]
    }
  });
}

export async function SetBadgeNotifee() {
  notifee.setBadgeCount(1);
}

export async function SetBage() {
  notifee.setBadgeCount(0);
}

export async function GetBadgeNotifee() {
  const result = await notifee.getBadgeCount();

  /*   const { count } = result;
   */
}
