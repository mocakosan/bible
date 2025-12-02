package com.clsk.media.adpopcorn.ads;

import android.telecom.Call;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import javax.annotation.Nonnull;

public class RNAdPopcornBannerViewManager extends SimpleViewManager<RNAdPopcornBannerView> {
    public static final String REACT_CLASS = "RNAdPopcornBannerView";
    public static final String EVENT_BANNER_LOAD_SUCCESS = "onBannerAdReceiveSuccess";
    public static final String EVENT_BANNER_LOAD_FAILED = "onBannerAdReceiveFailed";
    public static final String EVENT_BANNER_CLICKED = "onBannerAdClicked";

    private static final String COMMAND_LOAD_AD = "loadAd";
    private static final String COMMAND_STOP_AD = "stopAd";
    private static final String COMMAND_RESUME = "onResume";
    private static final String COMMAND_PAUSE = "onPause";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected RNAdPopcornBannerView createViewInstance(@NonNull ThemedReactContext themedReactContext) {
        return new RNAdPopcornBannerView(themedReactContext);
    }

    @Override
    @Nullable
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        MapBuilder.Builder<String, Object> builder = MapBuilder.builder();
        String[] events = {
                EVENT_BANNER_LOAD_SUCCESS,
                EVENT_BANNER_LOAD_FAILED,
                EVENT_BANNER_CLICKED
        };
        for (String event : events) {
            builder.put(event, MapBuilder.of("registrationName", event));
        }
        return builder.build();
    }

    @ReactProp(name = "appKey")
    public void setAppKey(RNAdPopcornBannerView bannerView, String appKey) {
        bannerView.setAppKey(appKey);
    }

    @ReactProp(name = "adSize")
    public void setAdSize(RNAdPopcornBannerView bannerView, String mAdSize) {
        bannerView.setAdSize(mAdSize);
    }

    @ReactProp(name = "placementId")
    public void setPlacementId(RNAdPopcornBannerView bannerView, String placementId) {
        bannerView.setPlacementId(placementId);
    }

    @ReactProp(name = "refreshTime")
    public void setRefreshTime(RNAdPopcornBannerView bannerView, int refreshTime) {
        bannerView.setRefreshTime(refreshTime);
    }

    @ReactProp(name = "networkScheduleTimeout")
    public void setNetworkScheduleTimeout(RNAdPopcornBannerView bannerView, int timeout){
        bannerView.setNetworkScheduleTimeout(timeout);
    }

    @ReactProp(name = "bannerAnimType")
    public void setBannerAnimType(RNAdPopcornBannerView bannerView, String type){
        bannerView.setBannerAnimType(type);
    }

    @ReactProp(name = "autoBgColor")
    public void setAutoBgColor(RNAdPopcornBannerView bannerView, boolean flag){
        bannerView.setAutoBgColor(flag);
    }

    @Override
    public void receiveCommand(@Nonnull RNAdPopcornBannerView bannerView, String commandId,  @Nullable ReadableArray args) {
        if (commandId.equals(COMMAND_LOAD_AD)) {
            bannerView.loadAd();
        }
        else if (commandId.equals(COMMAND_STOP_AD)) {
            bannerView.stopAd();
        }
        else if (commandId.equals(COMMAND_RESUME)) {
            bannerView.onResume();
        }
        else if (commandId.equals(COMMAND_PAUSE)) {
            bannerView.onPause();
        }
    }
}