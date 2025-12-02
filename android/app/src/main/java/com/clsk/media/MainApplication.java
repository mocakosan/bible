package com.clsk.media;

import android.app.Application;
import androidx.multidex.MultiDex;
import androidx.multidex.MultiDexApplication;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.buzzvil.buzzbenefit.BuzzBenefitConfig;
import com.buzzvil.sdk.BuzzvilSdk;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import com.hotupdater.HotUpdater;

import java.util.List;

import org.pgsqlite.SQLitePluginPackage;
import com.github.wumke.RNExitApp.RNExitAppPackage;
import com.clsk.media.adpopcorn.RNAdPopcornSSPPackage;
import com.clsk.media.greenp.GreenpPackage;
import com.clsk.media.adpopcorn.RNAdPopcornRewardPackage;
import com.clsk.media.ReactWrapperPackage;
import com.clsk.media.SettingsModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Arrays;
import java.util.Collections;

public class MainApplication extends MultiDexApplication implements ReactApplication {

    private final ReactNativeHost mReactNativeHost =
        new DefaultReactNativeHost(this) {
            @Override
            public boolean getUseDeveloperSupport() {
                return BuildConfig.DEBUG;
            }

            @Override
            protected List<ReactPackage> getPackages() {
                @SuppressWarnings("UnnecessaryLocalVariable")
                List<ReactPackage> packages = new PackageList(this).getPackages();
                new RNExitAppPackage();
                packages.add(new RNAdPopcornSSPPackage());
                packages.add(new GreenpPackage());
                packages.add(new RNAdPopcornRewardPackage());
                packages.add(new ReactWrapperPackage());
                packages.add(new MottoWebPackage());
                packages.add(new BuzzvilPackage());
                packages.add(new ReactPackage() {
                    @Override
                    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
                        return Arrays.<NativeModule>asList(new SettingsModule(reactContext));
                    }

                    @Override
                    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
                        return Collections.emptyList();
                    }
                });
                return packages;
            }

            @Override
            protected String getJSMainModuleName() {
                return "index";
            }

            @Override
            protected String getJSBundleFile() {
                return HotUpdater.Companion.getJSBundleFile(this.getApplication().getApplicationContext());
            }

            @Override
            protected boolean isNewArchEnabled() {
                return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
            }

            @Override
            protected Boolean isHermesEnabled() {
                return BuildConfig.IS_HERMES_ENABLED;
            }
        };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        MultiDex.install(this);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        initializeTrackPlayerEnvironment();
        initializeBuzzvilSdk();

        if (BuildConfig.DEBUG) {
            checkBuzzvilSdkApi();
        }

        SoLoader.init(this, /* native exopackage */ false);
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load();
        }
        ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }

    private void initializeTrackPlayerEnvironment() {
        try {
            Log.d("MainApplication", "TrackPlayer 환경 초기화 시작");
            Log.d("MainApplication", "TrackPlayer 환경 초기화 완료");
        } catch (Exception e) {
            Log.e("MainApplication", "TrackPlayer 환경 초기화 중 오류", e);
        }
    }

    private void initializeBuzzvilSdk() {
        try {
            Log.d("MainApplication", "Buzzvil SDK 초기화 시작");

            String appId = "177038632787380";

            BuzzBenefitConfig buzzBenefitConfig = new BuzzBenefitConfig.Builder(appId)
                    .build();

            BuzzvilSdk.initialize(this, buzzBenefitConfig, new kotlin.jvm.functions.Function0<kotlin.Unit>() {
                @Override
                public kotlin.Unit invoke() {
                    Log.d("MainApplication", "Buzzvil SDK 초기화 콜백 완료");
                    return kotlin.Unit.INSTANCE;
                }
            });

            Log.d("MainApplication", "Buzzvil SDK 초기화 성공");

        } catch (Exception e) {
            Log.e("MainApplication", "Buzzvil SDK 초기화 중 예외 발생", e);
        }
    }

    private void checkBuzzvilSdkApi() {
        try {
            Class<?> buzzvilSdkClass = Class.forName("com.buzzvil.sdk.BuzzvilSdk");
            Log.d("BuzzvilAPI", "=== BuzzvilSdk 메소드들 ===");

            java.lang.reflect.Method[] methods = buzzvilSdkClass.getDeclaredMethods();
            for (java.lang.reflect.Method method : methods) {
                Log.d("BuzzvilAPI", "메소드: " + method.getName() + " - " + method.toString());
            }

            Class<?> userClass = Class.forName("com.buzzvil.sdk.BuzzvilSdkUser");
            Log.d("BuzzvilAPI", "=== BuzzvilSdkUser 생성자들 ===");

            java.lang.reflect.Constructor<?>[] constructors = userClass.getDeclaredConstructors();
            for (java.lang.reflect.Constructor<?> constructor : constructors) {
                Log.d("BuzzvilAPI", "생성자: " + constructor.toString());
            }

            Class<?> configClass = Class.forName("com.buzzvil.buzzbenefit.BuzzBenefitConfig");
            Log.d("BuzzvilAPI", "=== BuzzBenefitConfig 확인 ===");
            Log.d("BuzzvilAPI", "Config 클래스: " + configClass.toString());

        } catch (Exception e) {
            Log.e("BuzzvilAPI", "API 확인 중 오류", e);
        }
    }

    @Override
    public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter) {
        if (BuildConfig.DEBUG && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return super.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        }
        return super.registerReceiver(receiver, filter);
    }

    @Override
    public void onTerminate() {
        super.onTerminate();
        Log.d("MainApplication", "앱 종료 - 백그라운드 서비스 정리");
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        Log.w("MainApplication", "메모리 부족 상황 감지");
    }
}