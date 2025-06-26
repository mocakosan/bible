import { Linking, StyleSheet, View } from "react-native";
import useWebview from "../../../../hooks/webview/useWebview";
import { useNativeNavigation } from "../../../../hooks";
import React from "react";
import BannerAdBible from "../../../../adforus/BannerAdBible";

interface Props {
  uri: string;
}

export default function OtherPage({ uri }: Props) {
  const { navigation } = useNativeNavigation();

  const onPress = ({ name, img }: { name: string; img: string }) => {
    navigation.navigate("PhotoDetailScreen", { name, img });
  };

  const onMessage = (e: any) => {
    const { name, url, link } = e;

    if (!!name && name === "billboard") {
      Linking.openURL(link);
    } else {
      onPress({ name: name, img: url });
    }
  };
  const { WebView } = useWebview({ uri, onMessage });

  return (
    <>
      <View style={styles.container}>
        <View style={styles.webviewContainer}>{WebView}</View>

        <View style={styles.adContainer}>
          <BannerAdBible />
        </View>
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
    zIndex: 10,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
