package com.clsk.media.adpopcorn.ads;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.igaworks.ssp.SSPErrorCode;
import com.igaworks.ssp.part.video.AdPopcornSSPInterstitialVideoAd;
import com.igaworks.ssp.part.video.listener.IInterstitialVideoAdEventCallbackListener;

import java.util.HashMap;
import java.util.Map;

public class RNAdPopcornInterstitialVideoAdModule extends ReactContextBaseJavaModule {
    public static final String EVENT_INTERSTITIAL_VIDEO_LOAD_SUCCESS = "OnInterstitialVideoAdLoaded";
    public static final String EVENT_INTERSTITIAL_VIDEO_LOAD_FAILED = "OnInterstitialVideoAdLoadFailed";
    public static final String EVENT_INTERSTITIAL_VIDEO_OPENED = "OnInterstitialVideoAdOpened";
    public static final String EVENT_INTERSTITIAL_VIDEO_OPEN_FAILED = "OnInterstitialVideoAdOpenFalied";
    public static final String EVENT_INTERSTITIAL_VIDEO_CLOSED = "OnInterstitialVideoAdClosed";
    public static final String EVENT_INTERSTITIAL_VIDEO_CLICKED = "OnInterstitialVideoAdClicked";

    public RNAdPopcornInterstitialVideoAdModule(ReactApplicationContext context) {
        super(context);
    }

    private Map<String, AdPopcornSSPInterstitialVideoAd> adMap = new HashMap<>();
    @Override
    public String getName(){
        return "RNAdPopcornInterstitialVideoAdModule";
    }

    @ReactMethod
    public void createInstance(String appKey, String placementId) {
        try {
            if (adMap == null) {
                adMap = new HashMap<>();
            }

            if (adMap.containsKey(placementId)) {
                Log.d("AdPopcornSSP", "createInstance already exist interstitialVideoAd placementId : " + placementId);
                adMap.remove(placementId);
            } else {
                Log.d("AdPopcornSSP", "createInstance interstitialVideoAd placementId : " + placementId);
            }
            AdPopcornSSPInterstitialVideoAd interstitialVideoAd = new AdPopcornSSPInterstitialVideoAd(getReactApplicationContext().getCurrentActivity());
            if(appKey != null)
                interstitialVideoAd.setPlacementAppKey(appKey);
            interstitialVideoAd.setPlacementId(placementId);
            adMap.put(placementId, interstitialVideoAd);
        }catch (Exception e){}
    }

    @ReactMethod
    public void loadAd(String placementId) {
        Log.d("AdPopcornSSP", "interstitialVideoAd loadAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }

        AdPopcornSSPInterstitialVideoAd interstitialVideoAd = adMap.get(placementId);
        if(interstitialVideoAd != null) {
            setListener(interstitialVideoAd, placementId);
            interstitialVideoAd.loadAd();
        }
    }

    @ReactMethod
    public void showAd(String placementId) {
        Log.d("AdPopcornSSP", "interstitialVideoAd showAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }
        AdPopcornSSPInterstitialVideoAd interstitialVideoAd = adMap.get(placementId);
        if(interstitialVideoAd != null) {
            setListener(interstitialVideoAd, placementId);
            interstitialVideoAd.showAd();
        }
    }

    private void setListener(AdPopcornSSPInterstitialVideoAd interstitialVideoAd, String placementId){
        interstitialVideoAd.setEventCallbackListener(new IInterstitialVideoAdEventCallbackListener() {
            @Override
            public void OnInterstitialVideoAdLoaded() {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdLoaded : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_LOAD_SUCCESS, event);
            }

            @Override
            public void OnInterstitialVideoAdLoadFailed(SSPErrorCode sspErrorCode) {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdLoadFailed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putInt("errorCode", sspErrorCode.getErrorCode());
                event.putString("errorMessage", sspErrorCode.getErrorMessage());
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_LOAD_FAILED, event);
            }

            @Override
            public void OnInterstitialVideoAdOpened() {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdOpened : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_OPENED, event);
            }

            @Override
            public void OnInterstitialVideoAdOpenFalied() {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdOpenFalied : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_OPEN_FAILED, event);
            }

            @Override
            public void OnInterstitialVideoAdClosed() {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdClosed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_CLOSED, event);
            }

            @Override
            public void OnInterstitialVideoAdClicked() {
                Log.d("AdPopcornSSP", "OnInterstitialVideoAdClicked : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_VIDEO_CLICKED, event);
            }
        });
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        (getReactApplicationContext())
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}