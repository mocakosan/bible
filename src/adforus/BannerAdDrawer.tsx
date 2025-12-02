import React from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

const BannerAdDrawer = () => {
    const adUnitId = "ca-app-pub-1162719494234001/5592416021";

    return (
        <View>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                }}
            />
        </View>
    );
};

export default BannerAdDrawer;
