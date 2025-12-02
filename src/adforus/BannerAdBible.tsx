import React from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

const BannerAdBible = () => {
  const adUnitId = "ca-app-pub-1162719494234001/7170596353";

  return (
    <View>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
};

export default BannerAdBible;
