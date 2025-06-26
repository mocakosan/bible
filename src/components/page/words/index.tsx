import { useIsFocused } from "@react-navigation/native";
import { Box, StatusBar } from "native-base";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import useWebview from "../../../hooks/webview/useWebview";
import FooterLayout from "../../layout/footer/footer";
import SectionHeaderLayout from "../../layout/header/sectionHeader";
import BannerAdToday from "../../../adforus/BannerAdToday";
import React from "react";

// 모토클릭 설정 상수
const MOTTO_PUB_KEY = "682fd8b91f7e7"; // 실제 pubKey로 교체해야 합니다
const MOTTO_BASE_URL = "http://app.motto.kr:8070/login";

export default function WordScreen() {
  const { navigation, route } = useNativeNavigation();
  const [uri, setUri] = useState<string>(``);
  const { color } = useBaseStyle();
  const [back, setBack] = useState<boolean>(false);
  const [isMottoMode, setIsMottoMode] = useState<boolean>(false);

  const isFocused = useIsFocused();

  useEffect(() => {
    const data = route.params as any;
    const routeUri = data?.data?.uri;

    // 모토클릭 모드인지 확인
    const isMotto = data?.data?.isMotto || false;
    setIsMottoMode(isMotto);

    if (isMotto) {
      // 모토클릭 모드일 때
      const userId = data?.data?.userId;
      const adId = data?.data?.adId;

      if (userId) {
        const mottoUrl = `${MOTTO_BASE_URL}?pubKey=${MOTTO_PUB_KEY}&uid=${userId}&adId=${adId || ''}`;
        console.log('모토클릭 URL 생성:', mottoUrl);

        if (isFocused) {
          setUri(mottoUrl);
        } else {
          setUri("");
        }
      }
    } else {
      // 기존 로직 (일반 웹뷰 모드)
      routeUri
          ? isFocused
              ? setUri(routeUri)
              : setUri("")
          : isFocused
              ? setUri(`${process.env.WEB_WIEW_BASE_URL}/malsumlist`)
              : setUri("");
    }

    setBack(data?.data?.back ? data?.data?.back : false);
  }, [route, isFocused]);

  const onMessage = (event: any) => {
    const { side, name, link } = event;

    if (isMottoMode) {
      // 모토클릭 모드일 때의 메시지 처리
      console.log('모토클릭 웹뷰 메시지:', event);

      // 모토클릭 JavaScript 인터페이스 처리
      if (event.type === 'START_MISSION' && event.url) {
        // 미션 시작 - 외부 브라우저에서 열기
        const formattedUrl = event.url.startsWith('http') ? event.url : `https://${event.url}`;
        console.log('외부 미션 URL 열기:', formattedUrl);
        Linking.openURL(formattedUrl).catch(err => {
          console.error('URL 열기 실패:', err);
        });
      } else if (event.type === 'HISTORY_BACK') {
        // 히스토리 뒤로가기
        navigation.goBack();
      } else if (event.type === 'MISSION_COMPLETE') {
        // 미션 완료
        console.log('미션 완료:', event);
        // 필요시 포인트 갱신 로직 추가
      }
    } else {
      // 기존 로직 (일반 웹뷰 모드)
      name && name === "main" && navigation.navigate("DrawerScreens", {});
      name && name === "billboard" && Linking.openURL(link);
      side && navigation.toggleDrawer();
    }
  };

  // 모토클릭용 postMessage 데이터
  const onPostMessage = () => {
    if (isMottoMode) {
      // 모토클릭에 필요한 데이터 반환
      return JSON.stringify({
        type: 'INIT',
        userId: route.params?.data?.userId,
        adId: route.params?.data?.adId
      });
    }
    return "";
  };

  const { WebView } = useWebview({
    uri,
    onMessage,
    onPostMessage
  });

  return (
      <>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
          <Box safeAreaTop bg={color.status} />
          {back && (
              <SectionHeaderLayout
                  {...{
                    name: isMottoMode ? "모토" : "",
                    type: "back",
                    darkmode: false,
                  }}
              />
          )}
          <View style={styles.webviewContainer}>{WebView}</View>
          {/* 모토클릭 모드일 때는 광고 배너 숨김 */}
          {!isMottoMode && (
              <View style={styles.adContainer}>
                <BannerAdToday />
              </View>
          )}
          {!back && <FooterLayout />}
        </View>
      </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webviewContainer: {
    flex: 1,
  },
  adContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    marginTop: 55,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});