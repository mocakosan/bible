//import { Box, HStack, Text, ScrollView } from 'native-base';

import { FlashList } from '@shopify/flash-list';
import { Text, TouchableOpacity, View } from 'react-native';
import { useBaseStyle } from '../../../hooks';

interface Props {
  onPress: (index: number, active: number) => void;
}

export const bibleList = [
  '창세기',
  '출애굽기',
  '레위기',
  '민수기',
  '신명기',
  '여호수아',
  '사사기',
  '룻기',
  '사무엘상',
  '사무엘하',
  '열왕기상',
  '열왕기하',
  '역대기상',
  '역대기하',
  '에스라',
  '느헤미야',
  '에스더',
  '욥기',
  '시편',
  '잠언',
  '전도서',
  '아가',
  '이사야',
  '예레미야',
  '예레미야 애가',
  '에스겔',
  '다니엘',
  '호세아',
  '요엘',
  '아모스',
  '오바댜',
  '요나',
  '미가',
  '나훔',
  '하박국',
  '스바냐',
  '학개',
  '스가랴',
  '말라기',
  '마태복음',
  '마가복음',
  '누가복음',
  '요한복음',
  '사도행전',
  '로마서',
  '고린도전서',
  '고린도후서',
  '갈라디아서',
  '에베소서',
  '빌립보서',
  '골로새서',
  '데살로니가전서',
  '데살로니가후서',
  '디모데전서',
  '디모데후서',
  '디도서',
  '빌레몬서',
  '히브리서',
  '야고보서',
  '베드로전서',
  '베드로후서',
  '요한일서',
  '요한이서',
  '요한삼서',
  '유다서',
  '요한계시록',
  '',
  '',
  ''
];

export default function BibleFlatList({ onPress }: Props) {
  const { color } = useBaseStyle();

  const Separator = () => (
    <View
      style={{
        height: 0.4,
        backgroundColor: color.gray9,
        paddingHorizontal: 0
      }}
    />
  );

  const ListItem = ({ item, index }: { item: any; index: any }) => {
    return (
      <>
        <View style={{ padding: 8 }}>
          <TouchableOpacity onPress={() => onPress(index, 1)}>
            <Text
              style={{
                fontSize: 20,
                color: 'black',
                fontWeight: '700',
                padding: 3
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        </View>
        <Separator />
      </>
    );
  };

  return (
    <FlashList
      // showsVerticalScrollIndicator={true}
      // showsHorizontalScrollIndicator={false}
      data={bibleList}
      // keyExtractor={(item, index) => item + index}
      renderItem={({ item, index }) => <ListItem item={item} index={index} />}
      estimatedItemSize={20}
    />
  );
}
