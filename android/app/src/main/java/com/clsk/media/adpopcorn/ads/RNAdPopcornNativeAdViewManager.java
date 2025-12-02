package com.clsk.media.adpopcorn.ads;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import javax.annotation.Nonnull;

public class RNAdPopcornNativeAdViewManager extends SimpleViewManager<RNAdPopcornNativeAdView> {
    public static final String REACT_CLASS = "RNAdPopcornNativeAdView";
    public static final String EVENT_NATIVE_LOAD_SUCCESS = "onNativeAdLoadSuccess";
    public static final String EVENT_NATIVE_LOAD_FAILED = "onNativeAdLoadFailed";
    public static final String EVENT_NATIVE_IMPRESSION = "onNativeImpression";
    public static final String EVENT_NATIVE_CLICKED = "onNativeClicked";

    private static final String COMMAND_LOAD_AD = "loadAd";
    private static final String COMMAND_DESTROY_AD = "destroy";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected RNAdPopcornNativeAdView createViewInstance(@NonNull ThemedReactContext themedReactContext) {
        return new RNAdPopcornNativeAdView(themedReactContext, themedReactContext.getCurrentActivity());
    }

    @Override
    @Nullable
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        MapBuilder.Builder<String, Object> builder = MapBuilder.builder();
        String[] events = {
                EVENT_NATIVE_LOAD_SUCCESS,
                EVENT_NATIVE_LOAD_FAILED,
                EVENT_NATIVE_IMPRESSION,
                EVENT_NATIVE_CLICKED
        };
        for (String event : events) {
            builder.put(event, MapBuilder.of("registrationName", event));
        }
        return builder.build();
    }

    @ReactProp(name = "appKey")
    public void setAppKey(RNAdPopcornNativeAdView nativeAdView, String appKey) {
        nativeAdView.setAppKey(appKey);
    }

    @ReactProp(name = "placementId")
    public void setPlacementId(RNAdPopcornNativeAdView nativeAdView, String placementId) {
        nativeAdView.setPlacementId(placementId);
    }

    @ReactProp(name = "nativeWidth")
    public void setNativeWidth(RNAdPopcornNativeAdView nativeAdView, int width) {
        nativeAdView.setWidth(width);
    }

    @ReactProp(name = "nativeHeight")
    public void setNativeHeight(RNAdPopcornNativeAdView nativeAdView, int height) {
        nativeAdView.setHeight(height);
    }

    @Override
    public void receiveCommand(@Nonnull RNAdPopcornNativeAdView nativeAdView, String commandId,  @Nullable ReadableArray args) {
        if (commandId.equals(COMMAND_LOAD_AD)) {
            nativeAdView.loadAd();
        }
        else if (commandId.equals(COMMAND_DESTROY_AD)) {
            nativeAdView.destroyAd();
        }
    }
}