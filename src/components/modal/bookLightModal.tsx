import {
  Button,
  HStack,
  IconButton,
  KeyboardAvoidingView,
  Modal,
  Text
} from 'native-base';
import { memo, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import { useDispatch, useSelector } from 'react-redux';
import { useBaseStyle, useNativeNavigation } from '../../hooks';
import { bibleSelectSlice, bibleTextSlice } from '../../provider/redux/slice';

interface Props {
  BOOK: number;
  JANG: number;
  markData: any[];
  isOpen: number;
  onClose: () => void;
  onTrigger: () => void;
}
const { StatusBarManager } = NativeModules;

function BookLightModal({
  BOOK,
  JANG,
  markData,
  isOpen,
  onClose,
  onTrigger
}: Props) {
  const { navigation } = useNativeNavigation();
  const [lightColor, setLightColor] = useState<string>('');

  const mapState = (state: combineType) => ({
    textState: state.bible as bibleTextType
  });

  const { textState } = useSelector(mapState);
  const { value } = textState;

  const dispatch = useDispatch();
  const { color } = useBaseStyle();

  const [text, setText] = useState<string>('');
  const [statusBarHeight, setStatusBarHeight] = useState<number>(0);

  useEffect(() => {
    Platform.OS == 'ios'
      ? StatusBarManager.getHeight((statusBarFrameData: any) => {
          setStatusBarHeight(statusBarFrameData.height);
        })
      : null;
  }, []);

  const onPress = (color: string) => {
    setLightColor(color);
  };

  const style = {
    m: '8px',
    borderRadius: 'full',
    p: '3',
    padding: 0,
    w: 30,
    h: 30,
    marginRight: 6
  };

  const onSavePress = () => {
    const onReset = () => {
      setText('');
      setLightColor('');
      dispatch(bibleTextSlice.actions.reset());
      onTrigger();
      onClose();
    };

    dispatch(
      bibleSelectSlice.actions.mQuery({
        book: BOOK,
        jang: JANG,
        title: text,
        content: '',
        color: color[lightColor],
        type: 2
      })
    );

    onReset();
  };

  return (
    <Modal
      isOpen={isOpen === 2}
      onClose={() => {
        onClose();
        setLightColor('');
      }}
    >
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={statusBarHeight + 44}
      >
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header borderBottomColor={'#F5F5F5'}>형광펜</Modal.Header>
          <Modal.Body borderBottomColor={'#F5F5F5'} margin={0}>
            <HStack alignSelf={'center'}>
              <IconButton
                {...style}
                bg={color.lightOrange}
                onPress={() => onPress('lightOrange')}
                icon={
                  lightColor === 'lightOrange' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={color.lightYellow}
                onPress={() => onPress('lightYellow')}
                icon={
                  lightColor === 'lightYellow' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={color.lightGreen}
                onPress={() => onPress('lightGreen')}
                icon={
                  lightColor === 'lightGreen' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={color.lightSkyBlue}
                onPress={() => onPress('lightSkyBlue')}
                icon={
                  lightColor === 'lightSkyBlue' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
            </HStack>

            <HStack alignSelf={'center'}>
              <IconButton
                {...style}
                bg={color.lightBlue}
                onPress={() => onPress('lightBlue')}
                icon={
                  lightColor === 'lightBlue' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={color.lightPurple}
                onPress={() => onPress('lightPurple')}
                icon={
                  lightColor === 'lightPurple' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={color.lightPink}
                onPress={() => onPress('lightPink')}
                icon={
                  lightColor === 'lightPink' ? (
                    <EntypoIcon color={color.white} name={'check'} size={15} />
                  ) : (
                    <></>
                  )
                }
              />
              <IconButton
                {...style}
                bg={'none'}
                onPress={() => onPress('')}
                icon={
                  <EntypoIcon color={color.gray5} name={'block'} size={30} />
                }
                _hover={{
                  bg: color.white
                }}
                _pressed={{
                  bg: color.white
                }}
              />
            </HStack>
          </Modal.Body>

          <Modal.Footer borderTopColor={'#F5F5F5'} alignSelf={'baseline'}>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={onSavePress}
            >
              저장
            </Button>
            <Button
              bg={color.white}
              borderColor={color.gray6}
              borderWidth={1}
              width={'70px'}
              height={'40px'}
              marginLeft={2}
              marginRight={2}
              onPress={() => {
                onClose();
                setLightColor('');
              }}
            >
              <Text style={{ color: color.gray7 }}>취소</Text>
            </Button>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={() => navigation.navigate('LightPenScreen', {})}
            >
              내역
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export default memo(BookLightModal);
