import { Text, TextArea } from "native-base";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  NativeModules,
  View,
  Button,
  ScrollView,
} from "react-native";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useDispatch, useSelector } from "react-redux";

import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { bibleTextSlice } from "../../../provider/redux/slice";
import { bibleSetting, formatDate } from "../../../utils";
import { BibleStep } from "../../../utils/define";
import { defaultStorage } from "../../../utils/mmkv";
import BackHeaderLayout from "../../layout/header/backHeader";
import { KeyboardAvoidingView } from "react-native";
import React from "react";

export default function NoteScreen() {
  const { color } = useBaseStyle();

  const [text, setText] = useState<string>("");

  const { navigation } = useNativeNavigation();

  const dispatch = useDispatch();

  const { StatusBarManager } = NativeModules;

  const BOOK = defaultStorage.getNumber("bible_book") ?? 1;
  const JANG = defaultStorage.getNumber("bible_jang") ?? 1;

  const mapState = (state: combineType) => ({
    textState: state.bible as bibleTextType,
  });

  const { textState } = useSelector(mapState);

  const sucMessage = () => {
    Toast.show({
      type: "success",
      text1: "말씀노트 저장에 성공했습니다.",
    });
  };

  const errMessage = () => {
    Toast.show({
      type: "error",
      text1: "말씀노트 저장에 실패했습니다.",
    });
  };
  const onSave = () => {
    try {
      const today = formatDate(new Date());
      bibleSetting.transaction((tx) => {
        const sqlQuery = `INSERT INTO bible_setting ('book', 'jang', 'bible', 'title', 'content', 'datetime', 'type') VALUES (${BOOK}, ${JANG},'${
          BibleStep[Number(BOOK) - 1].name
        }', '${String(
          textState.value.map(({ jul }: any) => jul)
        )}','${text}','${today}', 3);`;

        tx.executeSql(sqlQuery, []);
      });
      sucMessage();
      navigation.goBack();
      dispatch(bibleTextSlice.actions.reset());
    } catch (error) {
      errMessage();
    }
  };

  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    Platform.OS == "ios"
      ? StatusBarManager.getHeight((statusBarFrameData: any) => {
          setStatusBarHeight(statusBarFrameData.height);
        })
      : null;
  }, []);

  return (
    <>
      <BackHeaderLayout title="말씀노트 작성" />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={statusBarHeight}
      >
        <TextArea
          autoCompleteType={"off"}
          placeholder="내용입력"
          borderWidth={0}
          w="100%"
          h="85%"
          value={text}
          onChangeText={(text) => setText(text)}
          bg={color.white}
        />
      </KeyboardAvoidingView>
      <View>
        <Button title="저 장" color={color.bible} onPress={onSave} />
      </View>
    </>
  );
}
