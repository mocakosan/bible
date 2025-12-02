package com.clsk.media;

import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class MottoWebModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public MottoWebModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "MottoWeb";
    }

    @ReactMethod
    public void openMottoWeb(String pubKey, String uid, String adId, Promise promise) {
        try {
            Intent intent = new Intent(reactContext, MottoWebActivity.class);
            intent.putExtra("pubKey", pubKey);
            intent.putExtra("uid", uid);
            intent.putExtra("adId", adId);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}