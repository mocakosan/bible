package com.clsk.media;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.Configuration;

// 🔥 Gesture Handler import
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
      // 🔥 SplashScreen 표시 (기본 스타일 사용)
      SplashScreen.show(this);
      super.onCreate(savedInstanceState);
  }

  @Override
  protected String getMainComponentName() {
    return "clsk"; // 🔥 올바른 컴포넌트 이름 사용
  }

  /**
   * 🔥 구버전 호환 ReactActivityDelegate 사용
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName()) {

        // 🔥 Gesture Handler 지원을 위한 ReactRootView 오버라이드
        @Override
        protected ReactRootView createRootView() {
            ReactRootView rootView = new RNGestureHandlerEnabledRootView(MainActivity.this);
            return rootView;
        }
    };
  }

  /**
   * TrackPlayer와 백그라운드 재생을 위한 추가 설정
   */
  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    Intent intent = new Intent("onConfigurationChanged");
    intent.putExtra("newConfig", newConfig);
    this.sendBroadcast(intent);
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
  }

  /**
   * Intent 처리 (딥링크, 미디어 버튼 등)
   */
  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}