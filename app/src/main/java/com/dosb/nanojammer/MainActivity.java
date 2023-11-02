package com.dosb.nanojammer;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.FragmentActivity;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends FragmentActivity {
    private WebView mWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // These lines makes the status bar transparent and the website will
        // take up the whole length of the display, Works for Android versions post-KitKat; uncomment if needed

        // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        // Window w = getWindow(); // in Activity’s onCreate() for instance
        // w.setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        // }

        mWebView = (WebView) findViewById(R.id.webview);
        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        //webSettings.setAllowFileAccessFromFileURLs(true); //Maybe you don't need this rule
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            webSettings.setAllowUniversalAccessFromFileURLs(true);
        }
        JavaScriptInterface jsInterface = new JavaScriptInterface(this);
        mWebView.addJavascriptInterface(jsInterface, "JSInterface");


        mWebView.getSettings().setUseWideViewPort(true);
        mWebView.getSettings().setLoadWithOverviewMode(true);
        //mWebView.getSettings().setUserAgentString("Mozilla/5.0 (Linux; U;` Android 2.0; en-us; Droid Build/ESD20) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17");
//        mWebView.loadUrl("http://192.168.1.19:8000"); //change the url to display your website
        mWebView.loadUrl("file:///android_asset/nano/index.html");
    }
}