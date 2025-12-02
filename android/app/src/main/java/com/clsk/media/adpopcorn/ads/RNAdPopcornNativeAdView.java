package com.clsk.media.adpopcorn.ads;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Point;
import android.os.Build;
import android.util.Log;
import android.util.TypedValue;
import android.view.Display;
import android.view.ViewGroup;
import android.view.WindowManager;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.view.ReactViewGroup;
import com.igaworks.ssp.SSPErrorCode;
import com.igaworks.ssp.part.custom.AdPopcornSSPReactNativeAd;
import com.igaworks.ssp.part.custom.listener.IReactNativeAdEventCallbackListener;

import static com.clsk.media.adpopcorn.ads.RNAdPopcornNativeAdViewManager.EVENT_NATIVE_CLICKED;
import static com.clsk.media.adpopcorn.ads.RNAdPopcornNativeAdViewManager.EVENT_NATIVE_IMPRESSION;
import static com.clsk.media.adpopcorn.ads.RNAdPopcornNativeAdViewManager.EVENT_NATIVE_LOAD_FAILED;
import static com.clsk.media.adpopcorn.ads.RNAdPopcornNativeAdViewManager.EVENT_NATIVE_LOAD_SUCCESS;

public class RNAdPopcornNativeAdView extends ReactViewGroup implements IReactNativeAdEventCallbackListener {
    private Activity activity;
    private AdPopcornSSPReactNativeAd adPopcornSSPReactNativeAd;
    private String appKey;
    private String placementId;
    private int nativeWidth = -1;
    private int nativeHeight = -1;

    public RNAdPopcornNativeAdView(Context context, Activity activity) {
        super(context);
        this.activity = activity;
        initReactNativeAdView();
    }

    private void initReactNativeAdView() {
        try {
            adPopcornSSPReactNativeAd = new AdPopcornSSPReactNativeAd(activity);
            adPopcornSSPReactNativeAd.setReactNativeAdEventCallbackListener(this);
            addView(adPopcornSSPReactNativeAd);
        }catch (Exception e){}
    }

    public void setAppKey(String appKey) {
        this.appKey = appKey;
        if(adPopcornSSPReactNativeAd != null)
            adPopcornSSPReactNativeAd.setPlacementAppKey(appKey);
        internalLoadAd();
    }

    public void setPlacementId(String placementId) {
        this.placementId = placementId;
        internalLoadAd();
    }

    public void setWidth(int width) {
        this.nativeWidth = DpToPxInt(getContext(), width);
        internalLoadAd();
    }

    public void setHeight(int height) {
        this.nativeHeight = DpToPxInt(getContext(), height);
        internalLoadAd();
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        Log.d("AdPopcornSSP", "onMeasure");
    }

    @Override
    public void requestLayout() {
        super.requestLayout();
        Log.d("AdPopcornSSP", "requestLayout");
        post(measureAndLayout);
    }

    private Runnable measureAndLayout = new Runnable() {
        @Override
        public void run() {
            try {
                if (adPopcornSSPReactNativeAd != null) {
                    adPopcornSSPReactNativeAd.measure(
                            MeasureSpec.makeMeasureSpec(nativeWidth, MeasureSpec.EXACTLY),
                            MeasureSpec.makeMeasureSpec(nativeHeight, MeasureSpec.EXACTLY));
                    adPopcornSSPReactNativeAd.layout(adPopcornSSPReactNativeAd.getLeft(), adPopcornSSPReactNativeAd.getTop(), nativeWidth, nativeHeight);
                }
            }catch (Exception e){}
        }
    };

    public void internalLoadAd() {
        try {
            if (appKey == null || placementId == null || nativeWidth == -1 || nativeHeight == -1) {
                return;
            }
            Log.d("AdPopcornSSP", "loadAd : nativeWidth : " + nativeWidth + ", nativeHeight : " + nativeHeight);
            if(adPopcornSSPReactNativeAd != null){
                adPopcornSSPReactNativeAd.setLayoutParams(new ViewGroup.LayoutParams(nativeWidth, nativeHeight));
                adPopcornSSPReactNativeAd.setPlacementId(placementId);
                adPopcornSSPReactNativeAd.setReactNativeWidth(nativeWidth);
                adPopcornSSPReactNativeAd.setReactNativeHeight(nativeHeight);
                adPopcornSSPReactNativeAd.loadAd();
            }
            else{
                WritableMap event = Arguments.createMap();
                event.putInt("errorCode", 1000);
                event.putString("errorMessage", "reactNativeAdView is not created.");
                event.putString("placementId", placementId);
                sendEvent(EVENT_NATIVE_LOAD_FAILED, event);
            }
        }catch (Exception e){}
    }

    public void loadAd(){
        if(adPopcornSSPReactNativeAd != null)
            adPopcornSSPReactNativeAd.loadAd();
    }

    public void destroyAd(){
        if(adPopcornSSPReactNativeAd != null)
            adPopcornSSPReactNativeAd.destroy();
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        ((ThemedReactContext) getContext())
                .getJSModule(RCTEventEmitter.class)
                .receiveEvent(getId(), eventName, params);
    }

    @Override
    public void onReactNativeAdLoadSuccess(int width, int height, int networkNo) {
        Log.d("AdPopcornSSP", "onReactNativeAdLoadSuccess : width : " + width + ", height : " + height);
        try {
            adPopcornSSPReactNativeAd.measure(
                    MeasureSpec.makeMeasureSpec(nativeWidth, MeasureSpec.EXACTLY),
                    MeasureSpec.makeMeasureSpec(nativeHeight, MeasureSpec.EXACTLY));

            adPopcornSSPReactNativeAd.layout(adPopcornSSPReactNativeAd.getLeft() , adPopcornSSPReactNativeAd.getTop(), nativeWidth, nativeHeight);
            WritableMap event = Arguments.createMap();
            event.putString("placementId", placementId);
            sendEvent(EVENT_NATIVE_LOAD_SUCCESS, event);
        }catch (Exception e){}
    }

    @Override
    public void onReactNativeAdLoadFailed(SSPErrorCode sspErrorCode) {
        Log.d("AdPopcornSSP", "onReactNativeAdLoadFailed");
        try {
            WritableMap event = Arguments.createMap();
            event.putInt("errorCode", sspErrorCode.getErrorCode());
            event.putString("errorMessage", sspErrorCode.getErrorMessage());
            event.putString("placementId", placementId);
            sendEvent(EVENT_NATIVE_LOAD_FAILED, event);
        }catch (Exception e){}
    }

    @Override
    public void onImpression() {
        Log.d("AdPopcornSSP", "onImpression");
        try {
            WritableMap event = Arguments.createMap();
            event.putString("placementId", placementId);
            sendEvent(EVENT_NATIVE_IMPRESSION, event);
        }catch (Exception e){}
    }

    @Override
    public void onClicked() {
        Log.d("AdPopcornSSP", "onClicked");
        try {
            WritableMap event = Arguments.createMap();
            event.putString("placementId", placementId);
            sendEvent(EVENT_NATIVE_CLICKED, event);
        }catch (Exception e){}
    }

    public int DpToPxInt(Context context, int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics());
    }
}