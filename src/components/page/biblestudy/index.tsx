import { Box, ScrollView, StatusBar, Text } from "native-base";

import { useBaseStyle, useNativeNavigation } from "../../../hooks";
import { useEffect, useState } from "react";
import useWebview from "../../../hooks/webview/useWebview";
import { useIsFocused } from "@react-navigation/native";
import FooterLayout from "../../layout/footer/footer";
import { StyleSheet, View } from "react-native";
import BannerAdMain from "../../../adforus/BannerAdMain";
import React from "react";

export default function BibleStudyScreen() {
  const { color } = useBaseStyle();

  const [uri, setUri] = useState<string>("");

  const isFocused = useIsFocused();

  const { navigation } = useNativeNavigation();

  useEffect(() => {
    isFocused ? setUri(`${process.env.WEB_WIEW_BASE_URL}/lab`) : setUri("");
  }, [isFocused]);

  const onMessage = (event: any) => {
    const { name } = event;
    !!name && name === "main" && navigation.goBack();
  };

  const { WebView } = useWebview({ uri, onMessage });

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Box safeAreaTop bg={color.status} />
        <View style={styles.webviewContainer}>{WebView}</View>

        <View style={styles.adContainer}>
          <BannerAdMain />
        </View>

        <FooterLayout />
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
