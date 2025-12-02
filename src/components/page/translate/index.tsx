import { useIsFocused } from '@react-navigation/native';
import { Center, Checkbox } from 'native-base';
import { useEffect, useState } from 'react';
import { View, ScrollView, Text, Button } from 'react-native';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { defaultStorage } from '../../../utils/mmkv';
import BackHeaderLayout from '../../layout/header/backHeader';
import { gFontTitle } from '../../../constant/global';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TranslateScreen() {
  const { color } = useBaseStyle();

  const { navigation } = useNativeNavigation();

  const [bibleNames, setBibleNames] = useState<String[]>([]);

  const isFocused = useIsFocused();

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const mmkv = defaultStorage.getString('bibleNames');

    if (mmkv) {
      const result = JSON.parse(mmkv);
      setBibleNames(result);
    }
  }, [isFocused]);

  const onPress = () => {
    defaultStorage.set('bibleNames', JSON.stringify(bibleNames));
    navigation.navigate('BibleScreen', {});
  };

  const onChecked = (check: boolean, name: string) => {
    if (bibleNames.length === 1 && bibleNames.includes(name)) {
      return;
    } else {
      setBibleNames((pre) =>
        check ? pre.concat(name) : pre.filter((data) => data !== name)
      );
    }
  };

  const RenderItems = ({ text, keys }: { text: string; keys: string }) => {
    return (
      <View
        style={{
          borderBottomColor: '#ECECEC',
          borderBottomWidth: 1,
          paddingLeft: 20
        }}
      >
        <Checkbox
          value={keys}
          onChange={(e) => onChecked(e, keys)}
          isChecked={bibleNames.includes(keys)}
        >
          <Text
            style={{
              fontFamily: gFontTitle,
              padding: 10,
              color: 'black',
              fontSize: 20,
              alignItems: 'center'
            }}
          >
            {text}
          </Text>
        </Checkbox>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <BackHeaderLayout title="번역본 선택" />
      <ScrollView style={{ backgroundColor: color.white }}>
        <RenderItems text={`NKRV     개역개정`} keys={'nkrv'} />
        <RenderItems text={`KRV       개역한글`} keys={'krv'} />
        <RenderItems text={`KJV        KJV`} keys={'kjv'} />
        <RenderItems text={`ASV        ASV`} keys={'asv'} />
        <RenderItems text={`RSV        RSV`} keys={'rsv'} />
        <RenderItems text={`CHA      중국어`} keys={'cha'} />
        <RenderItems text={`JPS       일본어`} keys={'jps'} />
        <RenderItems text={`SCH      독일어`} keys={'sch'} />
        <RenderItems text={`LSG      프랑스어`} keys={'lsg'} />
        <RenderItems text={`LND      이태리어`} keys={'lnd'} />
        <RenderItems text={`SRV      스페인어`} keys={'srv'} />
        <RenderItems text={`RST      러시아어`} keys={'rst'} />
        <RenderItems text={`SWE     스웨덴어`} keys={'swe'} />
      </ScrollView>
      <TouchableOpacity onPress={onPress}>
        <View style={{ height: 60, backgroundColor: color.bible}}>
          <Center>
            <Text
              style={{
                fontSize: 18,
                paddingTop: 20,
                color: color.white,
                fontWeight: '900'
              }}
            >
              적 용
            </Text>
          </Center>
        </View>
      </TouchableOpacity>
      </View>
  );
}
