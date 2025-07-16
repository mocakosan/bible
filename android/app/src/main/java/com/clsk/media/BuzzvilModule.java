package com.clsk.media;

import com.buzzvil.sdk.BuzzvilSdk;
import com.buzzvil.sdk.BuzzvilSdkLoginListener;
import com.buzzvil.sdk.BuzzvilSdkUser;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import android.util.Log;

import androidx.annotation.NonNull;
import java.util.ArrayList;
import java.util.List;

public class BuzzvilModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "BuzzvilModule";
    private static final String TAG = "BuzzvilModule";

    // Kotlin Pair 대신 사용할 간단한 Pair 클래스
    public static class SimplePair<T, U> {
        public final T first;
        public final U second;

        public SimplePair(T first, U second) {
            this.first = first;
            this.second = second;
        }
    }

    public BuzzvilModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void login(ReadableMap userInfo, Promise promise) {
        try {
            String userId = userInfo.getString("userId");
            if (userId == null || userId.isEmpty()) {
                promise.reject("INVALID_USER_ID", "User ID는 필수입니다");
                return;
            }

            Log.d(TAG, "로그인 시도: " + userId);

            // 성별 처리
            BuzzvilSdkUser.Gender gender = null;
            if (userInfo.hasKey("gender")) {
                String genderStr = userInfo.getString("gender");
                if (genderStr != null) {
                    switch (genderStr.toUpperCase()) {
                        case "MALE":
                        case "M":
                            gender = BuzzvilSdkUser.Gender.MALE;
                            break;
                        case "FEMALE":
                        case "F":
                            gender = BuzzvilSdkUser.Gender.FEMALE;
                            break;
                    }
                }
            }

            // 출생연도 처리
            Integer birthYear = null;
            if (userInfo.hasKey("birthYear")) {
                birthYear = userInfo.getInt("birthYear");
            }

            // BuzzvilSdkUser 생성 시도 (다양한 방법)
            BuzzvilSdkUser buzzvilSdkUser = null;

            try {
                // 먼저 빈 리스트로 시도 (가장 안전한 방법)
                try {
                    // null 값으로 시도
                    buzzvilSdkUser = new BuzzvilSdkUser(
                        userId,
                        gender,
                        birthYear,
                        false, // isAdTrackingRestricted
                        null   // customParameters를 null로 설정
                    );
                    Log.d(TAG, "BuzzvilSdkUser 생성 성공 (null parameters)");
                } catch (Exception e1) {
                    try {
                        // 빈 ArrayList 시도 (raw type)
                        List customParameters = new ArrayList<>();

                        buzzvilSdkUser = new BuzzvilSdkUser(
                            userId,
                            gender,
                            birthYear,
                            false,
                            customParameters
                        );
                        Log.d(TAG, "BuzzvilSdkUser 생성 성공 (empty list)");
                    } catch (Exception e2) {
                        try {
                            // Reflection으로 정확한 타입 확인 후 생성
                            java.lang.reflect.Constructor<?>[] constructors = BuzzvilSdkUser.class.getConstructors();
                            for (java.lang.reflect.Constructor<?> constructor : constructors) {
                                Class<?>[] paramTypes = constructor.getParameterTypes();
                                if (paramTypes.length == 5) {
                                    Log.d(TAG, "생성자 파라미터 타입들:");
                                    for (int i = 0; i < paramTypes.length; i++) {
                                        Log.d(TAG, "  " + i + ": " + paramTypes[i].getName());
                                    }

                                    // 마지막 파라미터가 List인 경우
                                    if (paramTypes[4].equals(List.class)) {
                                        List<Object> emptyList = new ArrayList<>();
                                        buzzvilSdkUser = (BuzzvilSdkUser) constructor.newInstance(
                                            userId, gender, birthYear, false, emptyList
                                        );
                                        Log.d(TAG, "BuzzvilSdkUser 생성 성공 (reflection)");
                                        break;
                                    }
                                }
                            }
                        } catch (Exception e3) {
                            Log.e(TAG, "모든 생성 방법 실패", e3);
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "BuzzvilSdkUser 생성 중 최종 오류", e);
                promise.reject("USER_CREATION_ERROR", "사용자 정보 생성 실패: " + e.getMessage());
                return;
            }

            if (buzzvilSdkUser == null) {
                promise.reject("USER_CREATION_ERROR", "BuzzvilSdkUser 생성 실패");
                return;
            }

            // 로그인 요청
            BuzzvilSdk.login(buzzvilSdkUser, new BuzzvilSdkLoginListener() {
                @Override
                public void onSuccess() {
                    Log.d(TAG, "Buzzvil 로그인 성공");
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "로그인 성공");
                    promise.resolve(result);
                }

                @Override
                public void onFailure(@NonNull ErrorType errorType) {
                    Log.e(TAG, "Buzzvil 로그인 실패: " + errorType.name());
                    String errorMessage;
                    switch (errorType) {
                        case NOT_INITIALIZED:
                            errorMessage = "SDK가 초기화되지 않았습니다";
                            break;
                        case INVALID_USER_ID:
                            errorMessage = "유효하지 않은 User ID입니다";
                            break;
                        case UNKNOWN:
                        default:
                            errorMessage = "알 수 없는 오류가 발생했습니다";
                            break;
                    }
                    promise.reject(errorType.name(), errorMessage);
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "로그인 중 예외 발생", e);
            promise.reject("LOGIN_ERROR", "로그인 중 오류 발생: " + e.getMessage());
        }
    }

    @ReactMethod
    public void logout(Promise promise) {
        try {
            Log.d(TAG, "로그아웃 시도");
            BuzzvilSdk.logout();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "로그아웃 성공");
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "로그아웃 중 예외 발생", e);
            promise.reject("LOGOUT_ERROR", "로그아웃 중 오류 발생: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isLoggedIn(Promise promise) {
        try {
            // 로그인 상태 확인 (임시로 false 반환)
            // 실제 구현은 버즈빌 SDK 초기화 성공 후 시도
            Log.d(TAG, "로그인 상태 확인 (임시 구현)");
            promise.resolve(false);

        } catch (Exception e) {
            Log.e(TAG, "로그인 상태 확인 중 예외 발생", e);
            promise.reject("CHECK_LOGIN_ERROR", "로그인 상태 확인 중 오류 발생: " + e.getMessage());
        }
    }
}