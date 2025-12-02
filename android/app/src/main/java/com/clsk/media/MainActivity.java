package com.clsk.media;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.pm.ActivityInfo;
import android.provider.Settings;
import android.database.ContentObserver;
import android.os.Handler;

import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  private RotationSettingObserver rotationObserver;

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
      // react-native-screens 라이브러리 충돌 방지
      // savedInstanceState를 null로 전달하여 Fragment 복원을 방지
      super.onCreate(null);
      SplashScreen.show(this);

      // 화면 회전 설정 초기화
      checkAndSetScreenOrientation();

      // 시스템 설정 변경 감지 시작
      rotationObserver = new RotationSettingObserver(new Handler());
      getContentResolver().registerContentObserver(
          Settings.System.getUriFor(Settings.System.ACCELEROMETER_ROTATION),
          false,
          rotationObserver
      );
  }

  @Override
  protected String getMainComponentName() {
    return "media";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled(), // fabricEnabled
        // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
        DefaultNewArchitectureEntryPoint.getConcurrentReactEnabled() // concurrentRootEnabled
        );
  }

  /**
   * TrackPlayer와 백그라운드 재생을 위한 추가 설정
   */
  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
  }

  /**
   * 앱이 백그라운드로 이동할 때 처리
   */
  @Override
  protected void onPause() {
    super.onPause();
    // 백그라운드에서 일시적으로 재생 유지
  }

  /**
   * 앱이 포그라운드로 돌아올 때 처리
   */
  @Override
  protected void onResume() {
    super.onResume();
    // 포그라운드 복귀 시 처리

    // 화면 회전 설정 다시 확인
    checkAndSetScreenOrientation();
  }

  /**
   * Intent 처리 (딥링크, 미디어 버튼 등)
   */
  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }

  /**
   * Activity 종료 시 Observer 해제
   */
  @Override
  protected void onDestroy() {
    super.onDestroy();
    if (rotationObserver != null) {
      getContentResolver().unregisterContentObserver(rotationObserver);
    }
  }

  /**
   * 시스템의 화면 회전 설정을 확인하고 적용
   */
  private void checkAndSetScreenOrientation() {
    try {
      // 시스템 설정에서 화면 자동 회전이 활성화되어 있는지 확인
      // Settings.System.getInt는 SettingNotFoundException를 던지지 않음
      // 대신 기본값을 제공하는 오버로드 메서드 사용
      int rotationEnabled = Settings.System.getInt(
          getContentResolver(),
          Settings.System.ACCELEROMETER_ROTATION,
          0  // 기본값: 0 (회전 비활성화)
      );

      if (rotationEnabled == 1) {
        // 자동 회전이 켜져 있으면 센서에 따라 회전 허용
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR);
      } else {
        // 자동 회전이 꺼져 있으면 세로 모드로 고정
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
      }
    } catch (Exception e) {
      // 예상치 못한 오류 처리
      e.printStackTrace();
      // 오류 발생 시 기본값으로 세로 고정
      setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }
  }

  /**
   * 시스템 설정 변경을 감지하는 Observer 클래스
   */
  private class RotationSettingObserver extends ContentObserver {

    public RotationSettingObserver(Handler handler) {
      super(handler);
    }

    @Override
    public void onChange(boolean selfChange) {
      super.onChange(selfChange);
      // 설정이 변경되면 화면 방향 설정을 다시 적용
      checkAndSetScreenOrientation();
    }
  }
}