import {
  Button,
  KeyboardAvoidingView,
  Modal,
  Text,
  TextArea
} from 'native-base';
import { memo, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useBaseStyle, useNativeNavigation } from '../../hooks';
import {
  bibleSelectSlice,
  bibleTextSlice,
  menuSlice
} from '../../provider/redux/slice';
import { bibleSetting, formatDate } from '../../utils';

import { NativeModules, Platform } from 'react-native';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { BibleStep } from '../../utils/define';
import { defaultStorage } from '../../utils/mmkv';

interface Props {
  pageName: string;
  verseName: string;
  textState: any;
  menuState: menuStateType;
}
export default memo(NoteModal);
const { StatusBarManager } = NativeModules;

export const MalsumNoteModal = ({ open, close, BOOK, JANG }: any) => {
  const { navigation } = useNativeNavigation();
  const { color } = useBaseStyle();

  const [text, setText] = useState<string>('');
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const dispatch = useDispatch();
  const totalJul = useSelector((state: any) => state.bibleMenu.jul);

  useEffect(() => {
    Platform.OS == 'ios'
      ? StatusBarManager.getHeight((statusBarFrameData: any) => {
          setStatusBarHeight(statusBarFrameData.height);
        })
      : null;
  }, []);

  const sucMessage = () => {
    Toast.show({
      type: 'success',
      text1: '말씀노트 저장에 성공했습니다.'
    });
  };

  const errMessage = () => {
    Toast.show({
      type: 'error',
      text1: '말씀노트 저장에 실패했습니다.'
    });
  };

  const onSave = () => {
    try {
      dispatch(
        bibleSelectSlice.actions.mMalSumQuery({
          book: BOOK,
          jang: JANG,
          title: totalJul.toString(),
          content: text,
          type: 3
        })
      );

      sucMessage();
    } catch (error) {
      errMessage();
    }

    setText('');
    dispatch(bibleSelectSlice.actions.resetAction());
    close();
  };

  return (
    <Modal isOpen={open === 3} onClose={close}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={statusBarHeight + 44}
      >
        <Modal.Content h={'100%'}>
          <Modal.CloseButton />
          <Modal.Header borderBottomColor={'#F5F5F5'}>
            <Text fontSize={'18px'} fontWeight={500}>
              {'말씀노트'}
            </Text>
            <Text>
              {`${BibleStep?.[BOOK - 1]?.name} ${JANG}장`}({totalJul.toString()}
              )
            </Text>
          </Modal.Header>

          <Modal.Body
            borderBottomColor={'#F5F5F5'}
            h={'100%'}
            padding={0}
            w={'400px'}
          >
            <TextArea
              autoCompleteType={'off'}
              placeholder="내용입력"
              borderWidth={0}
              w="100%"
              h="100%"
              minH={500}
              fontSize={20}
              value={text}
              onChangeText={(event) => setText(event)}
            />
          </Modal.Body>

          <Modal.Footer borderTopColor={'#F5F5F5'} alignSelf={'baseline'}>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={onSave}
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
              onPress={close}
            >
              <Text style={{ color: color.gray7 }}>취소</Text>
            </Button>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={
                () => {
                  close();
                  navigation.navigate('MalSumNoteScreen', {});
                }
                // navigation.navigate("MalSumNoteScreen", {})
              }
            >
              내역
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </KeyboardAvoidingView>
    </Modal>
  );
};

//notemodal
function NoteModal({ pageName, verseName, textState, menuState }: Props) {
  const { color } = useBaseStyle();

  const BOOK = defaultStorage.getNumber('bible_book') ?? 1;
  const JANG = defaultStorage.getNumber('bible_jang') ?? 1;

  const [text, setText] = useState<string>('');
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const dispatch = useDispatch();
  const { note } = menuState.option;

  const onClose = () => {
    setText('');
    dispatch(
      menuSlice.actions.change({
        option: { ...menuState.option, ...{ note: !note } }
      })
    );
  };

  useEffect(() => {
    Platform.OS == 'ios'
      ? StatusBarManager.getHeight((statusBarFrameData: any) => {
          setStatusBarHeight(statusBarFrameData.height);
        })
      : null;
  }, []);

  const sucMessage = () => {
    Toast.show({
      type: 'success',
      text1: '말씀노트 저장에 성공했습니다.'
    });
  };

  const errMessage = () => {
    Toast.show({
      type: 'error',
      text1: '말씀노트 저장에 실패했습니다.'
    });
  };

  const onSave = () => {
    try {
      const today = formatDate(new Date());
      bibleSetting.transaction((tx) => {
        const sqlQuery = `INSERT INTO bible_setting ('book', 'jang', 'bible', 'title', 'content', 'datetime', 'type') VALUES (${BOOK}, ${JANG},'${
          BibleStep[Number(BOOK) - 1].name
        }', '${String(
          textState.map(({ jul }: any) => jul)
        )}','${text}','${today}', 3);`;

        tx.executeSql(sqlQuery, []);
      });
      sucMessage();
    } catch (error) {
      errMessage();
    }

    dispatch(bibleTextSlice.actions.reset());
    onClose();
  };

  return (
    <Modal isOpen={note} onClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={statusBarHeight + 44}
      >
        <Modal.Content maxWidth="300px">
          <Modal.CloseButton />
          <Modal.Header borderBottomColor={'#F5F5F5'}>
            <Text fontSize={'18px'} fontWeight={500}>
              {pageName}
            </Text>
            <Text>{verseName}</Text>
          </Modal.Header>

          <Modal.Body borderBottomColor={'#F5F5F5'} padding={0} w={'400px'}>
            <TextArea
              autoCompleteType={'off'}
              placeholder="내용입력"
              borderWidth={0}
              w="100%"
              h="100%"
              minH={200}
              value={text}
              onChangeText={(event) => setText(event)}
            />
          </Modal.Body>

          <Modal.Footer borderTopColor={'#F5F5F5'} alignSelf={'baseline'}>
            <Button
              bg={color.bible}
              width={'70px'}
              height={'40px'}
              onPress={onSave}
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
              onPress={onClose}
            >
              <Text style={{ color: color.gray7 }}>취소</Text>
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </KeyboardAvoidingView>
    </Modal>
  );
}
