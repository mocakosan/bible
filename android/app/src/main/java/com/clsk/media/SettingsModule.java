package com.clsk.media; // 앱의 패키지명으로 변경

import android.content.Intent;
import android.content.ComponentName;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import java.util.List;

public class SettingsModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    public SettingsModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "SettingsModule";
    }

    @ReactMethod
    public void openGoogleSettings(Promise promise) {
        try {
            // 방법 1: 안드로이드 설정 앱의 Google 메뉴로 직접 이동
            Intent googleSettingsIntent = new Intent();
            googleSettingsIntent.setAction("android.settings.GOOGLE_SETTINGS");
            googleSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (isIntentAvailable(googleSettingsIntent)) {
                reactContext.startActivity(googleSettingsIntent);
                promise.resolve("Android Settings Google menu opened");
                return;
            }

            // 방법 2: Google 설정 Component 직접 접근 (설정 앱 내부)
            googleSettingsIntent = new Intent();
            googleSettingsIntent.setClassName("com.android.settings", "com.android.settings.accounts.AccountSettings");
            googleSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (isIntentAvailable(googleSettingsIntent)) {
                reactContext.startActivity(googleSettingsIntent);
                promise.resolve("Android Settings Accounts opened");
                return;
            }

            // 방법 3: 계정 설정 (Google 계정이 보이는 곳)
            googleSettingsIntent = new Intent();
            googleSettingsIntent.setAction("android.settings.SYNC_SETTINGS");
            googleSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (isIntentAvailable(googleSettingsIntent)) {
                reactContext.startActivity(googleSettingsIntent);
                promise.resolve("Android Settings Sync opened");
                return;
            }

            // 방법 4: 사용자 및 계정 설정
            googleSettingsIntent = new Intent();
            googleSettingsIntent.setAction("android.settings.USER_SETTINGS");
            googleSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (isIntentAvailable(googleSettingsIntent)) {
                reactContext.startActivity(googleSettingsIntent);
                promise.resolve("Android Settings Users opened");
                return;
            }

            // 방법 5: 개인정보보호 설정 (Google 관련 항목들 포함)
            googleSettingsIntent = new Intent();
            googleSettingsIntent.setAction("android.settings.PRIVACY_SETTINGS");
            googleSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (isIntentAvailable(googleSettingsIntent)) {
                reactContext.startActivity(googleSettingsIntent);
                promise.resolve("Android Settings Privacy opened");
                return;
            }

            // 최종 fallback: 일반 설정에서 사용자가 직접 Google을 찾도록
            Intent settingsIntent = new Intent(Settings.ACTION_SETTINGS);
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(settingsIntent);
            promise.resolve("Android Settings main opened - please find Google manually");

        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open Google settings in Android Settings app", e);
        }
    }

    @ReactMethod
    public void openAndroidGoogleMenu(Promise promise) {
        try {
            // 안드로이드 설정 앱의 Google 메뉴를 찾는 다양한 방법들

            // 방법 1: 직접적인 Google 설정 액션
            Intent intent = new Intent("android.settings.GOOGLE_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (isIntentAvailable(intent)) {
                reactContext.startActivity(intent);
                promise.resolve("Google settings via GOOGLE_SETTINGS action");
                return;
            }

            // 방법 2: 설정 앱의 계정 섹션 (Google 계정이 여기에 있음)
            intent = new Intent();
            intent.setClassName("com.android.settings", "com.android.settings.accounts.AccountDashboardActivity");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (isIntentAvailable(intent)) {
                reactContext.startActivity(intent);
                promise.resolve("Account dashboard opened");
                return;
            }


            // 최종: 일반 설정
            intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Main settings opened");

        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open Android Google menu", e);
        }
    }

    @ReactMethod
    public void openPrivacySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_PRIVACY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Privacy settings opened");
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open privacy settings", e);
        }
    }

    @ReactMethod
    public void openAccountSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_SYNC_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Account settings opened");
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open account settings", e);
        }
    }

    @ReactMethod
    public void openSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Settings opened");
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open settings", e);
        }
    }

    @ReactMethod
    public void openSecuritySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve("Security settings opened");
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open security settings", e);
        }
    }

    // Intent가 사용 가능한지 확인하는 헬퍼 메서드
    private boolean isIntentAvailable(Intent intent) {
        PackageManager packageManager = reactContext.getPackageManager();
        List<ResolveInfo> list = packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
        return list.size() > 0;
    }
}