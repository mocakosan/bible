package com.clsk.media.adpopcorn;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.igaworks.ssp.AdPopcornSSP;
import com.igaworks.ssp.SdkInitListener;

public class RNAdPopcornSSPModule extends ReactContextBaseJavaModule {

    public RNAdPopcornSSPModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName(){
        return "RNAdPopcornSSPModule";
    }

    @ReactMethod
    public void init(String appKey) {
        Log.d("RNAdPopcornSSPModule", "init : " + appKey);
        ReactApplicationContext context = getReactApplicationContext();
        AdPopcornSSP.init((Context) context, appKey, new SdkInitListener() {
            @Override
            public void onInitializationFinished() {
                (getReactApplicationContext())
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("OnAdPopcornSSPSDKDidInitialize", null);
            }
        });
    }

    @ReactMethod
    public void setUserId(String userId) {
        Log.d("RNAdPopcornSSPModule", "setUserId : " + userId);
        ReactApplicationContext context = getReactApplicationContext();
        AdPopcornSSP.setUserId(context, userId);
    }
}