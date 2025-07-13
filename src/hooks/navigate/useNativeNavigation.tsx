import { DrawerActionHelpers, useNavigation, useRoute } from '@react-navigation/native';
import { hookNavigationProp, hookRouteProp } from './useNativeNavigation.type';

export const useNativeNavigation = () => {
  const route = useRoute<hookRouteProp>();

  const navigation = useNavigation<hookNavigationProp>();
  return { route, navigation };
};

export default useNativeNavigation;
