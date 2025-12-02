import { Button, IconButton, Text } from 'native-base';
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { bibleSetting, defineSQL, fetchSql } from '../../../utils';

import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { defaultStorage } from '../../../utils/mmkv';

export default function PageBar({
  onPressforward,
  onPressNext,
  isPlaying,
  setIsPlaying,
  autoPlay,
  setAutoPlay
}: {
  onPressNext: any;
  onPressforward: any;
  isPlaying: any;
  setIsPlaying: any;
  autoPlay: any;
  setAutoPlay: any;
}) {
  const { color } = useBaseStyle();
  const [read, setRead] = useState<boolean>(false);
  const { route } = useNativeNavigation();

  const BOOK = defaultStorage.getNumber('bible_book') ?? 1;
  const JANG = defaultStorage.getNumber('bible_jang') ?? 1;

  useEffect(() => {
    const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
      WHERE: { BOOK: '?', JANG: '?' }
    })}`;

    fetchSql(bibleSetting, settingSelectSql, [BOOK, JANG], 0).then(
      (res: any) => {
        res !== undefined ? setRead(JSON.parse(res.read)) : setRead(false);
      }
    );

    return () => {};
  }, [BOOK, JANG]);

  const onReadPress = async () => {
    const settingSelectSql = `${defineSQL(['read'], 'SELECT', 'reading_table', {
      WHERE: { BOOK: '?', JANG: '?' }
    })}`;

    const settingInserttSql = `${defineSQL(
      ['book', 'jang', 'read', 'time'],
      'INSERT',
      'reading_table',
      {}
    )}`;

    const settingUpdatetSql = `${defineSQL(
      ['read', 'time'],
      'UPDATE',
      'reading_table',
      {
        WHERE: { BOOK, JANG }
      }
    )}`;

    const result = await fetchSql(
      bibleSetting,
      settingSelectSql,
      [BOOK, JANG],
      0
    );

    result
      ? await fetchSql(bibleSetting, settingUpdatetSql, [
          String(!read),
          String(new Date())
        ])
      : await fetchSql(bibleSetting, settingInserttSql, [
          BOOK,
          JANG,
          String(!read),
          String(new Date())
        ]);
    setRead(!read);
    onPressNext(JANG);
  };

  return (
    <>
      <IconButton
        style={{ position: 'absolute', left: 0, bottom: 0 }}
        onPress={() => onPressforward(JANG)}
        icon={<AntDesignIcon name="caretleft" size={30} color={'#2AC1BC'} />}
      />
      {route.params?.show && (
        <Button
          style={{
            position: 'absolute',
            left: Dimensions.get('screen').width / 2 - 60,
            bottom: 5
          }}
          borderRadius="full"
          bg={read ? color.bible : color.gray4}
          width={120}
          height={10}
          onPress={onReadPress}
        >
          <Text color={read ? color.white : color.black} fontSize={14}>
            {read ? '안읽음 체크' : '읽었음 체크'}
          </Text>
        </Button>
      )}

      <IconButton
        style={{ position: 'absolute', right: 0, bottom: 0 }}
        onPress={() => onPressNext(JANG)}
        icon={<AntDesignIcon name="caretright" size={30} color={'#2AC1BC'} />}
      />
    </>
  );
}
