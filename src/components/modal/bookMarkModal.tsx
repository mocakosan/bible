import {
  Button,
  HStack,
  IconButton,
  Input,
  KeyboardAvoidingView,
  Modal,
  Text
} from 'native-base';
import { memo, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import { useDispatch } from 'react-redux';
import { useBaseStyle, useNativeNavigation } from '../../hooks';
import { bibleSelectSlice } from '../../provider/redux/slice';

interface Props {
  BOOK: number;
  JANG: number;
  markData: any[];
  isOpen: number;
  onClose: () => void;
  onTrigger: () => void;
}
const { StatusBarManager } = NativeModules;

function BookMarkModal({
  BOOK,
  JANG,
  markData,
  isOpen,
  onClose,
  onTrigger
}: Props) {
  const { navigation } = useNativeNavigation();
  const [lightColor, setLightColor] = useState<string>('');

  // const mapState = (state: combineType) => ({
  //   textState: state.bible as bibleTextType
  // });

  // const { textState } = useSelector(mapState);
  // const { value } = textState;

  const dispatch = useDispatch();
  const { color } = useBaseStyle();

  const [text, setText] = useState<string>('');
  const [statusBarHeight, setStatusBarHeight] = useState<number>(0);

  useEffect(() => {
    Platform.OS === 'ios'
      ? StatusBarManager.getHeight((statusBarFrameData: any) => {
          setStatusBarHeight(statusBarFrameData.height);
        })
      : null;
  }, []);

  const onPress = (color: string) => {
    setLightColor(color);
  };

  const onSavePress = () => {
    const onReset = () => {
      setText('');
      setLightColor('');
      // dispatch(bibleTextSlice.actions.reset());
      onTrigger();
      onClose();
    };

    // const bibleSettingType = 1;
    // const today = formatDate(new Date());
    dispatch(
      bibleSelectSlice.actions.mQuery({
        book: BOOK,
        jang: JANG,
        title: text,
        content: '',
        color: color[lightColor],
        type: 1
      })
    );

    // value.forEach(({ jul, content }) => {
    //   const find = markData.find(
    //     (data: any) => data.jul === jul && data.type === 1
    //   );

    //   if (find) {
    //     bibleSetting.transaction((tx) => {
    //       const sqlQuery = `UPDATE bible_setting SET color = ${color[lightColor]} , datetime = '${today}' , title = '${text}'
    //       WHERE book = ${BOOK} and jang ${JANG} and jul=${jul} and type = ${bibleSettingType}`;

    //       tx.executeSql(sqlQuery, []);
    //     });
    //   } else {
    //     bibleSetting.transaction((tx) => {
    //       const sqlQuery = `INSERT INTO bible_setting ('book','jang','jul','bible', 'title','content', 'datetime','color','type')
    //     VALUES (${BOOK}, ${JANG}, ${jul}, '${
    //         BibleStep[Number(BOOK) - 1].name
    //       }', '${text}', '${content}', '${today}', '${
    //         color[lightColor]
    //       }', ${bibleSettingType})`;

    //       tx.executeSql(sqlQuery, []);
    //     });
    //   }
    // });

    onReset();
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

  return (
    <Modal
      isOpen={isOpen === 1}
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
          <Modal.Header borderBottomColor={'#F5F5F5'}>북마크</Modal.Header>

          <Modal.Body borderBottomColor={'#F5F5F5'} margin={0}>
            <Input
              placeholder="북마크 이름 입력"
              height={'35px'}
              marginBottom={1}
              value={text}
              onChangeText={(event) => setText(event)}
            />

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
              _pressed={{ bg: color.white }}
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
                setLightColor('');
                onClose();
              }}
            >
              <Text style={{ color: color.gray7 }}>취소</Text>
            </Button>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={() => {
                {
                  onClose();
                  navigation.navigate('BookMarkScreen', {});
                }
              }}
              _pressed={{ bg: color.white }}
            >
              내역
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(BookMarkModal);
