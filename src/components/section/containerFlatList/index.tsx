import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  FlatListProps,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { defaultStorage } from "../../../utils/mmkv";
import Advertisting from "../../section/advertising";
import PageBar from "../pagebar";
import BannerAdMain from "../../../adforus/BannerAdMain";

interface Props extends FlatListProps<any> {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => Promise<any>;
  onPressNext: any;
  onPressforward: any;
  isPlaying: any;
  setIsPlaying: any;
  autoPlay: any;
  setAutoPlay: any;
}

const ContainerFlatList = ({
  style,
  contentContainerStyle,
  onRefresh,
  onPressforward,
  onPressNext,
  isPlaying,
  setIsPlaying,
  autoPlay,
  setAutoPlay,
  ...rest
}: Props) => {
  const scrollRef = useRef<FlatList>(null);
  const latlon = defaultStorage.getString("latlon")?.split("|");
  const [adKey, setAdKey] = useState(0);

  const BOOK = defaultStorage.getNumber("bible_book") ?? 1;
  const JANG = defaultStorage.getNumber("bible_jang") ?? 1;

  useEffect(() => {
    scrollRef.current &&
      scrollRef.current.scrollToOffset({ offset: 0, animated: false });
  }, [BOOK, JANG]);
  const handlePressNext = (...args: any[]) => {
    setAdKey((prev) => prev + 1); // 광고 리로드
    onPressNext(...args);
  };

  const handlePressForward = (...args: any[]) => {
    setAdKey((prev) => prev + 1); // 광고 리로드
    onPressforward(...args);
  };

  return (
    <View style={[styles.container, style]}>
      {/*<Advertisting*/}
      {/*  default={{*/}
      {/*    lat: latData,*/}
      {/*    lon: lonData,*/}
      {/*    jang: JANG*/}
      {/*  }}*/}
      {/*  name={'bible'}*/}
      {/*  isValidating={false}*/}
      {/*  type="img"*/}
      {/*  style={{*/}
      {/*    marginBottom: 20,*/}
      {/*    position: 'absolute',*/}
      {/*    top: 0,*/}
      {/*    left: 0,*/}
      {/*    right: 0,*/}
      {/*    zIndex: 1000*/}
      {/*  }}*/}
      {/*/>*/}
      {Platform.OS === "android" && (
        <View style={{ marginTop: 20 }}>
          <BannerAdMain />
        </View>
      )}
      <FlatList
        contentInsetAdjustmentBehavior="always"
        ref={scrollRef}
        contentContainerStyle={[styles.flexGrow, contentContainerStyle]}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={<View style={{ height: 20 }} />} // 광고 아래 공간 확보
        {...rest}
      />
      <PageBar
        onPressforward={handlePressForward}
        onPressNext={handlePressNext}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        autoPlay={autoPlay}
        setAutoPlay={setAutoPlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    position: "relative",
  },
  flexGrow: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
});

export default ContainerFlatList;
