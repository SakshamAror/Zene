// In your app/src/main/java/com/saksh/zene/MainActivity.java file

package com.saksh.zene;

// Existing import for Capacitor
import com.getcapacitor.BridgeActivity;

// NEW IMPORTS FOR FIREBASE MESSAGING AND LOGGING
import com.google.firebase.messaging.FirebaseMessaging;
import android.util.Log;
import androidx.annotation.NonNull;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
// END NEW IMPORTS

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) { // Ensure you use android.os.Bundle
        super.onCreate(savedInstanceState);

        // --- ADD THE FCM TOKEN CODE HERE ---
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.w("FCM_Token", "Fetching FCM registration token failed", task.getException());
                        return;
                    }

                    // Get new FCM registration token
                    String token = task.getResult();
                    Log.d("FCM_Token", "FCM Registration Token: " + token);
                }
            });
        // --- END OF FCM TOKEN CODE ---

        // The rest of your existing Capacitor setup for MainActivity would likely be below here.
        // For example, if you have a call to loadUrl() or anything similar, it goes after super.onCreate()
    }
}
