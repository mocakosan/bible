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
import com.igaworks.ssp.part.video.AdPopcornSSPRewardVideoAd;
import com.igaworks.ssp.part.video.listener.IRewardVideoAdEventCallbackListener;

import java.util.HashMap;
import java.util.Map;

public class RNAdPopcornRewardVideoAdModule extends ReactContextBaseJavaModule {
    public static final String EVENT_REWARD_VIDEO_LOAD_SUCCESS = "OnRewardVideoAdLoaded";
    public static final String EVENT_REWARD_VIDEO_LOAD_FAILED = "OnRewardVideoAdLoadFailed";
    public static final String EVENT_REWARD_VIDEO_OPENED = "OnRewardVideoAdOpened";
    public static final String EVENT_REWARD_VIDEO_OPEN_FAILED = "OnRewardVideoAdOpenFalied";
    public static final String EVENT_REWARD_VIDEO_CLOSED = "OnRewardVideoAdClosed";
    public static final String EVENT_REWARD_VIDEO_CLICKED = "OnRewardVideoAdClicked";
    public static final String EVENT_REWARD_VIDEO_COMPLETED = "OnRewardVideoPlayCompleted";
    public static final String EVENT_REWARD_PLUS_COMPLETED = "OnRewardPlusCompleted";
    public RNAdPopcornRewardVideoAdModule(ReactApplicationContext context) {
        super(context);
    }

    private Map<String, AdPopcornSSPRewardVideoAd> adMap = new HashMap<>();
    @Override
    public String getName(){
        return "RNAdPopcornRewardVideoAdModule";
    }

    @ReactMethod
    public void createInstance(String appKey, String placementId) {
        try {
            if (adMap == null) {
                adMap = new HashMap<>();
            }

            if (adMap.containsKey(placementId)) {
                Log.d("AdPopcornSSP", "createInstance already exist rewardVideoAd placementId : " + placementId);
                adMap.remove(placementId);
            } else {
                Log.d("AdPopcornSSP", "createInstance rewardVideoAd placementId : " + placementId);
            }
            AdPopcornSSPRewardVideoAd rewardVideoAd = new AdPopcornSSPRewardVideoAd(getReactApplicationContext().getCurrentActivity());
            if(appKey != null)
                rewardVideoAd.setPlacementAppKey(appKey);
            rewardVideoAd.setPlacementId(placementId);
            adMap.put(placementId, rewardVideoAd);
        }catch (Exception e){}
    }

    @ReactMethod
    public void loadAd(String placementId) {
        Log.d("AdPopcornSSP", "rewardVideoAd loadAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }

        AdPopcornSSPRewardVideoAd rewardVideoAd = adMap.get(placementId);
        if(rewardVideoAd != null) {
            setEventListener(rewardVideoAd, placementId);
            rewardVideoAd.loadAd();
        }
    }

    @ReactMethod
    public void showAd(String placementId) {
        Log.d("AdPopcornSSP", "rewardVideoAd showAd : " + placementId);
        if(adMap == null || !adMap.containsKey(placementId)){
            return;
        }
        AdPopcornSSPRewardVideoAd rewardVideoAd = adMap.get(placementId);
        if(rewardVideoAd != null) {
            setEventListener(rewardVideoAd, placementId);
            rewardVideoAd.showAd();
        }
    }

    private void setEventListener(AdPopcornSSPRewardVideoAd rewardVideoAd, String placementId){
        rewardVideoAd.setRewardVideoAdEventCallbackListener(new IRewardVideoAdEventCallbackListener() {
            @Override
            public void OnRewardVideoAdLoaded() {
                Log.d("AdPopcornSSP", "OnRewardVideoAdLoaded : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_REWARD_VIDEO_LOAD_SUCCESS, event);
            }

            @Override
            public void OnRewardVideoAdLoadFailed(SSPErrorCode sspErrorCode) {
                Log.d("AdPopcornSSP", "OnRewardVideoAdLoadFailed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putInt("errorCode", sspErrorCode.getErrorCode());
                event.putString("errorMessage", sspErrorCode.getErrorMessage());
                sendEvent(EVENT_REWARD_VIDEO_LOAD_FAILED, event);
            }

            @Override
            public void OnRewardVideoAdOpened() {
                Log.d("AdPopcornSSP", "OnRewardVideoAdOpened : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_REWARD_VIDEO_OPENED, event);
            }

            @Override
            public void OnRewardVideoAdOpenFalied() {
                Log.d("AdPopcornSSP", "OnRewardVideoAdOpenFalied : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_REWARD_VIDEO_OPEN_FAILED, event);
            }

            @Override
            public void OnRewardVideoAdClosed() {
                Log.d("AdPopcornSSP", "OnRewardVideoAdClosed : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_REWARD_VIDEO_CLOSED, event);
            }

            @Override
            public void OnRewardVideoPlayCompleted(int adNetworkNo, boolean completed) {
                Log.d("AdPopcornSSP", "OnRewardVideoPlayCompleted : " + placementId);
                if(completed) {
                    WritableMap event = Arguments.createMap();
                    event.putString("placementId", placementId);
                    sendEvent(EVENT_REWARD_VIDEO_COMPLETED, event);
                }
            }

            @Override
            public void OnRewardVideoAdClicked() {
                Log.d("AdPopcornSSP", "OnRewardVideoAdClicked : " + placementId);
                WritableMap event = Arguments.createMap();
                event.putString("placementId", placementId);
                sendEvent(EVENT_REWARD_VIDEO_CLICKED, event);
            }

            @Override
            public void OnRewardPlusCompleted(boolean result, int resultCode, int reward) {
                Log.d("AdPopcornSSP", "OnRewardPlusCompleted");
                if(result){
                    WritableMap event = Arguments.createMap();
                    event.putInt("resultCode", resultCode);
                    event.putInt("reward", reward);
                    sendEvent(EVENT_REWARD_PLUS_COMPLETED, event);
                }
            }
        });
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        (getReactApplicationContext())
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}