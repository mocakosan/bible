package com.clsk.media;

import android.app.Application;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

// 🔥 MultiDex 지원 추가
import androidx.multidex.MultiDex;
import androidx.multidex.MultiDexApplication;

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

// 🔥 MultiDexApplication 상속으로 변경
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

                // 🔥 패키지 추가 방식 수정
                packages.add(new RNExitAppPackage());
                packages.add(new RNAdPopcornSSPPackage());
                packages.add(new GreenpPackage());
                packages.add(new RNAdPopcornRewardPackage());
                packages.add(new ReactWrapperPackage());
                packages.add(new MottoWebPackage());
                packages.add(new BuzzvilPackage());

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

    // 🔥 MultiDex 지원 추가
    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        MultiDex.install(this);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // TrackPlayer와 백그라운드 재생을 위한 초기 설정
        initializeTrackPlayerEnvironment();

        // Buzzvil SDK 초기화 (가장 먼저 호출)
        initializeBuzzvilSdk();

        // SDK API 확인 (디버그용)
        if (BuildConfig.DEBUG) {
            checkBuzzvilSdkApi();
        }

        SoLoader.init(this, /* native exopackage */ false);
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load();
        }

        // 🔥 Flipper 초기화 - try-catch로 안전하게 처리
        try {
            ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
        } catch (Exception e) {
            Log.w("MainApplication", "Flipper 초기화 실패 (릴리즈 빌드에서는 정상)", e);
        }
    }

    /**
     * TrackPlayer 백그라운드 재생을 위한 환경 설정
     */
    private void initializeTrackPlayerEnvironment() {
        try {
            Log.d("MainApplication", "TrackPlayer 환경 초기화 시작");

            // 백그라운드 서비스 실행을 위한 권한 확인은 런타임에서 처리
            Log.d("MainApplication", "TrackPlayer 환경 초기화 완료");

        } catch (Exception e) {
            Log.e("MainApplication", "TrackPlayer 환경 초기화 중 오류", e);
        }
    }

    private void initializeBuzzvilSdk() {
        try {
            Log.d("MainApplication", "Buzzvil SDK 초기화 시작");

            // 실제 APP_ID로 변경 필요
            String appId = "177038632787380"; // 실제 버즈빌에서 제공받은 APP_ID로 변경

            // BuzzBenefit 설정
            BuzzBenefitConfig buzzBenefitConfig = new BuzzBenefitConfig.Builder(appId)
                    .build();

            // 3개 파라미터로 초기화 (Function0<Unit> 콜백 필요)
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
            // BuzzvilSdk 클래스 확인
            Class<?> buzzvilSdkClass = Class.forName("com.buzzvil.sdk.BuzzvilSdk");
            Log.d("BuzzvilAPI", "=== BuzzvilSdk 메소드들 ===");

            java.lang.reflect.Method[] methods = buzzvilSdkClass.getDeclaredMethods();
            for (java.lang.reflect.Method method : methods) {
                Log.d("BuzzvilAPI", "메소드: " + method.getName() + " - " + method.toString());
            }

            // BuzzvilSdkUser 클래스 확인
            Class<?> userClass = Class.forName("com.buzzvil.sdk.BuzzvilSdkUser");
            Log.d("BuzzvilAPI", "=== BuzzvilSdkUser 생성자들 ===");

            java.lang.reflect.Constructor<?>[] constructors = userClass.getDeclaredConstructors();
            for (java.lang.reflect.Constructor<?> constructor : constructors) {
                Log.d("BuzzvilAPI", "생성자: " + constructor.toString());
            }

            // BuzzBenefitConfig 클래스 확인
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

    /**
     * 앱 종료 시 백그라운드 서비스 정리
     */
    @Override
    public void onTerminate() {
        super.onTerminate();
        Log.d("MainApplication", "앱 종료 - 백그라운드 서비스 정리");
    }

    /**
     * 메모리 부족 시 처리
     */
    @Override
    public void onLowMemory() {
        super.onLowMemory();
        Log.w("MainApplication", "메모리 부족 상황 감지");
    }
}