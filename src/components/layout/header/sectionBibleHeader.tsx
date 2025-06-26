import { Box, Button, IconButton, StatusBar, Text } from 'native-base';

import { memo } from 'react';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';

import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SettingOff from '../../../assets/svg/SettingOff.svg';
import SoundOff from '../../../assets/svg/SoundOff.svg';
import SoundOn from '../../../assets/svg/SoundOn.svg';
import { gFontTitle } from '../../../constant/global';

import Svg from '../../Svg';

interface Props {
  name: string;
  darkmode: boolean;
}

function SectionBibleHeaderLayout({ name, darkmode, ...props }: any) {
  // const dispatch = useDispatch()
  // const BOOK = defaultStorage.getNumber('bible_book') ?? 1;
  // const JANG = defaultStorage.getNumber('bible_jang') ?? 1;
  // dispatch(bibleSelectSlice.actions.changePage({ book: BOOK, jang: JANG }))
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();
  const onGoBack = () => {
    navigation.navigate('DrawerScreens', {});
    // navigation.goBack();
  };
  const onNavigate = () => {
    navigation.navigate('TranslateScreen', {});
  };
  const onPressSound = () => {
    // dispatch(menuSlice.actions.change({ option: result }));
  };
  const onPressSetting = () => {
    // dispatch(menuSlice.actions.change({ option: result }));
    navigation.navigate('SettingScreen', {});
  };
  const onPressTitle = () => {
    navigation.navigate('ChapterScreen', {});
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
                // style={
                //   {
                //     // paddingLeft: 6
                //   }
                // }
              />
            }
            onPress={() => onGoBack()}
          />
          <TouchableOpacity onPress={() => onPressTitle()}>
            <Text
              // marginLeft={2}
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
          <Button
            bg={color.status}
            size={0}
            w={'65px'}
            h={8}
            onPress={onNavigate}
            _pressed={{ bg: color.white }}
          >
            <Text fontSize={14} color={color.bible}>
              개역개정
            </Text>
          </Button>
          <TouchableOpacity
            onPress={() => props.setOpen((pre: boolean) => !pre)}
          >
            <View style={styles.soundIcon}>
              {props.open ? (
                <Svg width={24} height={24} Svg={SoundOn} />
              ) : (
                <Svg width={24} height={24} Svg={SoundOff} />
              )}
            </View>
          </TouchableOpacity>
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
export default memo(SectionBibleHeaderLayout);

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
    // flexDirection: 'row'
  },
  settingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 15
  }
});
