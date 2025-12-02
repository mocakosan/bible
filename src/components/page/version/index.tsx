import { ScrollView } from 'native-base';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import FastImage from 'react-native-fast-image';
import { Dimensions, Text } from 'react-native';

export default function VersionInfoScreen() {
  return (
    <>
      <SectionHeaderLayout
        {...{
          name: '개발 및 버전정보',
          type: 'drawer',
          darkmode: false,
          advertise: false
        }}
      />
      <ScrollView>
        <Text>{'개발 버전 -> 관련내용 제공 받고 추가할 예정'}</Text>

        <Text>이미지 디자인으로 갔으면 함</Text>
        {/* <FastImage
          style={{ width: Dimensions.get('window').width, height: 600 }}
          source={require('../../../assets/img/support_2.jpeg')}
          resizeMode={FastImage.resizeMode.stretch}
        /> */}
      </ScrollView>
    </>
  );
}
