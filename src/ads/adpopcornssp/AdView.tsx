import React, { memo } from "react";
import { View, Dimensions } from "react-native";
import { AdPopcornNativeView } from "../../native/AdPopcornNative.ts";

const windowWidth = Dimensions.get("window").width;

const AdView = memo(() => (
  <View>
    <AdPopcornNativeView
      style={{ width: "100%", height: 80 }}
      placementId="4H8Bn3n05bzACG1"
      appKey="755912846"
      nativeWidth={windowWidth}
      nativeHeight={85}
    />
  </View>
));

export default AdView;
