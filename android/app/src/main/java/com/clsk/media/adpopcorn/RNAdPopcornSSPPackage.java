package com.clsk.media.adpopcorn;

import com.clsk.media.adpopcorn.ads.RNAdPopcornBannerViewManager;
import com.clsk.media.adpopcorn.ads.RNAdPopcornInterstitialAdModule;
import com.clsk.media.adpopcorn.ads.RNAdPopcornInterstitialVideoAdModule;
import com.clsk.media.adpopcorn.ads.RNAdPopcornNativeAdViewManager;
import com.clsk.media.adpopcorn.ads.RNAdPopcornRewardVideoAdModule;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.List;

public class RNAdPopcornSSPPackage implements ReactPackage {
   @Override
   public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
      return Arrays.asList(new RNAdPopcornSSPModule(reactContext), new RNAdPopcornInterstitialAdModule(reactContext),
              new RNAdPopcornInterstitialVideoAdModule(reactContext), new RNAdPopcornRewardVideoAdModule(reactContext));
   }
   @Override
   public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
      return Arrays.asList(new RNAdPopcornBannerViewManager(), new RNAdPopcornNativeAdViewManager());
   }
}