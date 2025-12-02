package com.clsk.media.adpopcorn.ads;

import android.graphics.Color;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.igaworks.ssp.SSPErrorCode;
import com.igaworks.ssp.part.interstitial.AdPopcornSSPInterstitialAd;
import com.igaworks.ssp.part.interstitial.listener.IInterstitialEventCallbackListener;

import java.util.HashMap;
import java.util.Map;

public class RNAdPopcornInterstitialAdModule extends ReactContextBaseJavaModule{
    public static final String EVENT_INTERSTITIAL_LOAD_SUCCESS = "OnInterstitialLoaded";
    public static final String EVENT_INTERSTITIAL_LOAD_FAILED = "OnInterstitialReceiveFailed";
    public static final String EVENT_INTERSTITIAL_OPENED = "OnInterstitialOpened";
    public static final String EVENT_INTERSTITIAL_OPEN_FAILED = "OnInterstitialOpenFailed";
    public static final String EVENT_INTERSTITIAL_CLOSED = "OnInterstitialClosed";
    public static final String EVENT_INTERSTITIAL_CLICKED = "OnInterstitialClicked";

    public RNAdPopcornInterstitialAdModule(ReactApplicationContext context) {
        super(context);
    }

    private Map<String, AdPopcornSSPInterstitialAd> adMap = new HashMap<>();
    @Override
    public String getName(){
        return "RNAdPopcornInterstitialAdModule";
    }

    @ReactMethod
    public void createInstance(String appKey, String placementId) {
        try {
            if (adMap == null) {
                adMap = new HashMap<>();
            }

            if (adMap.containsKey(placementId)) {
                Log.d("AdPopcornSSP", "createInstance already exist interstitialAd placementId : " + placementId);
                adMap.remove(placementId);
            } else {
                Log.d("AdPopcornSSP", "createInstance interstitialAd placementId : " + placementId);
            }
            AdPopcornSSPInterstitialAd interstitialAd = new AdPopcornSSPInterstitialAd(getReactApplicationContext().getCurrentActivity());
            if(appKey != null)
                interstitialAd.setPlacementAppKey(appKey);
            interstitialAd.setPlacementId(placementId);
            adMap.put(placementId, interstitialAd);
        }catch (Exception e){}
    }

    @ReactMethod
    public void loadAd(String placementId) {
        Log.d("AdPopcornSSP", "interstitialAd loadAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }

        AdPopcornSSPInterstitialAd interstitialAd = adMap.get(placementId);
        setListener(interstitialAd, placementId);
        interstitialAd.loadAd();
    }

    @ReactMethod
    public void showAd(String placementId) {
        Log.d("AdPopcornSSP", "interstitialAd showAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }
        AdPopcornSSPInterstitialAd interstitialAd = adMap.get(placementId);
        if(interstitialAd != null) {
            setListener(interstitialAd, placementId);
            interstitialAd.showAd();
        }
    }

    @ReactMethod
    public void setAdPopcornAdBackgroundColor(String placementId, String color) {
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }
        AdPopcornSSPInterstitialAd interstitialAd = adMap.get(placementId);
        if(interstitialAd != null) {
            HashMap extras = new HashMap<>();
            extras.put(AdPopcornSSPInterstitialAd.CustomExtraData.APSSP_AD_BACKGROUND_COLOR, Color.parseColor(color));
            Log.d("AdPopcornSSP", "interstitialAd setAdPopcornAdBackgroundColor : " + placementId + ", color : " + color);
            interstitialAd.setCustomExtras(extras);
        }
    }

    private void setListener(AdPopcornSSPInterstitialAd interstitialAd, String placementId){
        interstitialAd.setInterstitialEventCallbackListener(new IInterstitialEventCallbackListener() {
            @Override
            public void OnInterstitialLoaded() {
                Log.d("AdPopcornSSP", "OnInterstitialLoaded : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_LOAD_SUCCESS, event);
            }

            @Override
            public void OnInterstitialReceiveFailed(SSPErrorCode sspErrorCode) {
                Log.d("AdPopcornSSP", "OnInterstitialReceiveFailed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putInt("errorCode", sspErrorCode.getErrorCode());
                event.putString("errorMessage", sspErrorCode.getErrorMessage());
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_LOAD_FAILED, event);
            }

            @Override
            public void OnInterstitialOpened() {
                Log.d("AdPopcornSSP", "OnInterstitialOpened : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_OPENED, event);
            }

            @Override
            public void OnInterstitialOpenFailed(SSPErrorCode sspErrorCode) {
                Log.d("AdPopcornSSP", "OnInterstitialOpenFailed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putInt("errorCode", sspErrorCode.getErrorCode());
                event.putString("errorMessage", sspErrorCode.getErrorMessage());
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_OPEN_FAILED, event);
            }

            @Override
            public void OnInterstitialClosed(int closeEventType) {
                Log.d("AdPopcornSSP", "OnInterstitialClosed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_CLOSED, event);
            }

            @Override
            public void OnInterstitialClicked() {
                Log.d("AdPopcornSSP", "OnInterstitialClicked : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_INTERSTITIAL_CLICKED, event);
            }
        });
    }
    private void sendEvent(String eventName, @Nullable WritableMap params) {
        (getReactApplicationContext())
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}