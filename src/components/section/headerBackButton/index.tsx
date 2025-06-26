import { useNavigation } from '@react-navigation/native';
import React, { memo } from 'react';
import { Text } from 'react-native';

const HeaderBackButton = () => {
  const { goBack } = useNavigation();

  return <Text>test</Text>;
};

export default memo(HeaderBackButton);
