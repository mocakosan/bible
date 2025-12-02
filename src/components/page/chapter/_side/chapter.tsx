import { Avatar, Box, HStack, Heading, Spacer, Text, VStack } from 'native-base';
import { useBaseStyle } from '../../../../hooks';
import BibleFlatList from '../../../section/flatList';
import { BibleStep } from '../../../../utils/define';

interface Props {
  onPress: (index: number, active: number) => void;
}

export default function ChapterSubPage({ onPress }: Props) {
  return (
    <Box>
      {/* <BibleFlatList datas={BibleStep} onPress={onPress} /> */}
    </Box>
  );
}
