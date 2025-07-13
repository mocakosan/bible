import {
  Button,
  HStack,
  IconButton,
  Input,
  KeyboardAvoidingView,
  Modal,
  Text
} from 'native-base';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import { useBaseStyle } from '../../hooks';
import { memo, useEffect, useState } from 'react';
import { bibleSetting, defineSQL } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { bibleTextSlice } from '../../provider/redux/slice';
import { BibleStep } from '../../utils/define';
import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

interface Props {
  type: '형광펜' | '북마크';
  markData: any[];
  isOpen: boolean;
  onClose: () => void;
  onTrigger: () => void;
}
const { StatusBarManager } = NativeModules;

function highLightModal({ type, markData, isOpen, onClose, onTrigger }: Props) {
  const [lightColor, setLightColor] = useState<string>('');

  const mapState = (state: combineType) => ({
    chapterState: state.index as indexStateType,
    textState: state.bible as bibleTextType
  });

  const { chapterState, textState } = useSelector(mapState);

  const { BOOK, JANG } = chapterState;

  const { value } = textState;

  const dispatch = useDispatch();

  const { color } = useBaseStyle();

  const [text, setText] = useState<string>('');

  const [statusBarHeight, setStatusBarHeight] = useState(0);

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
  /**
   * @cpt4567
   * @onSavePress 해당로직 리팩토링 필요
   */

  const onSavePress = () => {
    const onReset = () => {
      setText('');
      setLightColor('');
      dispatch(bibleTextSlice.actions.reset());
      onTrigger();
      onClose();
    };

    try {
      if (type === '북마크') {
        value.forEach(({ jul, content }) => {
          const find = markData.find(
            (data: any) => data.jul === jul && data.type === 1
          );
          find
            ? bibleSetting.transaction((tx) => {
                const updateSql = `${defineSQL(
                  ['color', 'is_time'],
                  'UPDATE',
                  'bible_setting',
                  {
                    WHERE: chapterState
                  }
                )} and JUL=${jul} and type = 1`;
                tx.executeSql(updateSql, [color[lightColor], `${new Date()}`]);
              })
            : bibleSetting.transaction((tx) => {
                const insertSql = defineSQL(
                  [
                    'book',
                    'jang',
                    'jul',
                    'bible',
                    'title',
                    'is_time',
                    'color',
                    'type'
                  ],
                  'INSERT',
                  'bible_setting',
                  {}
                );

                tx.executeSql(insertSql, [
                  BOOK,
                  JANG,
                  jul,
                  BibleStep[Number(BOOK) - 1].name,
                  content,
                  `${new Date()}`,
                  color[lightColor],
                  1
                ]);
              });
        });
        onReset();
      } else {
        value.forEach(({ jul, content }) => {
          const find = markData.find(
            (data: any) => data.jul === jul && data.type === 2
          );

          find
            ? bibleSetting.transaction((tx) => {
                const updateSql = `${defineSQL(
                  ['color', 'is_time', 'title'],
                  'UPDATE',
                  'bible_setting',
                  {
                    WHERE: chapterState
                  }
                )} and JUL=${jul} and type = 2`;
                tx.executeSql(updateSql, [
                  color[lightColor],
                  `${new Date()}`,
                  text
                ]);
              })
            : bibleSetting.transaction((tx) => {
                const insertSql = defineSQL(
                  [
                    'book',
                    'jang',
                    'jul',
                    'bible',
                    'title',
                    'is_time',
                    'color',
                    'type'
                  ],
                  'INSERT',
                  'bible_setting',
                  {}
                );

                tx.executeSql(insertSql, [
                  BOOK,
                  JANG,
                  jul,
                  BibleStep[Number(BOOK) - 1].name,
                  text,
                  `${new Date()}`,
                  color[lightColor],
                  2
                ]);
              });
        });
        onReset();
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
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
          <Modal.Header borderBottomColor={'#F5F5F5'}>{type}</Modal.Header>

          <Modal.Body borderBottomColor={'#F5F5F5'} margin={0}>
            {type === '형광펜' && (
              <Input
                placeholder="형광펜 이름 입력"
                height={'35px'}
                marginBottom={1}
                value={text}
                onChangeText={(event) => setText(event)}
              />
            )}

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
              onPress={() => {
                onClose();
                setLightColor('');
              }}
            >
              <Text style={{ color: color.gray7 }}>취소</Text>
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export default memo(highLightModal);
