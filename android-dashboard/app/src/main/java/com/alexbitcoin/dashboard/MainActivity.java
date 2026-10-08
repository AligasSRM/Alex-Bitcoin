package com.alexbitcoin.dashboard;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
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
    private TextView statusView;

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

        statusView = new TextView(this);
        statusView.setText("Alex Bitcoin\n\nجارِ فتح لوحة التحكم...");
        statusView.setTextColor(Color.WHITE);
        statusView.setTextSize(18);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(48, 48, 48, 48);
        statusView.setVisibility(View.VISIBLE);
        root.addView(statusView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(root);
    }

    private void createWebView() {
        webView = new WebView(this);

        // The failure reproduced by the previous build is consistent with a
        // WebView renderer/GPU failure. Keep the page itself remote, but force
        // software compositing for this dedicated control shell.
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSafeBrowsingEnabled(true);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        webView.setBackgroundColor(Color.rgb(5, 7, 10));
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                showStatus("Alex Bitcoin\n\nجارِ فتح لوحة التحكم...");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                statusView.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError("تعذر فتح لوحة التحكم.");
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame()) {
                    showError("الخادم أعاد خطأ HTTP.");
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (webView == view) {
                    showRendererError();
                    root.removeView(view);
                    view.destroy();
                    webView = null;
                }
                return true;
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
    }

    private void loadDashboard() {
        showStatus("Alex Bitcoin\n\nجارِ فتح لوحة التحكم...");
        try {
            webView.loadUrl(DASHBOARD_URL);
        } catch (Throwable t) {
            showError("تعذر تشغيل WebView.");
        }
    }

    private void showStatus(String message) {
        statusView.setText(message);
        statusView.setVisibility(View.VISIBLE);
        statusView.setOnClickListener(null);
    }

    private void showError(String message) {
        statusView.setText("Alex Bitcoin\n\n" + message + "\n\nاضغط لإعادة المحاولة");
        statusView.setVisibility(View.VISIBLE);
        statusView.setOnClickListener(v -> {
            if (webView == null) {
                createWebView();
            }
            loadDashboard();
        });
    }

    private void showRendererError() {
        statusView.setText(
            "Alex Bitcoin\n\nمحرك عرض Android تعطل أثناء فتح اللوحة.\n\n" +
            "اضغط لفتح اللوحة بالمتصفح."
        );
        statusView.setVisibility(View.VISIBLE);
        statusView.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(DASHBOARD_URL)));
            } catch (Throwable ignored) {
                statusView.setText("تعذر فتح المتصفح.");
            }
        });
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
