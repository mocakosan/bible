import { Flex, Pressable, ScrollView, Text, View } from 'native-base';
import { useDispatch } from 'react-redux';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import { bibleSelectSlice, bibleTextSlice } from '../../../provider/redux/slice';
import { defaultStorage } from '../../../utils/mmkv';

interface Props {
  count: number;
  bookNumber: number;
  setActive: React.Dispatch<React.SetStateAction<number>>;
  onPressJang?: (jang: number) => void; // optional로 변경
}

function NumberList({ count, bookNumber, setActive, onPressJang }: Props) {
  const { color } = useBaseStyle();
  const dispatch = useDispatch();
  const { navigation } = useNativeNavigation();

  const handleJangPress = (jang: number) => {
    try {
      // MMKV 상태 업데이트 (타입 안전성 보장)
      defaultStorage.set('bible_book', Number(bookNumber));
      defaultStorage.set('bible_jang', Number(jang));

      // Redux 상태 업데이트 (MMKV와 동기화)
      dispatch(bibleSelectSlice.actions.changePage({
        book: Number(bookNumber),
        jang: Number(jang)
      }));
      dispatch(bibleTextSlice.actions.reset());

      console.log(`[NUMBER_LIST] 장 선택: ${bookNumber}권 ${jang}장`);

      // 부모 컴포넌트에서 전달된 콜백이 있으면 실행
      if (onPressJang) {
        onPressJang(jang);
      } else {
        // 기본 동작: BibleScreen으로 네비게이션 (backward compatibility)
        setActive(0);
        navigation.navigate('BibleScreen', {});
      }
    } catch (error) {
      console.error('MMKV 저장 오류:', error);
      console.log('bookNumber:', bookNumber, 'jang:', jang);
      console.log('bookNumber type:', typeof bookNumber, 'jang type:', typeof jang);
    }
  };

  return (
      <ScrollView>
        <View style={{ display: 'flex', justifyContent: 'center' }}>
          <Flex
              flexDirection={'row'}
              flexWrap={'wrap'}
              gap={3}
              margin={4}
              marginTop={4}
              marginBottom={100}
          >
            {Array.from({ length: count }).map((_, index) => {
              return (
                  <Pressable
                      key={index}
                      borderRadius={'full'}
                      bg={color.white}
                      _pressed={{
                        bg: color.bible
                      }}
                      onPress={() => handleJangPress(index + 1)}
                  >
                    <Text
                        minW={9}
                        minH={7}
                        style={{
                          textAlign: 'center',
                          fontSize: 18
                        }}
                        lineHeight={20}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
              );
            })}
          </Flex>
        </View>
      </ScrollView>
  );
}

export default NumberList;