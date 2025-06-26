import { Linking } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { APP_STORE_URL } from './style';

export async function OpenMarketUrl(id: number, url: string) {
  Linking.openURL(url);
}

export async function OnlyMarketUrl(url: string) {
  Linking.openURL(url);
}

export const CheckUpgradeYN = (): boolean => {
  let isUpgrade = false;
  VersionCheck.getLatestVersion().then((latestVersion) => {
    if (latestVersion !== VersionCheck.getCurrentVersion()) {
      Linking.openURL(APP_STORE_URL);
      isUpgrade = true;
    }
  });

  return isUpgrade;
};

function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

// 👇️ format as "YYYY-MM-DD hh:mm:ss"
// You can tweak the format easily
export function formatDate(date: Date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate())
    ].join('-') +
    ' ' +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds())
    ].join(':')
  );
}
