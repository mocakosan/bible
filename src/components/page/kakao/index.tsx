import {
  getProfile as getKakaoProfile,
  login,
  serviceTerms,
  unlink
} from '@react-native-seoul/kakao-login';
import ReactNativeIdfaAaid from '@sparkfabrik/react-native-idfa-aaid';
import axios from 'axios';
import { useDisclose } from 'native-base';
import { useEffect } from 'react';
import {
  BackHandler,
  Image,
  ImageBackground,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNExitApp from 'react-native-exit-app';
import SplashScreen from 'react-native-splash-screen';
import { useNativeNavigation } from '../../../hooks';

export default function KakaoScreen() {
  const { isOpen, onOpen, onClose } = useDisclose();
  const { navigation, route } = useNativeNavigation();

  const unlinkKakao = async (): Promise<void> => {
    try {
      await unlink();
      console.log('카카오 계정 연결 해제 성공');
    } catch (error) {
      console.error('카카오 계정 연결 해제 실패:', error);
    }
  };

  const signInWithKakao = async (): Promise<void> => {
    try {
      let adid: { id: string | null; isAdTrackingLimited: boolean } = {
        id: '',
        isAdTrackingLimited: false
      };

      await unlinkKakao();

      await login();

      const profile = await getKakaoProfile();
      const service = await serviceTerms();
      const model = DeviceInfo.getModel(); // 동기 호출
      const carrier = await DeviceInfo.getCarrier(); // 비동기 호출

      if (Platform.OS === 'android') {
        adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
      } else if (Platform.OS === 'ios') {
        const { IDFAModule } = NativeModules;
        try {
          const idfa = await IDFAModule.getIDFA();
          adid.id = idfa;
        } catch (error) {
          adid = await ReactNativeIdfaAaid.getAdvertisingInfo();
          if (!adid) {
            adid =
              await ReactNativeIdfaAaid.getAdvertisingInfoAndCheckAuthorization(
                true
              );
          }
        }
      }

      await axios.post(
        'https://bible25backend.givemeprice.co.kr/login/kakaoid',
        {
          profile_nickname: profile.nickname,
          account_email: profile.email,
          name: profile.name,
          adid: adid?.id,
          phone_number: profile?.phoneNumber,
          age: profile?.ageRange,
          gender: profile?.gender,
          model: model || '',
          carrier: carrier || '',
          marketing_information:
            (service.serviceTerms?.find(
              (terms) => terms.tag === 'marketing_information'
            )?.agreed as unknown as boolean) === true
              ? 1
              : 0,
          receive_marketing:
            (service.serviceTerms?.find(
              (terms) => terms.tag === 'receive_marketing'
            )?.agreed as unknown as boolean) === true
              ? 1
              : 0,
          email:
            (service.serviceTerms?.find((terms) => terms.tag === 'email')
              ?.agreed as unknown as boolean) === true
              ? 1
              : 0,
          sms:
            (service.serviceTerms?.find((terms) => terms.tag === 'sms')
              ?.agreed as unknown as boolean) === true
              ? 1
              : 0,
          telephone:
            (service.serviceTerms?.find((terms) => terms.tag === 'telephone')
              ?.agreed as unknown as boolean) === true
              ? 1
              : 0,
          location:
            (service.serviceTerms?.find((terms) => terms.tag === 'location')
              ?.agreed as unknown as boolean) === true
              ? 1
              : 0
        }
      );
      navigation.replace('DrawerScreens');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    onOpen();
    SplashScreen.hide();
    BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      RNExitApp.exitApp();
      return true;
    });
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        RNExitApp.exitApp();
        return true;
      });
    };
  }, []);

  return (
    <ImageBackground
      style={styles.wrapper}
      source={require('../../../assets/img/login.png')}
    >
      <Pressable
        onPress={() => {
          signInWithKakao();
        }}
      >
        <Image
          style={styles.button}
          source={require('../../../assets/img/login_btn.png')}
        />
      </Pressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'column-reverse',
    alignItems: 'center'
  },
  button: { marginBottom: 100 }
});
