package com.clsk.media;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MottoWebActivity extends Activity {
    private String pubKey;
    private String uid;
    private String adId;
    private String baseUrl;
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Intent에서 파라미터 받기
        Intent intent = getIntent();
        pubKey = intent.getStringExtra("pubKey");
        uid = intent.getStringExtra("uid");
        adId = intent.getStringExtra("adId");

        // 기본값 설정 (파라미터가 없을 경우)
        if (pubKey == null) pubKey = "{pubKey}";
        if (uid == null) uid = "{uid}";
        if (adId == null) adId = "{adId}";

        // URL 생성
        baseUrl = "https://api.motto.kr/login?pubKey=" + pubKey + "&uid=" + uid + "&adId=" + adId;

        // WebView 인스턴스 생성 및 전체 화면으로 설정
        webView = new WebView(this);
        setContentView(webView);

        // WebView 기본 설정
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDomStorageEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // JavaScript에서 호출 가능한 Android 인터페이스 등록
        MottoJsInterface jsInterface = new MottoJsInterface();
        webView.addJavascriptInterface(jsInterface, "CampaignInterfaceAndroid");
        webView.addJavascriptInterface(jsInterface, "AppInterfaceAndroid");

        webView.loadUrl(baseUrl);
    }

    // 안드로이드 물리 뒤로가기 버튼 처리
    @Override
    public void onBackPressed() {
        goBack();
    }

    // WebView가 이전 페이지를 가지고 있다면 뒤로 이동, 그렇지 않으면 앱 종료
    private void goBack() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
        }
    }

    // 자바스크립트에서 호출 가능한 Android 함수 정의 클래스
    public class MottoJsInterface {
        @JavascriptInterface
        public void onStartMission(String startUrl) {
            if (startUrl == null) return;
            String url = startUrl.startsWith("http") ? startUrl : "https://" + startUrl;
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        }

        @JavascriptInterface
        public void onHistoryBack() {
            runOnUiThread(() -> goBack());
        }
    }
}