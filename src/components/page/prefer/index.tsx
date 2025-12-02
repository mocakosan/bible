import messaging from '@react-native-firebase/messaging';
import { Box, HStack, ScrollView, Text, VStack } from 'native-base';
import { useEffect, useState } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { baseAxios } from '../../../api';
import { api } from '../../../api/define';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { FbGetFcmToken } from '../../../utils/firebase';
import { defaultStorage } from '../../../utils/mmkv';
import FooterLayout from '../../layout/footer/footer';
import BackHeaderLayout from '../../layout/header/backHeader';
import ToggleSwitch from '../../section/toggle';
import Svg from '../../Svg';

export default function PreferencesScreen() {
  const pushSetting = defaultStorage.getBoolean('pushSetting');
  const { color } = useBaseStyle();
  const [alarm, setAlarm] = useState<boolean>(pushSetting ?? true);

  const { navigation, route } = useNativeNavigation();

  const onAlarmPress = async () => {
    const token = await FbGetFcmToken();
    // setAlarm(!alarm);
    if (Platform.OS === 'android') {
      try {
        if (alarm) {
          try {
            //   openSettings();
          } catch (error) {
            console.log('Error requesting permission:', error);
          }
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        await messaging().setAutoInitEnabled(!alarm);
      } catch (error) {
        console.log(error);
      }
    }
    defaultStorage.set('pushSetting', !alarm);
    setAlarm((pre) => !pre);
    baseAxios.post(api.POST_APP_PUSH_FCM_TOKEN, {
      deviceId: token,
      pushyn: !alarm ? 1 : 0
    });
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      // (async () => {
      //   const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      //   const checked = result === 'granted';
      //   setAlarm(checked);
      // })();
      pushSetting && setAlarm(pushSetting);
    } else {
      (async () => {
        const result = await messaging().requestPermission();
        const checked = result === 1;
        setAlarm(checked);
      })();
    }

    return () => {};
  }, []);

  // useEffect(() => {
  // //   const pushSetting = defaultStorage.getBoolean('pushSetting');
  // //   pushSetting ? setAlarm(true) : setAlarm(false);
  // //   console.log('pushSetting', pushSetting);
  // // }, []);

  return (
    <>
      <BackHeaderLayout title="환경설정" />
      <ScrollView bg={color.white}>
        <VStack
          h={70}
          borderBottomColor={color.status}
          borderBottomWidth={1}
          bg={color.white}
        >
          <HStack>
            <Box
              w={'15%'}
              flexDirection={'row'}
              justifyContent={'center'}
              alignSelf={'center'}
            >
              <Svg
                width={22}
                height={22}
                Svg={require('../../../assets/svg/alarm.svg')}
              />
            </Box>
            <Box w={'60%'}>
              <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
                푸쉬알림
              </Text>
              <Text fontSize={14} marginLeft={3} style={{ color: color.gray8 }}>
                휴대폰 알림 메뉴 푸시 설정
              </Text>
            </Box>
            <Box w={'25%'} bg={color.white}>
              {/* <Button
                variant={'biblebtn'}
                padding={0}
                w={20}
                marginTop={6}
                onPress={() => openSettings()}
              >
                <Text color={color.white}>설정</Text>
              </Button> */}
              <ToggleSwitch toggle={alarm} onToggle={onAlarmPress} />
            </Box>
          </HStack>
        </VStack>
        {/* <VStack
          h={70}
          borderBottomColor={color.status}
          borderBottomWidth={1}
          bg={color.white}
        >
          <HStack>
            <Box
              w={'15%'}
              flexDirection={'row'}
              justifyContent={'center'}
              alignSelf={'center'}
            >
              <WithLocalSvg
                width={22}
                height={22}
                asset={require('../../../assets/svg/pop_up.svg')}
              />
            </Box>
            <Box w={'60%'} bg={color.white}>
              <Text fontSize={16} marginTop={3} marginLeft={3} fontWeight={600}>
                푸쉬팝업
              </Text>
              <Text fontSize={14} marginLeft={3} style={{ color: color.gray8 }}>
                휴대폰 팝업 메뉴 푸시 설정
              </Text>
            </Box>
            <Box w={'15%'} bg={color.white}>
              <ToggleSwitch toggle={popAlarm} onToggle={onPopAlarmPress} />
            </Box>
          </HStack>
        </VStack> */}
        <VStack
          h={70}
          borderBottomColor={color.gray8}
          borderBottomWidth={1}
          bg={color.white}
        >
          <HStack>
            <Box
              w={'15%'}
              flexDirection={'row'}
              justifyContent={'center'}
              alignSelf={'center'}
            >
              <Svg
                width={22}
                height={22}
                Svg={require('../../../assets/svg/office.svg')}
              />
            </Box>
            <TouchableOpacity
              onPress={() => {
                /* navigation.navigate('VersionInfoScreen', {}) */
              }}
            >
              <Box w={'100%'} bg={color.white}>
                <Text
                  fontSize={16}
                  marginTop={3}
                  marginLeft={3}
                  fontWeight={600}
                >
                  개발 및 버전정보
                </Text>
                <Text
                  fontSize={14}
                  marginLeft={3}
                  style={{ color: color.gray8 }}
                >
                  사단법인 바이블25
                </Text>
              </Box>
            </TouchableOpacity>
          </HStack>
        </VStack>
        <VStack
          h={70}
          borderBottomColor={color.status}
          borderBottomWidth={1}
          bg={color.white}
        >
          <TouchableOpacity
            onPress={() => {
              // navigation.navigate('VersionInfoScreen', {})
              navigation.navigate('WordScreen', {
                data: {
                  uri: 'https://www.ihappynanum.com/Nanum/B/L7Y849VB0V',
                  back: true
                }
              });
            }}
          >
            <HStack>
              <Box
                w={'15%'}
                flexDirection={'row'}
                justifyContent={'center'}
                alignSelf={'center'}
              >
                <Svg
                  width={22}
                  height={22}
                  Svg={require('../../../assets/svg/heart.svg')}
                />
              </Box>

              <Box>
                <Text
                  fontSize={16}
                  marginTop={3}
                  marginLeft={3}
                  fontWeight={600}
                  width={100}
                >
                  후원하기
                </Text>
                <Text
                  fontSize={14}
                  marginLeft={3}
                  style={{ color: color.gray8 }}
                >
                  성도님들과 함께
                </Text>
              </Box>
            </HStack>
          </TouchableOpacity>
        </VStack>
      </ScrollView>
      <FooterLayout />
    </>
  );
}
