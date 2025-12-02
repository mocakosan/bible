package com.clsk.media.adpopcorn.ads;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Point;
import android.os.Build;
import android.util.Log;
import android.util.TypedValue;
import android.view.Display;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.view.ReactViewGroup;
import com.igaworks.ssp.AdSize;
import com.igaworks.ssp.BannerAnimType;
import com.igaworks.ssp.SSPErrorCode;
import com.igaworks.ssp.part.banner.AdPopcornSSPBannerAd;
import com.igaworks.ssp.part.banner.listener.IBannerEventCallbackListener;

import static com.clsk.media.adpopcorn.ads.RNAdPopcornBannerViewManager.EVENT_BANNER_CLICKED;
import static com.clsk.media.adpopcorn.ads.RNAdPopcornBannerViewManager.EVENT_BANNER_LOAD_FAILED;
import static com.clsk.media.adpopcorn.ads.RNAdPopcornBannerViewManager.EVENT_BANNER_LOAD_SUCCESS;

public class RNAdPopcornBannerView extends ReactViewGroup implements IBannerEventCallbackListener {

    private AdPopcornSSPBannerAd adPopcornSSPBannerAd;
    private String mAdSize;
    private String appKey;
    private String placementId;
    private int bannerWidth = 0;
    private int bannerHeight = 0;
    private boolean checkLayout = true;

    public RNAdPopcornBannerView(Context context) {
        super(context);
        initBannerView();
    }

    private void initBannerView() {
        adPopcornSSPBannerAd = new AdPopcornSSPBannerAd(getContext());
        adPopcornSSPBannerAd.setBannerEventCallbackListener(this);
    }

    public void setAppKey(String appKey) {
        this.appKey = appKey;
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.setPlacementAppKey(appKey);
        internalLoadAd();
    }

    public void setAdSize(String mAdSize) {
        this.mAdSize = mAdSize;
        internalLoadAd();
    }

    public void setPlacementId(String placementId) {
        this.placementId = placementId;
        internalLoadAd();
    }

    public void setRefreshTime(int refreshTime) {
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.setRefreshTime(refreshTime);
    }

    public void setNetworkScheduleTimeout(int timeout){
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.setNetworkScheduleTimeout(timeout);
    }

    public void setAutoBgColor(boolean flag){
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.setAutoBgColor(flag);
    }

    public void setBannerAnimType(String type){
        try {
            if (adPopcornSSPBannerAd != null && type != null) {
                if (type.contentEquals("FADE_IN"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.FADE_IN);
                else if (type.contentEquals("SLIDE_LEFT"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.SLIDE_LEFT);
                else if (type.contentEquals("SLIDE_RIGHT"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.SLIDE_RIGHT);
                else if (type.contentEquals("TOP_SLIDE"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.TOP_SLIDE);
                else if (type.contentEquals("BOTTOM_SLIDE"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.BOTTOM_SLIDE);
                else if (type.contentEquals("CIRCLE"))
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.CIRCLE);
                else
                    adPopcornSSPBannerAd.setBannerAnimType(BannerAnimType.NONE);
            }
        }catch (Exception e){}
    }

    private void internalLoadAd() {
        try {
            if (adPopcornSSPBannerAd == null || appKey == null || mAdSize == null || placementId == null) {
                return;
            }

            adPopcornSSPBannerAd.setPlacementId(placementId);
            if (mAdSize != null) {
                if (mAdSize.contentEquals("320x50")) {
                    adPopcornSSPBannerAd.setAdSize(AdSize.BANNER_320x50);
                    bannerWidth = DpToPxInt(getContext(), 320);
                    bannerHeight = DpToPxInt(getContext(), 50);
                } else if (mAdSize.contentEquals("300x250")) {
                    adPopcornSSPBannerAd.setAdSize(AdSize.BANNER_300x250);
                    bannerWidth = DpToPxInt(getContext(), 300);
                    bannerHeight = DpToPxInt(getContext(), 250);
                } else if (mAdSize.contentEquals("320x100")) {
                    adPopcornSSPBannerAd.setAdSize(AdSize.BANNER_320x100);
                    bannerWidth = DpToPxInt(getContext(), 320);
                    bannerHeight = DpToPxInt(getContext(), 100);
                } else if (mAdSize.contentEquals("AdaptiveSize")) {
                    adPopcornSSPBannerAd.setAdSize(AdSize.BANNER_ADAPTIVE_SIZE);
                    bannerWidth = DpToPxInt(getContext(), 360);
                    bannerHeight = DpToPxInt(getContext(), 185);
                }
            }
            if (adPopcornSSPBannerAd.getParent() == null)
                addView(adPopcornSSPBannerAd);
            adPopcornSSPBannerAd.loadAd();
        }catch (Exception e){}
    }

    public void loadAd() {
        try {
            if (mAdSize == null || placementId == null) {
                return;
            }
            if(adPopcornSSPBannerAd != null)
                adPopcornSSPBannerAd.loadAd();
        }catch (Exception e){}
    }

    public void stopAd(){
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.stopAd();
    }

    public void onResume(){
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.onResume();
    }

    public void onPause(){
        if(adPopcornSSPBannerAd != null)
            adPopcornSSPBannerAd.onPause();
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        /*((ThemedReactContext) getContext())
                //.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                //.emit(eventName, params);*/
        ((ThemedReactContext) getContext())
                .getJSModule(RCTEventEmitter.class)
                .receiveEvent(getId(), eventName, params);
    }

    @Override
    public void OnBannerAdReceiveSuccess() {
        Log.d("AdPopcornSSP", "OnBannerAdReceiveSuccess bannerWidth : " + bannerWidth + ", bannerHeight : " + bannerHeight);
        try {
            adPopcornSSPBannerAd.measure(
                    View.MeasureSpec.makeMeasureSpec(bannerWidth, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(bannerHeight, View.MeasureSpec.EXACTLY));

            if (checkLayout) {
                int viewWidth = getDisplayWidth(getContext());
                if (viewWidth >= bannerWidth)
                    adPopcornSSPBannerAd.layout((viewWidth - bannerWidth) / 2, adPopcornSSPBannerAd.getTop(), viewWidth - ((viewWidth - bannerWidth) / 2), bannerHeight);
                else
                    adPopcornSSPBannerAd.layout(adPopcornSSPBannerAd.getLeft(), adPopcornSSPBannerAd.getTop(), bannerWidth - adPopcornSSPBannerAd.getLeft(), bannerHeight);
                checkLayout = false;
            }

            WritableMap event = Arguments.createMap();
            event.putString("placementId", placementId);
            sendEvent(EVENT_BANNER_LOAD_SUCCESS, event);
        }catch (Exception e){}
    }

    @Override
    public void OnBannerAdReceiveFailed(SSPErrorCode sspErrorCode) {
        Log.d("AdPopcornSSP", "OnBannerAdReceiveFailed : " + sspErrorCode.getErrorMessage());
        try{
            WritableMap event = Arguments.createMap();
            event.putInt("errorCode", sspErrorCode.getErrorCode());
            event.putString("errorMessage", sspErrorCode.getErrorMessage());
            event.putString("placementId", placementId);
            sendEvent(EVENT_BANNER_LOAD_FAILED, event);
        }catch (Exception e){}
    }

    @Override
    public void OnBannerAdClicked() {
        Log.d("AdPopcornSSP", "OnBannerAdClicked");
        try{
            WritableMap event = Arguments.createMap();
            event.putString("placementId", placementId);
            sendEvent(EVENT_BANNER_CLICKED, event);
        } catch (Exception e){}
    }

    public int DpToPxInt(Context context, int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics());
    }

    public static int getDisplayWidth(Context context) {
        int width = 0;

        try {
            Display display = ((WindowManager) context.getSystemService(Context.WINDOW_SERVICE)).getDefaultDisplay();

            if (Build.VERSION.SDK_INT >= 13) {
                Point size = new Point();
                display.getSize(size);
                width = size.x;
            } else {
                width = display.getWidth();
            }
        } catch (Exception e) {
        }

        return width;
    }
}