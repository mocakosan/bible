import { Box, Button, IconButton, StatusBar, Text } from 'native-base';

import { memo } from 'react';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';

import {Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SettingOff from '../../../assets/svg/SettingOff.svg';
import SoundOff from '../../../assets/svg/SoundOff.svg';
import SoundOn from '../../../assets/svg/SoundOn.svg';
import { gFontTitle } from '../../../constant/global';

import { useDispatch } from 'react-redux';
import { illdocSelectSlice } from '../../../provider/redux/slice';
import { defaultStorage } from '../../../utils/mmkv';
import Svg from '../../Svg';

interface Props {
  name: string;
  darkmode: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}

function IllDocBibleHeaderLayout({ name, darkmode, open, setOpen, ...props }: Props) {
  const dispatch = useDispatch();

  const illBook = defaultStorage.getNumber('bible_book_connec') ?? 1;
  const illJang = defaultStorage.getNumber('bible_jang_connec') ?? 1;

  dispatch(
      illdocSelectSlice.actions.changePage({ book: illBook, jang: illJang })
  );

  const { color } = useBaseStyle();

  const { navigation } = useNativeNavigation();

  const onGoBack = () => {
    navigation.goBack();
  };

  const onNavigate = () => {
    navigation.navigate('IllDocTranslateScreen', {});
  };

  const onPressSound = () => {
    setOpen(!open);
  };

  const onPressSetting = () => {
    navigation.navigate('IllDocSettingScreen', {});
  };

  const onPressTitle = () => {
    navigation.navigate('ReadingBibleScreen', {});
  };

  return (
      <>
        <StatusBar barStyle="light-content" />
        <Box safeAreaTop bg={color.status} />

        <View style={styles.container}>
          <View style={styles.firstView}>
            <IconButton
                icon={
                  <Icon
                      name="arrow-back-ios"
                      color="black"
                      size={24}
                  />
                }
                onPress={() => onGoBack()}
            />

            <TouchableOpacity onPress={() => onPressTitle()}>
              <Text
                  style={{
                    color: darkmode ? color.white : color.black
                  }}
                  fontSize={18}
                  fontFamily={gFontTitle}
              >
                {name}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secondView}>
            {/* 오디오 토글 버튼 - 자동 진행 기능을 위해 유지 */}
            <TouchableOpacity onPress={onPressSound}>
              <View style={styles.soundIcon}>
                {open ? (
                    <Svg width={24} height={24} Svg={SoundOn} />
                ) : (
                    <Svg width={24} height={24} Svg={SoundOff} />
                )}
              </View>
            </TouchableOpacity>

            {/* 설정 버튼 */}
            <TouchableOpacity onPress={() => onPressSetting()}>
              <View style={styles.settingIcon}>
                <Svg width={24} height={24} Svg={SettingOff} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </>
  );
}

export default memo(IllDocBibleHeaderLayout);

const styles = StyleSheet.create({
  container: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ffff',
    alignItems: 'center'
  },

  firstView: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center'
  },
  secondView: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center'
  },
  soundIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10
  },
  settingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 15
  }
});