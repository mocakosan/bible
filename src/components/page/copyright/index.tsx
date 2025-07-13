import { Text } from 'native-base';
import { StyleSheet, View } from 'react-native';
import { color } from '../../../utils';
import { useCallback, useState } from 'react';
import ReadingHeaderLayout from '../../layout/header/readingHeader';
import { FlashList } from '@shopify/flash-list';

export const bibleRight = [
  { name: '성서', origin: '대한성서공회' },
  { name: '찬송가', origin: '재단법인 한국찬송가공회' }
];

export const copyRight = [
  { name: 'NanumMyeongjo', origin: '네이버' },
  { name: 'NanumGothic', origin: '네이버' },
  { name: 'bookk_mung_bold', origin: '(주)부크크' },
  { name: 'bookk_godic_bold', origin: '(주)부크크' },
  { name: 'S-CoreDream-6Bold', origin: '에스코어 주식회사' },
  { name: 'KCC-Chassam', origin: '한국저작권위원회' },
  { name: 'NanumPen', origin: '네이버' },
  { name: 'NanumBarunGothicBold', origin: '네이버' },
  { name: 'ChosunCentennial_otf', origin: '조선일보' },
  { name: 'KOTRA HOPE', origin: 'KOTRA' }
  // { name: 'SCDream3', origin: '에스코어 주식회사' },
  // { name: 'SCDream8', origin: '에스코어 주식회사' },
  // { name: 'NanumBarunGothic', origin: '네이버' },
  // { name: 'NanumBarunpenR', origin: '네이버' },
  // { name: 'IM_Hyemin-Regular', origin: 'DGB대구은행' },
  // { name: 'KCCDodamdodam_OTF(MAC용)', origin: '한국저작권위원회' },
  // { name: 'KyoboHandwriting2020pdy', origin: '교보문고' },
  // { name: 'KyoboHandwriting2021sjy', origin: '교보문고' },
  // { name: 'KyoboHandwriting2022khn', origin: '교보문고' },
  // { name: 'LINESeedKR-Rg', origin: '라인' },
  // { name: 'NanumSquareNeoOTF-Rg', origin: '네이버' },
  // { name: 'NotoSansKR-Regular', origin: 'NotoSansKR-Regular' },
  // { name: 'PyeongChang-Regular', origin: '강원도평창군' },
  // { name: 'TAEBAEK milkyway', origin: '태백시' },
  // { name: 'The Jamsil OTF 3 Regular', origin: '롯데마트' },
  // { name: '휴먼범석체', origin: '이범석' }
];

export const openLibrary = [
  {
    name: '@notifee/react-native',
    origin: 'https://github.com/invertase/notifee'
  },
  {
    name: '@react-native-clipboard/clipboard',
    origin: 'https://github.com/react-native-clipboard/clipboard'
  },
  {
    name: '@react-native-community/netinfo',
    origin: 'https://github.com/react-native-netinfo/react-native-netinfo'
  },
  {
    name: '@react-native-firebase/app',
    origin: 'https://github.com/invertase/react-native-firebase/tree/main'
  },
  {
    name: '@react-native-firebase/messaging',
    origin: 'https://github.com/invertase/react-native-firebase/tree/main'
  },
  {
    name: '@react-navigation/drawer',
    origin: 'https://github.com/react-navigation/react-navigation-drawer'
  },
  {
    name: '@react-navigation/native',
    origin: 'https://github.com/react-navigation/react-navigation'
  },
  {
    name: '@react-navigation/native-stack',
    origin: 'https://github.com/react-navigation/react-navigation'
  },
  {
    name: '@react-navigation/stack',
    origin: 'https://github.com/react-navigation/react-navigation'
  },
  {
    name: '@reduxjs/toolkit',
    origin: 'https://github.com/reduxjs/redux-toolkit'
  },
  {
    name: '@shopify/flash-list',
    origin: 'https://github.com/Shopify/flash-list'
  },
  {
    name: '@types/lodash',
    origin:
      'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/lodash'
  },
  {
    name: '@types/node',
    origin:
      'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node'
  },
  {
    name: '@types/react-native-snap-carousel',
    origin:
      'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-native-snap-carousel'
  },
  {
    name: '@types/react-native-vector-icons',
    origin:
      'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-native-vector-icons'
  },
  {
    name: '@types/react-native-version-check',
    origin:
      'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-native-version-check'
  },
  { name: 'axios', origin: 'https://github.com/axios/axios' },
  { name: 'dayjs', origin: 'https://github.com/iamkun/dayjs' },
  {
    name: 'deprecated-react-native-prop-types',
    origin: 'https://github.com/facebook/react-native-deprecated-modules'
  },
  { name: 'lodash', origin: 'https://github.com/lodash/lodash' },
  { name: 'native-base', origin: 'https://github.com/GeekyAnts/NativeBase' },
  { name: 'react', origin: 'https://github.com/facebook/react' },
  { name: 'react-native', origin: 'https://github.com/facebook/react-native' },
  {
    name: 'react-native-calendars',
    origin: 'https://github.com/wix/react-native-calendars'
  },
  {
    name: 'react-native-dotenv',
    origin: 'https://github.com/zetachang/react-native-dotenv'
  },
  {
    name: 'react-native-exit-app',
    origin: 'https://github.com/wumke/react-native-exit-app'
  },
  {
    name: 'react-native-fast-image',
    origin: 'https://github.com/DylanVann/react-native-fast-image'
  },
  {
    name: 'react-native-floating-action',
    origin: 'https://github.com/santomegonzalo/react-native-floating-action'
  },
  {
    name: 'react-native-geolocation-service',
    origin: 'https://github.com/Agontuk/react-native-geolocation-service'
  },
  {
    name: 'react-native-gesture-handler',
    origin: 'https://github.com/software-mansion/react-native-gesture-handler'
  },
  {
    name: 'react-native-highlight-words',
    origin: 'https://github.com/clauderic/react-native-highlight-words'
  },
  {
    name: 'react-native-image-layout',
    origin: 'https://github.com/Luehang/react-native-image-layout'
  },
  {
    name: 'react-native-linear-gradient',
    origin:
      'https://github.com/react-native-linear-gradient/react-native-linear-gradient'
  },
  {
    name: 'react-native-mmkv',
    origin: 'https://github.com/mrousavy/react-native-mmkv'
  },
  {
    name: 'react-native-permissions',
    origin: 'https://github.com/zoontek/react-native-permissions'
  },
  {
    name: 'react-native-reanimated',
    origin: 'https://github.com/software-mansion/react-native-reanimated'
  },
  {
    name: 'react-native-reanimated-carousel',
    origin: 'https://github.com/dohooo/react-native-reanimated-carousel'
  },
  {
    name: 'react-native-safe-area-context',
    origin: 'https://github.com/th3rdwave/react-native-safe-area-context'
  },
  {
    name: 'react-native-screens',
    origin: 'https://github.com/software-mansion/react-native-screens'
  },
  {
    name: 'react-native-simple-modal',
    origin: 'https://github.com/maxjvh/react-native-simple-modal'
  },
  {
    name: 'react-native-snap-carousel',
    origin: 'https://github.com/archriss/react-native-snap-carousel'
  },
  {
    name: 'react-native-splash-screen',
    origin: 'https://github.com/crazycodeboy/react-native-splash-screen'
  },
  {
    name: 'react-native-sqlite-storage',
    origin: 'https://github.com/andpor/react-native-sqlite-storage'
  },
  {
    name: 'react-native-svg',
    origin: 'https://github.com/react-native-svg/react-native-svg'
  },
  {
    name: 'react-native-toast-message',
    origin: 'https://github.com/calintamas/react-native-toast-message'
  },
  {
    name: 'react-native-toggle-element',
    origin: 'https://github.com/mymai91/react-native-toggle-element'
  },
  {
    name: 'react-native-track-player',
    origin: 'https://github.com/react-native-kit/react-native-track-player'
  },
  {
    name: 'react-native-vector-icons',
    origin: 'https://github.com/oblador/react-native-vector-icons'
  },
  {
    name: 'react-native-version-check',
    origin: 'https://github.com/kimxogus/react-native-version-check'
  },
  {
    name: 'react-native-webview',
    origin: 'https://github.com/react-native-webview/react-native-webview'
  },
  { name: 'react-redux', origin: 'https://github.com/reduxjs/react-redux' },
  { name: 'redux', origin: 'https://github.com/reduxjs/redux' },
  { name: 'swr', origin: 'https://github.com/vercel/swr' },
  { name: 'yarn', origin: 'https://github.com/yarnpkg/yarn' }
];

export default function CopyRightScreen() {
  const [menuIndex, setMenuIndex] = useState<number>(0);

  const [menuData, setMenuData] = useState<any>(bibleRight);
  const Separator = () => (
    <View
      style={{
        height: 0.4,
        backgroundColor: color.gray5,
        paddingHorizontal: 0
      }}
    />
  );

  const onMenuChange = useCallback(
    (index: number) => {
      setMenuIndex(index);
      switch (index) {
        case 0:
          setMenuData(bibleRight);
          break;
        case 1:
          setMenuData(copyRight);
          break;
        case 2:
          setMenuData(openLibrary);
          break;
      }
    },
    [menuIndex]
  );

  const pressRight = () => {
    setMenuIndex(1);
  };

  const pressOpenLibrary = () => {
    setMenuIndex(2);
  };

  const ListItem = ({ item, index }: { item: any; index: any }) => {
    return (
      <>
        <View
          style={{
            padding: 8,
            flexDirection: 'row',
            backgroundColor: color.white
          }}
        >
          <Text
            style={{
              fontSize: 14,
              width: '50%'
            }}
          >
            {index + 1}. {item.name}
          </Text>
          <Text
            style={{
              width: '50%',
              fontSize: 14,
              color: color.bible
            }}
          >
            {item.origin}
          </Text>
        </View>
        <Separator />
      </>
    );
  };
  return (
    <>
      <ReadingHeaderLayout
        {...{
          title: '저작권',
          list: ['성서', '폰트', '오픈라이브러리'],
          menuIndex,
          onMenuChange
        }}
      />

      <FlashList
        // showsVerticalScrollIndicator={true}
        // showsHorizontalScrollIndicator={false}
        data={menuData}
        keyExtractor={(item, index) => String(item) + index}
        renderItem={({ item, index }) => <ListItem item={item} index={index} />}
        estimatedItemSize={20}
      />
    </>
  );
}
