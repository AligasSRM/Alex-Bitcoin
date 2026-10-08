package com.alexbitcoin.dashboard;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String DASHBOARD_URL =
        "https://alex-bitcoin-control-dashboard-9i3b5u.v2.appdeploy.ai/";

    private FrameLayout root;
    private WebView webView;
    private TextView errorView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildShell();
        createWebView();
        loadDashboard();
    }

    private void buildShell() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(5, 7, 10));

        errorView = new TextView(this);
        errorView.setText("Alex Bitcoin\\n\\nجارِ فتح لوحة التحكم...");
        errorView.setTextColor(Color.WHITE);
        errorView.setTextSize(18);
        errorView.setGravity(Gravity.CENTER);
        errorView.setPadding(48, 48, 48, 48);
        errorView.setVisibility(View.VISIBLE);

        root.addView(errorView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);
    }

    private void createWebView() {
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setMediaPlaybackRequiresUserGesture(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                errorView.setText("Alex Bitcoin\\n\\nجارِ فتح لوحة التحكم...");
                errorView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                errorView.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("تعذر فتح لوحة التحكم. تحقق من الإنترنت ثم اضغط إعادة المحاولة.");
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame()) showError("الخادم أعاد خطأ HTTP. اضغط إعادة المحاولة.");
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                replaceCrashedWebView();
                return true;
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        webView.bringToFront();
        errorView.bringToFront();
    }

    private void loadDashboard() {
        errorView.setText("Alex Bitcoin\\n\\nجارِ فتح لوحة التحكم...");
        errorView.setVisibility(View.VISIBLE);
        try {
            webView.loadUrl(DASHBOARD_URL);
        } catch (Throwable t) {
            showError("تعذر تشغيل WebView. اضغط إعادة المحاولة.");
        }
    }

    private void showError(String message) {
        if (errorView != null) {
            errorView.setText("Alex Bitcoin\\n\\n" + message + "\\n\\nإعادة المحاولة");
            errorView.setVisibility(View.VISIBLE);
            errorView.setOnClickListener(v -> loadDashboard());
        }
    }

    private void replaceCrashedWebView() {
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        createWebView();
        loadDashboard();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
