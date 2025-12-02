import { ScrollView } from 'native-base';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import FastImage from 'react-native-fast-image';
import { Dimensions } from 'react-native';
import BackHeaderLayout from '../../layout/header/backHeader';

export default function AssociateScreen() {
  return (
    <>
      <BackHeaderLayout title={'제휴'} />
      <ScrollView>
        <FastImage
          style={{ width: Dimensions.get('window').width, height: 8000 }}
          source={require('../../../assets/img/support_2.jpeg')}
          resizeMode={FastImage.resizeMode.stretch}
        />
      </ScrollView>
    </>
  );
}
