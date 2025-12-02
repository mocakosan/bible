import { isEmpty } from 'lodash';
import { HStack, Pressable } from 'native-base';
import { useDispatch, useSelector } from 'react-redux';
import setting_off from '../../../assets/svg/setting_off.svg';
import souund_off from '../../../assets/svg/sound_off.svg';
import souund_on from '../../../assets/svg/sound_on.svg';
import star_off from '../../../assets/svg/star_off.svg';
import star_on from '../../../assets/svg/star_on.svg';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import useAlert from '../../../hooks/modal/useAlert';
import { menuSlice } from '../../../provider/redux/slice';
import { BIBLE_MESSAGE } from '../../../utils';
import Svg from '../../Svg';
export default function BibleMenu() {
  const { color } = useBaseStyle();
  const stateMap = (state: combineType) => {
    return {
      menuState: state.menu as menuStateType,
      bibleTextState: state.bible as bibleTextType
    };
  };
  const { menuState, bibleTextState } = useSelector(stateMap);
  const datas = menuState.option as { [key: string]: boolean };

  const { navigation } = useNativeNavigation();
  const { Alert, onOpen } = useAlert({ title: BIBLE_MESSAGE[0].kor });
  const dispatch = useDispatch();
  //이건 무슨 용도 일까...ㅠ.ㅠ 바뻐서 놔둠
  const onPress = (params: string) => {
    const change = { [params]: !datas[params] };
    const result = { ...datas, ...change };

    console.log(params);

    if (params === 'setting') {
      dispatch(menuSlice.actions.change({ option: result }));
      navigation.navigate('SettingScreen', {});
    } else if (params === 'sound') {
      dispatch(menuSlice.actions.change({ option: result }));
    } else {
      if (isEmpty(bibleTextState.value)) {
        onOpen();
      } else {
        dispatch(menuSlice.actions.change({ option: result }));
      }
    }

    // params === 'setting'
    //   ? navigation.navigate('SettingScreen', {})
    //   : params === 'note'
    //   ? isEmpty(bibleTextState.value)
    //     ? onOpen()
    //     : dispatch(menuSlice.actions.change({ option: result }))
    //   : dispatch(menuSlice.actions.change({ option: result }));
  };

  const iconSize = 28;
  return (
    <>
      {Alert}
      <HStack
        paddingLeft={3}
        margin={1}
        justifyContent={'space-between'}
        space={3}
      >
        <Pressable onPress={() => onPress('sound')}>
          {datas.sound ? (
            <Svg width={iconSize} height={iconSize} Svg={souund_on} />
          ) : (
            <Svg width={iconSize} height={iconSize} Svg={souund_off} />
          )}
        </Pressable>
        <Pressable onPress={() => onPress('vector')}>
          {datas.vector ? (
            <Svg width={iconSize} height={iconSize} Svg={star_on} />
          ) : (
            <Svg width={iconSize} height={iconSize} Svg={star_off} />
          )}
        </Pressable>
        {/* <Pressable onPress={() => onPress('note')}>
          {datas.note ? (
            <WithLocalSvg width={iconSize} height={iconSize} asset={note_on} />
          ) : (
            <WithLocalSvg width={iconSize} height={iconSize} asset={note_off} />
          )}
        </Pressable> */}
        <Pressable onPress={() => onPress('setting')}>
          <Svg width={iconSize} height={iconSize} Svg={setting_off} />
        </Pressable>
      </HStack>
    </>
  );
}
