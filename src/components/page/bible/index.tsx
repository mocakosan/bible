import Clipboard from "@react-native-clipboard/clipboard";
import { useIsFocused } from "@react-navigation/native";
import React, {useCallback, useEffect, useLayoutEffect, useState} from "react";
import { Platform, Share, View } from "react-native";
import { FloatingAction } from "react-native-floating-action";
import { Toast } from "react-native-toast-message/lib/src/Toast";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
import { bFloating, gFloating } from "../../../constant/global";
import useWebview from "../../../hooks/webview/useWebview";
import {
  bibleSelectSlice,
  bibleTextSlice,
} from "../../../provider/redux/slice";
import { BibleNewDB, bibleSetting, color, fetchSql } from "../../../utils";
import { BibleStep } from "../../../utils/define";
import { defaultStorage } from "../../../utils/mmkv";
import FooterLayout from "../../layout/footer/footer";
import PlayFooterLayout from "../../layout/footer/playFooter";
import SectionBibleHeaderLayout from "../../layout/header/sectionBibleHeader";
import BookLightModal from "../../modal/bookLightModal";
import BookMarkModal from "../../modal/bookMarkModal";
import { MalsumNoteModal } from "../../modal/note";
import BibleList from "../../section/bibleList/index";
import BibleSubPage from "./_side/bible";
import OtherPage from "./_side/other";

export default function BibleScreen() {
  const dispatch = useDispatch();

  const [sound, setSound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);

  // MMKV에서 직접 읽어오기 (Redux와 동기화)
  const book = defaultStorage.getNumber("bible_book") ??
      defaultStorage.getNumber("bible_book_connec") ?? 1;
  const jang = defaultStorage.getNumber("bible_jang") ??
      defaultStorage.getNumber("bible_jang_connec") ?? 1;

  // Redux 상태와 동기화
  const BOOK = useSelector((state: any) => state.bibleMenu.book) || book;
  const JANG = useSelector((state: any) => state.bibleMenu.jang) || jang;

  // 상태 동기화 함수 추가
  const syncStates = useCallback((newBook: number, newJang: number) => {
    try {
      // MMKV 업데이트 (타입 안전성 보장)
      defaultStorage.set("bible_book", Number(newBook));
      defaultStorage.set("bible_jang", Number(newJang));
      defaultStorage.set("bible_book_connec", Number(newBook));
      defaultStorage.set("bible_jang_connec", Number(newJang));

      // Redux 업데이트
      dispatch(bibleSelectSlice.actions.changePage({
        book: Number(newBook),
        jang: Number(newJang)
      }));
      dispatch(bibleTextSlice.actions.reset());

      console.log(`[BIBLE_SCREEN] 상태 동기화: ${newBook}권 ${newJang}장`);
    } catch (error) {
      console.error('MMKV 동기화 오류:', error);
    }
  }, [dispatch]);

  // 이전 장 함수 개선
  const onPressforward = useCallback(async (currentJang: number) => {
    console.log("🚀 ~ onPressforward ~ sound:", sound);

    const curJang = currentJang - 1;
    let newBook = BOOK;
    let newJang = curJang;

    if (curJang === 0) {
      if (BOOK > 1) {
        newBook = BOOK - 1;
        newJang = BibleStep[BOOK - 2].count;
      } else {
        return; // 첫 번째 장이면 아무것도 하지 않음
      }
    }

    // 상태 동기화
    syncStates(newBook, newJang);

    // 사운드가 켜져있으면 자동 재생 준비
    if (sound) {
      handleUpdateData();
      setAutoPlay(true);
      setIsPlaying(false);
    }
  }, [BOOK, sound, syncStates, handleUpdateData]);

  // 다음 장 함수 개선
  const onPressNext = useCallback((currentJang: number) => {
    console.log("🚀 ~ onPressNext ~ sound:", sound);

    const curJang = currentJang + 1;
    const totalJang = BibleStep[BOOK - 1].count;
    let newBook = BOOK;
    let newJang = curJang;

    if (curJang > totalJang) {
      if (BOOK === 66) {
        return; // 마지막 장이면 아무것도 하지 않음
      } else {
        newBook = BOOK + 1;
        newJang = 1;
      }
    }

    // 상태 동기화
    syncStates(newBook, newJang);

    // 사운드가 켜져있으면 자동 재생 준비
    if (sound) {
      handleUpdateData();
      setAutoPlay(true);
      setIsPlaying(false);
    }
  }, [BOOK, sound, syncStates, handleUpdateData]);

  // 초기 Redux 상태 설정 - 한 번만 실행
  useEffect(() => {
    if (book && jang) {
      dispatch(bibleSelectSlice.actions.changePage({ book, jang }));
    }
  }, []); // 빈 dependency array로 초기에만 실행

  // 나머지 코드는 동일...
  const selectSql = `SELECT type, color, jul FROM 'bible_setting'
  WHERE book = ${BOOK} and jang = ${JANG}`;
  const bibleName = `${BibleStep?.[BOOK - 1]?.name} ${JANG}장` ?? "";

  const [menuIndex, setMenuIndex] = useState<number>(0);
  const isFocused = useIsFocused();

  const fetcher = async (url: string) => {
    const data = await fetchSql(bibleSetting, url, []);
    return data;
  };

  const { data: markData, mutate } = useSWR(selectSql, fetcher);

  const handleUpdateData = useCallback(async () => {
    const data = await fetchSql(bibleSetting, selectSql, []);
    return mutate(selectSql, data);
  }, [BOOK, JANG, selectSql, mutate]);

  const onMenuPress = useCallback((index: number) => {
    setMenuIndex(index);
  }, []);

  const MenusRenderIndex = useCallback(() => {
    switch (menuIndex) {
      case 1:
        return `${process.env.WEB_WIEW_BASE_URL}/bible/study?book=${BOOK}&jang=${JANG}`;
      case 2:
        return `${process.env.WEB_WIEW_BASE_URL}/bible/note?book=${BOOK}&jang=${JANG}`;
      case 3:
        return `${process.env.WEB_WIEW_BASE_URL}/bible/mook?book=${BOOK}&jang=${JANG}`;
      case 4:
        return `${process.env.WEB_WIEW_BASE_URL}/bible/qa?book=${BOOK}&jang=${JANG}`;
      case 5:
        return `${process.env.WEB_WIEW_BASE_URL}/bible/photo?book=${BOOK}&jang=${JANG}`;
      default:
        return "";
    }
  }, [menuIndex, BOOK, JANG]);

  useLayoutEffect(() => {
    if (isFocused) {
      // MMKV에서 최신 값 읽어오기
      const latestBook = defaultStorage.getNumber("bible_book") ?? 1;
      const latestJang = defaultStorage.getNumber("bible_jang") ?? 1;

      // Redux와 동기화
      dispatch(bibleSelectSlice.actions.changePage({
        book: latestBook,
        jang: latestJang
      }));

      setMenuIndex(0);
      handleUpdateData();
    }
  }, [isFocused, dispatch, handleUpdateData]);

  const { WebView, isNetWork } = useWebview({
    uri: "https://bible25frontend.givemeprice.co.kr/bible",
  });

  return (
      <>
        <SectionBibleHeaderLayout
            {...{
              open: sound,
              setOpen: setSound,
              name: bibleName,
              darkmode: false,
            }}
        />

        <BibleList vector={false} menuIndex={menuIndex} onPress={onMenuPress} />

        {menuIndex === 0 ? (
            <>
              <BibleSubPage
                  {...{
                    BOOK,
                    JANG,
                    markData,
                    onPressforward: () => onPressforward(JANG),
                    onPressNext: () => onPressNext(JANG),
                    isPlaying,
                    setIsPlaying,
                    autoPlay,
                    setAutoPlay,
                  }}
              />
              {!sound && <FooterLayout />}
              <PlayFooterLayout onTrigger={handleUpdateData} openSound={sound} />
            </>
        ) : (
            <>
              <OtherPage uri={MenusRenderIndex()} />
              <FooterLayout />
            </>
        )}
        <FloatingActionContainer
            BOOK={BOOK}
            JANG={JANG}
            handleUpdateData={handleUpdateData}
        />
        <View style={{ width: 0, display: "none" }}>{WebView}</View>
      </>
  );
}

// ! 추후 분리 밑에 전부
const FloatingActionContainer = ({ BOOK, JANG, handleUpdateData }: any) => {
  const fontStyle = JSON.parse(defaultStorage.getString("fontStyle") ?? "");
  const dispatch = useDispatch();
  const [open, setOpen] = useState(0);

  const isFloating = useSelector(
    (state: any) => state.bibleMenu.firstRead,
    (left, right) => left.firstRead !== right.firstRead
  );
  const totaljul = useSelector(
    (state: any) => state.bibleMenu.jul,
    (left, right) => left.jul !== right.jul
  );

  return (
    <>
      <MalsumNoteModal
        open={open}
        close={() => setOpen(0)}
        BOOK={BOOK}
        JANG={JANG}
      />
      <BookMarkModal
        BOOK={BOOK}
        JANG={JANG}
        markData={totaljul}
        isOpen={open}
        onClose={() => setOpen(0)}
        onTrigger={() => handleUpdateData()}
      />
      <BookLightModal
        BOOK={BOOK}
        JANG={JANG}
        markData={totaljul}
        isOpen={open}
        onClose={() => setOpen(0)}
        onTrigger={() => handleUpdateData()}
      />

      {isFloating && (
        <FloatingAction
          position="right"
          distanceToEdge={{ vertical: 140, horizontal: 10 }}
          // actionsPaddingTopBottom={}
          // onPressBackdrop={false}
          // tintColor={color.bible}
          // visible={false}
          // overlayColor={'red'}
          buttonSize={45}
          showBackground={false}
          color={
            fontStyle.julColor === color.bible
              ? "rgba(42,193,188,0.8)"
              : "rgba(100,100,100,0.6)"
          }
          actions={fontStyle.julColor === color.bible ? gFloating : bFloating}
          onPressItem={(text) =>
            usebibleFloating(
              text as string,
              BOOK,
              JANG,
              totaljul,
              dispatch,
              setOpen
            )
          }
        />
      )}
    </>
  );
};

const usebibleFloating = (
  text: string,
  book: any,
  jang: any,
  totaljul: any,
  dispatch: any,
  setOpen: any
) => {
  switch (text) {
    case "복사":
      onCopy(getBibleSettingData(book, jang, totaljul));
      return dispatch(bibleSelectSlice.actions.reset());
    case "공유":
      onShare(getBibleSettingData(book, jang, totaljul));
      return dispatch(bibleSelectSlice.actions.reset());
    case "북마크":
      return setOpen(1);
    case "형광펜":
      return setOpen(2);
    case "말씀노트":
      return setOpen(3);
    default:
      break;
  }
};

const getBibleSettingData = async (
  book: number,
  jang: number,
  totaljul: number[]
) => {
  let sqlQuery;

  const mmkv = defaultStorage.getString("bibleNames");

  if (mmkv) {
    sqlQuery = `SELECT jul, content FROM bible_${book} WHERE  type in(${JSON.parse(
      mmkv
    )
      .map((val: string) => (val = "'" + val + "'"))
      .join(",")}) and jang = ${jang} and jul in (${totaljul.join(
      ","
    )}) order by jul;`;
  } else {
    sqlQuery = `SELECT jul, content FROM bible_${book} WHERE  type = "nkrv" and jang = ${jang} and jul in (${totaljul.join(
      ","
    )}) order by jul;`;
  }

  try {
    const result = await fetchSql(BibleNewDB, sqlQuery, []);
    return String(result.map(({ jul, content }: any) => `${jul} ${content}`));
  } catch (err) {
    return console.log(err);
  }
};

const onCopy = async (txt: string | any) => {
  try {
    Clipboard.setString(`${await txt}`);
    return Toast.show({
      type: "success",
      text1: "복사했습니다.",
    });
    // dispatch(bibleTextSlice.actions.reset());
  } catch (error) {
    return Toast.show({
      type: "error",
      text1: "실패했습니다.",
    });
  }
};

const onShare = async (txt: string | any) => {
  Share.share({
    message:
      Platform.OS === "ios"
        ? `${await txt}
      https://apps.apple.com/kr/app/바이블25/id814929019`
        : `${await txt}
      https://play.google.com/store/search?q=바이블25&c=apps&hl=ko-KR
      `,
  });
};
