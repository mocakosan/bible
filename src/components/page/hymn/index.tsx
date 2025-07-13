import FooterLayout from "../../layout/footer/footer";
import useWebview from "../../../hooks/webview/useWebview";
import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { Box, StatusBar } from "native-base";
import { useIsFocused } from "@react-navigation/native";
import BannerAdComponent from "../../../adforus";
import { StyleSheet, View } from "react-native";
import { useWindowDimensions } from "react-native";
import React from "react";

export default function HymnScreen() {
  const uri = process.env.WEB_WIEW_BASE_URL!;
  // const uri = "https://dev25frontend.givemeprice.co.kr";
  const { color } = useBaseStyle();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const { navigation } = useNativeNavigation();

  const isFocused = useIsFocused();

  const onMessage = (event: any) => {
    const { name, link } = event;
    name && name === "성경" && navigation.navigate("BibleScreen", {});
    name && name === "main" && navigation.goBack();
    // name && name === '광고' && Linking.openURL(link);
    name &&
      name === "billboard" &&
      navigation.navigate("WordScreen", {
        data: { uri: link, back: true },
      });
  };

  const { WebView, currentUrl } = useWebview({
    uri: uri + "/hymn/list",
    onMessage,
  });

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Box safeAreaTop bg={color.status} />
        <View style={styles.webviewContainer}>{WebView}</View>

        {!isLandscape && (
          <View style={styles.adContainer}>
            <BannerAdComponent />
          </View>
        )}

        {isNaN(Number(currentUrl.split("/")?.[4])) && <FooterLayout />}
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
    marginTop: 65,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
