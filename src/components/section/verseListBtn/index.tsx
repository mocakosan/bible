import { Box, Button, Menu, Text, VStack } from 'native-base';
import React, { useState } from 'react';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';

export default function VerseListBtn() {
  const { color } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  const onNavigate = () => {
    navigation.navigate('TranslateScreen', {});
  };

  return (
    /*    <VStack space={6} padding={1}> */
    <Box /* margi={2} */>
      <Button bg={color.status} size={0} w={'65px'} h={8} onPress={onNavigate}>
        <Text fontSize={14}>개역개정</Text>
      </Button>
    </Box>
    /*  </VStack> */
  );
}
