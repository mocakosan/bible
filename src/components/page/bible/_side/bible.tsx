import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Text, View } from 'native-base';
import { memo, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BibleNewDB, color, fetchSql } from '../../../../utils';

import { TouchableOpacity } from 'react-native';
import Highlighter from 'react-native-highlight-words';
import TrackPlayer from 'react-native-track-player';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { bibleSelectSlice } from '../../../../provider/redux/slice';
import { defaultStorage } from '../../../../utils/mmkv';
import ContainerFlatList from '../../../section/containerFlatList';
/**
 *
 * @link 성경 화면
 *
 */
interface PropsType {
  jul: number;
  content: string;
}

function organizeData(res?: any) {
  const result = [];

  for (let i = 0; i < res.length; i++) {
    const sameJul = res.filter((item: any) => item.jul === i + 1);
    if (sameJul.length === 0) {
      continue;
    }
    result.push(sameJul);
  }
  return result;
}

function BibleSubPage({
  markData,
  onPressforward,
  onPressNext,
  isPlaying,
  setIsPlaying,
  autoPlay,
  setAutoPlay,
  ...props
}: any) {
  const { BOOK, JANG } = props;

  const fontStyle = JSON.parse(defaultStorage.getString('fontStyle') ?? '');

  const [data, setData] = useState<{ content: string; jul: number }[]>([]);

  const isFocused = useIsFocused();

  useLayoutEffect(() => {
    const mmkv = defaultStorage.getString('bibleNames');

    if (mmkv) {
      const dataSelectSql = `SELECT content, jul FROM bible_${BOOK} WHERE type in(${JSON.parse(
        mmkv
      )
        .map((val: string) => (val = "'" + val + "'"))
        .join(',')})  and jang =${JANG} order by jul ,sequence ASC`;

      fetchSql(BibleNewDB, dataSelectSql, []).then((res: any) => {
        // organizeData(res)
        setData(organizeData(res));
      });
    }
    return () => {};
  }, [BOOK, JANG, TrackPlayer, isFocused]);

  // ! 수정
  const onTextBgStyles = (jul: number): any => {
    if (Array.isArray(markData)) {
      const find = markData?.find(
        (data: any) => data.jul === jul && data.type === 2
      );
      const hex = find?.color?.replace('#', '');

      const r = parseInt(hex?.substring(0, 2), 16) ?? 0;
      const g = parseInt(hex?.substring(2, 4), 16) ?? 0;
      const b = parseInt(hex?.substring(4, 6), 16) ?? 0;

      const rgbColor = `rgba(${r},${g},${b},0.4)`;

      if (!find) {
        return {};
      }
      return { backgroundColor: rgbColor };
    } else {
      return {};
    }
  };

  // ! 교체
  const RenderBookmarkIcon = ({ jul }: { jul: number }) => {
    if (Array.isArray(markData)) {
      const find = markData?.find(
        (data: any) => data.jul === jul && data.type === 1
      );
      if (!find) {
        return <></>;
      }
      return <FontAwesomeIcon size={20} name="bookmark" color={find?.color} />;
    } else {
      return <></>;
    }
  };

  return (
    <>
      <ContainerFlatList
        style={{
          backgroundColor: fontStyle?.backgroundColor,
          paddingHorizontal: 2
        }}
        data={data}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            fontStyle={fontStyle}
            onTextBgStyles={onTextBgStyles}
            changePage={{ BOOK, JANG }}
            components={<RenderBookmarkIcon jul={item[0].jul} />}
          />
        )}
        keyExtractor={(item, index) => item + index}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onPressforward={onPressforward}
        onPressNext={onPressNext}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        autoPlay={autoPlay}
        setAutoPlay={setAutoPlay}
      />
    </>
  );
}

export default memo(BibleSubPage);

//! 절 정보 밖으로 뺌
const ListItem = ({
  item,
  fontStyle,
  onTextBgStyles,
  changePage,
  components
}: {
  item: PropsType[];
  fontStyle: any;
  onTextBgStyles: any;
  changePage: any;
  components: any;
}) => {
  // console.log('🚀 ~ file: bible.tsx:143 ~ fontStyle:', fontStyle);
  const dispatch = useDispatch();
  const { BOOK, JANG } = changePage;

  const setLineHeight = (fontSize: number) => {
    if (fontSize <= 20) {
      return 23;
    } else if (fontSize >= 20 && fontSize < 24) {
      return 30;
    } else if (fontSize >= 24 && fontSize < 29) {
      return 35;
    } else {
      return 40;
    }
  };

  const lineHeight = setLineHeight(fontStyle?.size);

  const [active, setActive] = useState(false);
  const reset = useSelector(
    (state: any) => state.bibleMenu.reset,
    (left, right) => left.reset !== right.reset
  );
  // const isFocused = useIsFocused();

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  useFocusEffect(
    useCallback(() => {
      setActive(false);
    }, [BOOK, JANG, reset])
  );

  // useEffect(() => {
  //   setActive(false);
  // }, [changePage.BOOK, changePage.JANG, reset, isFocused]);

  useEffect(() => {
    active && dispatch(bibleSelectSlice.actions.addJul([item[0].jul]));
    !active && dispatch(bibleSelectSlice.actions.deleteJul(item[0].jul));
  }, [active]);
  return (
    <>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 20
        }}
      >
        <Text
          style={{
            color:
              fontStyle?.julColor === undefined
                ? color.bible
                : fontStyle?.julColor
          }}
          paddingLeft={2}
          paddingRight={2}
          paddingBottom={2}
          fontSize={fontStyle?.size}
          fontFamily={fontStyle?.fontName}
          lineHeight={lineHeight}
        >
          {item[0].jul}.
        </Text>

        <TouchableOpacity onPress={() => setActive((pre) => !pre)}>
          <View style={{ paddingRight: 60 }}>
            <Highlighter
              highlightStyle={{ ...onTextBgStyles(item[0].jul) }}
              searchWords={item.map(({ content }) =>
                escapeRegExp(content.trim())
              )}
              textToHighlight={`${item
                .map(({ content }, d) => (d === 0 ? content : `\n${content}`))
                .join('')}`}
              style={{
                color: active ? '#B23C0A' : fontStyle.fontColor,
                fontSize: fontStyle?.size,
                fontFamily: fontStyle?.fontName,
                lineHeight
              }}
            />
            {components}
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

{
  /* <Text marginTop={`${fontStyle?.size / 3}px`} style={{ fontSize: fontStyle?.size, }}>
            <Text
              style={{
                color:
                  fontStyle?.julColor === undefined
                    ? color.bible
                    : fontStyle?.julColor,
              }}
              paddingLeft={2}
              paddingRight={10}
              // marginTop={0.5}
              fontWeight={900}
              // fontSize={fontStyle?.size}
              fontFamily={fontStyle?.fontName}
            >
              {`${item[0].jul}. `}
            </Text>
            <Highlighter
              highlightStyle={onTextBgStyles(item[0].jul)}
              searchWords={item.map(({ content }) => content.trim())}
              textToHighlight={`${item
                .map(({ content }, d) => (d === 0 ? content : `\n${content}`))
                .join('')}`}
              style={{
                color: active ? '#B23C0A' : fontStyle.fontColor,
                lineHeight: fontStyle?.size * 1.5,

                fontFamily: fontStyle?.fontName
              }}
            />
            {components}
          </Text> */
}
