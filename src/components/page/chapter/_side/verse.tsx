import { Button, HStack, Text, VStack } from 'native-base';
import { useBaseStyle } from '../../../../hooks';
import { memo, useState } from 'react';
import NumberList from '../../../section/numberList';
interface Props {
  count: number;
  bookNumber: number;
  setActive: React.Dispatch<React.SetStateAction<number>>;
}
export default function VerseSubPage({ count, bookNumber, setActive }: Props) {
  return <NumberList count={count} bookNumber={bookNumber} setActive={setActive} />;
}
