package com.clsk.media.greenp;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adforus.sdk.greenp.v3.GreenpReward;
import com.adforus.sdk.greenp.v3.OfferwallBuilder;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class GreenpModule extends ReactContextBaseJavaModule {

    private ReactApplicationContext reactContext;
    private final Context context;
    private OfferwallBuilder builder = null;
    private Callback callback = null;

    public GreenpModule(@Nullable ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.context = reactContext.getApplicationContext();
    }

    @NonNull
    @Override
    public String getName() {
        return "GreenpModule";
    }
    @ReactMethod
    public void initialized(String appCode, String userId, Callback callback){
        if(this.callback == null) {
            this.callback = callback;
        }
        if(context != null) {
            if(reactContext.getCurrentActivity() == null) {
                GreenpReward.init(context, appCode, userId, new GreenpReward.OnGreenpRewardListener() {
                // 복수의 오퍼월을 게시 하기 위해서는 다음의 코드를 사용해주세요.
                // GreepReward greenpReward = new GreewnpReward();
                // greenpReward.initialize(Context context, String appCode, String appUid, GreenpReward.OnGreenpRewardListener listener);

                    @Override
                    public void onResult(boolean result, String msg) {
                        sendResult(result, msg, appCode);
                    }
                });
            }else {
                GreenpReward.init(reactContext.getCurrentActivity(), appCode, userId, new GreenpReward.OnGreenpRewardListener() {
                // 복수의 오퍼월을 게시 하기 위해서는 다음의 코드를 사용해주세요.
                // GreepReward greenpReward = new GreewnpReward();
                // greenpReward.initialize(Activity activity, String appCode, String appUid, GreenpReward.OnGreenpRewardListener listener);
                    @Override
                    public void onResult(boolean result, String msg) {
                        sendResult(result, msg, appCode);
                    }
                });
            }
        }
    }

    private void sendResult(boolean result, String msg, String appCode) {
        if(this.callback != null ) {
            if(result) {
                builder = GreenpReward.getOfferwallBuilder();
                // 복수의 오퍼월을 게시 하기 위해서는 다음의 코드를 사용해주세요.
                // builder = greenpReward.createOfferwallBuilder();
                if(builder != null) {
                    builder.setAppUniqKey(appCode);
                }
            }
            this.callback.invoke(result, msg);
            this.callback = null;
        }
    }

    @ReactMethod
    public void show(){
        if(builder != null && reactContext.getCurrentActivity() != null){
            builder.showOfferwall(reactContext.getCurrentActivity());
        }
    }
}