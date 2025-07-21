# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ============================================================================
# 🔥 React Native 핵심 유지
# ============================================================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# React Native 모듈 유지
-keep class * extends com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.ReactMethod { *; }

# ============================================================================
# 🔥 Android 핵심 컴포넌트 유지 (ClassNotFoundException 해결)
# ============================================================================
-keep public class * extends android.content.BroadcastReceiver {
    public <init>(...);
    public void onReceive(android.content.Context, android.content.Intent);
}
-keep public class * extends android.app.Service {
    public <init>(...);
}
-keep public class * extends android.content.ContentProvider {
    public <init>(...);
}
-keep public class * extends android.app.Application {
    public <init>(...);
}

# ============================================================================
# 🔥 TrackPlayer 관련 설정 (음악 재생 서비스)
# ============================================================================
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep class com.doublesymmetry.trackplayer.service.** { *; }
-keep interface com.doublesymmetry.trackplayer.** { *; }
-dontwarn com.doublesymmetry.trackplayer.**

# ExoPlayer 관련 설정 (TrackPlayer가 사용)
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# Android Media 관련 설정
-keep class androidx.media.** { *; }
-keep class androidx.media3.** { *; }
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.session.** { *; }
-dontwarn androidx.media.**
-dontwarn androidx.media3.**
-dontwarn android.support.v4.media.**
-dontwarn androidx.media.session.**

# 알림 관련 설정
-keep class * extends androidx.core.app.NotificationCompat.** { *; }

# ============================================================================
# 🔥 광고 SDK 설정
# ============================================================================
# 애드포러스
-keep class com.adforus.sdk.greenp.v3.** { *; }
-keep class com.adforus.sdk.adsu.** { *; }
-dontwarn com.adforus.sdk.greenp.v3.**
-dontwarn com.adforus.sdk.adsu.**

# TNK Factory
-keep class com.tnkfactory.** { *; }
-dontwarn com.tnkfactory.**

# 버즈빌 SDK
-keep class com.buzzvil.** { *; }
-dontwarn com.buzzvil.**

# Google Ads
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.mediation.** { *; }
-dontwarn com.google.android.gms.ads.**

# Facebook Ads
-keep class com.facebook.ads.** { *; }
-dontwarn com.facebook.ads.**

# Pangle Ads
-keep class com.pangle.** { *; }
-dontwarn com.pangle.**

# Unity Ads
-keep class com.unity3d.ads.** { *; }
-dontwarn com.unity3d.ads.**

# 카카오 AdFit
-keep class com.kakao.adfit.** { *; }
-dontwarn com.kakao.adfit.**

# Igaworks
-keep class com.igaworks.** { *; }
-dontwarn com.igaworks.**

# ============================================================================
# 🔥 로그인/인증 관련
# ============================================================================
# 네이버 로그인
-keep public class com.navercorp.nid.** { *; }
-keep class com.nhn.** { *; }
-keep class com.navercorp.** { *; }
-dontwarn com.navercorp.**
-dontwarn com.nhn.**

# 카카오 관련
-keep class com.kakao.** { *; }
-dontwarn com.kakao.**

# ============================================================================
# 🔥 React Native Screens 관련
# ============================================================================
-keep class com.swmansion.rnscreens.** { *; }
-keep class androidx.fragment.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ============================================================================
# 🔥 Kotlin/Java 기본 설정
# ============================================================================
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-keep class org.jetbrains.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**
-dontwarn org.jetbrains.**

# ============================================================================
# 🔥 Firebase/Google Services
# ============================================================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ============================================================================
# 🔥 SQLite 관련
# ============================================================================
-keep class org.sqlite.** { *; }
-keep class io.liteglue.** { *; }
-dontwarn org.sqlite.**
-dontwarn io.liteglue.**

# ============================================================================
# 🔥 일반적인 Android 설정
# ============================================================================
# 속성 유지
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations

# View 관련 유지
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}

# Native methods 유지
-keepclasseswithmembernames class * {
    native <methods>;
}

# Enum 클래스 유지
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# JSON 직렬화를 위한 설정
-keepclassmembers class * {
    @com.fasterxml.jackson.annotation.JsonProperty <fields>;
}

# 리플렉션 사용하는 클래스들 보호
-keepclassmembers class * {
    public <init>(...);
}

# WebView 관련 유지
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**

# 암호화/보안 관련 유지
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
-dontwarn javax.crypto.**
-dontwarn java.security.**

# ============================================================================
# 🔥 프로젝트 특정 설정
# ============================================================================
# 메인 패키지 유지
-keep class com.clsk.media.** { *; }

# ============================================================================
# 🔥 일반적인 경고 무시 (빌드 실패 방지)
# ============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn com.google.j2objc.**

# ============================================================================
# 🔥 최적화 설정
# ============================================================================
# 안전한 최적화를 위해 일부 최적화 비활성화
-dontoptimize
-dontpreverify
-verbose

# 디버깅을 위한 라인 번호 유지 (선택사항)
-keepattributes SourceFile,LineNumberTable