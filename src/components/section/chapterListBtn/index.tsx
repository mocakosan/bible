import { Box, Button, CheckIcon, Menu, Select, Text, VStack } from 'native-base';
import React, { useState } from 'react';
import { useBaseStyle } from '../../../hooks';

interface Props {
  onPress: () => void;
}

export default function ChapterListBtn({ onPress }: Props) {
  const { color } = useBaseStyle();

  return (
    <VStack space={6} alignSelf="center" marginLeft={1}>
      <Button bg={color.bible} size={4} onPress={onPress}>
        <Text style={{ color: color.white }} fontSize={8}>
          ▼
        </Text>
      </Button>
    </VStack>
  );
}
