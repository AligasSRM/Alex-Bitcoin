package com.alexbitcoin.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String DASHBOARD_URL =
        "https://alex-bitcoin-control-dashboard-9i3b5u.v2.appdeploy.ai/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(DASHBOARD_URL);
    }

    private void showError() {
        TextView error = new TextView(this);
        error.setText("Alex Bitcoin\n\nتعذر فتح لوحة التحكم. تحقق من اتصال الإنترنت وحاول مرة ثانية.");
        error.setTextSize(18);
        error.setPadding(48, 96, 48, 48);
        error.setOnClickListener(v -> {
            setContentView(webView);
            webView.loadUrl(DASHBOARD_URL);
        });
        setContentView(error);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}