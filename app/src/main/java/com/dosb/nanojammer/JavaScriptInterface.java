package com.dosb.nanojammer;

        import android.app.Activity;
        import android.content.Context;
        import android.os.Vibrator;
        import android.webkit.JavascriptInterface;

public class JavaScriptInterface {
    private Context ctx;

    public JavaScriptInterface(Activity activity) {
        this.ctx = activity.getApplicationContext();
    }

    @JavascriptInterface
    public void Vibrate(String value )
    {
        long pattern[]  = {0,300,200,500,200,600,200,800};
        // Get instance of Vibrator from current Context
        Vibrator v = (Vibrator)ctx.getSystemService(ctx.VIBRATOR_SERVICE);
        if (value.equals("on"))
        {
            v.vibrate(pattern,-1);
        }
        else
        {
            v.cancel();
        }
    }
}
