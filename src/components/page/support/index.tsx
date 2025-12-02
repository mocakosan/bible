import { ScrollView } from 'native-base';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import FastImage from 'react-native-fast-image';
import { Dimensions, TouchableOpacity } from 'react-native';
import { color, OnlyMarketUrl } from '../../../utils';
import BackHeaderLayout from '../../layout/header/backHeader';
import { gSupportUrl } from '../../../constant/global';

export default function SupportScreen() {
  const onPress = () => {
    OnlyMarketUrl(gSupportUrl);
  };
  return (
    <>
      <BackHeaderLayout title={'후원'} />
      <ScrollView bg={color.white}>
        <TouchableOpacity onPress={() => onPress()}>
          {/* <FastImage
            style={{ width: Dimensions.get('window').width, height: 400 }}
            source={require('../../../assets/img/supportonly.png')}
            resizeMode={FastImage.resizeMode.stretch}
          /> */}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
