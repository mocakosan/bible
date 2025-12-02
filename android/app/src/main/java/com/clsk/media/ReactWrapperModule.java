package com.clsk.media;

import android.util.Log;
import android.widget.Toast;
import androidx.fragment.app.FragmentActivity;
import com.facebook.react.ReactActivity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.tnkfactory.ad.TnkOfferwall;
import com.tnkfactory.ad.TnkSession;

public class ReactWrapperModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    ReactWrapperModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    private TnkOfferwall getOfferwall() {
        return new TnkOfferwall((FragmentActivity) getCurrentActivity());
    }

    @Override
    public String getName() {
        return "ReactWrapperModule";
    }

    @ReactMethod
    public void showToast(String message, int number) {
        Toast.makeText(reactContext, "MSG: " + message + " / " + number, Toast.LENGTH_SHORT).show();
    }

    @ReactMethod
    public void setUserName(String userName) {
        getOfferwall().setUserName(userName);
    }

    @ReactMethod
    public void setCoppa(int coppa) {
        if (coppa == 0) {
            getOfferwall().setCOPPA(false);
        } else {
            getOfferwall().setCOPPA(true);
        }
    }

    @ReactMethod
    public void showAttPopup() {
        Log.d("tnk_ad", "need only ios");
    }

    @ReactMethod
    public void showOfferwallWithAtt() {
        showOfferwall();
    }

    @ReactMethod
    public void showOfferwall() {
        // React Native의 UI 스레드에서 실행
        reactContext.runOnUiQueueThread(() -> {
            getOfferwall().startOfferwallActivity((ReactActivity) reactContext.getCurrentActivity());
        });
    }
}