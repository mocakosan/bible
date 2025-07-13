import React, { memo } from "react";
import { View, Dimensions } from "react-native";
import { AdPopcornNativeView } from "../../native/AdPopcornNative.ts";

const windowWidth = Dimensions.get("window").width;

const AdViewIldok = memo(() => (
  <View>
    <AdPopcornNativeView
      style={{ width: "100%", height: 80 }}
      placementId="rheN8H3CCGsTImZ"
      appKey="755912846"
      nativeWidth={windowWidth}
      nativeHeight={85}
    />
  </View>
));

export default AdViewIldok;
