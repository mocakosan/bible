import { Box, Center, Image, ScrollView } from 'native-base';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import { useState } from 'react';
import FastImage from 'react-native-fast-image';
import { Dimensions, Text } from 'react-native';
import BackHeaderLayout from '../../layout/header/backHeader';
export default function ManualScreen() {
  return (
    <>
      <BackHeaderLayout title="사용설명서" />
      <ScrollView>
        <FastImage
          style={{
            width: Dimensions.get('window').width,
            height: (Dimensions.get('window').width * 8940) / 640
          }}
          source={require('../../../assets/img/manual.jpg')}
          resizeMode={FastImage.resizeMode.stretch}
        />
      </ScrollView>
    </>
  );
}
