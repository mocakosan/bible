import { IconButton } from 'native-base';
import { memo, useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import Svg from '../../Svg';

interface Props {
  count: number;
}

function FloatingButton({ count }: Props) {
  const { color, opacity } = useBaseStyle();
  const { navigation } = useNativeNavigation();

  const onNavigation = () => {
    navigation.navigate('NoteScreen', {});
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (count) {
      animationRef.current = Animated.timing(fadeAnim, {
        toValue: 100,
        duration: 5000,
        useNativeDriver: true
      });

      animationRef.current.start();
    } else {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      }).start();
    }
  }, [count, fadeAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, position: 'absolute' }]}>
      <IconButton
        m={'8px'}
        borderRadius="full"
        bg={color.bible}
        variant="solid"
        p="3"
        opacity={opacity[80]}
        left={Dimensions.get('window').width - 90}
        top={Dimensions.get('window').height - 180}
        onPress={onNavigation}
        icon={
          <Svg
            width={30}
            height={30}
            Svg={require('../../../assets/svg/note_icon.svg')}
          />
        }
      />
    </Animated.View>
  );
}

export default memo(FloatingButton);
