import React, { memo } from 'react';
import { StatusBar, StatusBarStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  backgroundColor: string;
  barStyle: StatusBarStyle;
}

const CustomStatusBar = ({ backgroundColor, barStyle }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor, height: insets.top }}>
      <StatusBar
        translucent
        backgroundColor={backgroundColor}
        barStyle={barStyle}
      />
    </View>
  );
};

export default memo(CustomStatusBar);
