package com.nardelligaming.betfairstrategylab;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity implements PurchasesUpdatedListener {

    // This must exactly match the subscription product ID created in Play Console.
    private static final String SUBSCRIPTION_ID = "horse_racing_premium";

    private BillingClient billingClient;
    private ProductDetails subscriptionDetails;
    private WebView webView;
    private LinearLayout subscriptionGate;
    private TextView statusText;
    private Button subscribeButton;
    private Button restoreButton;
    private boolean testerLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 26, 45));
        getWindow().setNavigationBarColor(Color.rgb(7, 26, 45));

        showSubscriptionGate();
        setupBilling();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView makeText(String text, float size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.WHITE);
        view.setTextSize(size);
        view.setGravity(Gravity.CENTER);
        if (bold) view.setTypeface(null, android.graphics.Typeface.BOLD);
        return view;
    }

    private void showSubscriptionGate() {
        subscriptionGate = new LinearLayout(this);
        subscriptionGate.setOrientation(LinearLayout.VERTICAL);
        subscriptionGate.setGravity(Gravity.CENTER_HORIZONTAL);
        subscriptionGate.setPadding(dp(24), dp(38), dp(24), dp(24));
        subscriptionGate.setBackgroundColor(Color.rgb(7, 26, 45));

        TextView title = makeText("HORSE RACING\nSTRATEGY TESTER", 25, true);
        title.setPadding(0, 0, 0, dp(14));
        subscriptionGate.addView(title, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView subtitle = makeText(
                "Test your horse racing strategies across more than 100,000 UK races and 10 years of historical Betfair data.",
                15, false);
        subtitle.setTextColor(Color.rgb(190, 205, 220));
        subtitle.setPadding(0, 0, 0, dp(28));
        subscriptionGate.addView(subtitle, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        statusText = makeText("Checking your Google Play subscription...", 14, false);
        statusText.setTextColor(Color.rgb(190, 205, 220));
        statusText.setPadding(0, 0, 0, dp(20));
        subscriptionGate.addView(statusText, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        subscribeButton = new Button(this);
        subscribeButton.setText("START 3-DAY FREE TRIAL");
        subscribeButton.setTextSize(15);
        subscribeButton.setEnabled(false);
        subscribeButton.setOnClickListener(v -> startPurchase());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
        buttonParams.setMargins(0, dp(6), 0, dp(10));
        subscriptionGate.addView(subscribeButton, buttonParams);

        restoreButton = new Button(this);
        restoreButton.setText("RESTORE / CHECK SUBSCRIPTION");
        restoreButton.setTextSize(13);
        restoreButton.setOnClickListener(v -> checkEntitlement());
        LinearLayout.LayoutParams restoreParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52));
        restoreParams.setMargins(0, 0, 0, dp(18));
        subscriptionGate.addView(restoreButton, restoreParams);

        TextView price = makeText(
                "3 days free, then £19.99 per month. Auto-renews until cancelled.",
                13, false);
        price.setTextColor(Color.rgb(190, 205, 220));
        subscriptionGate.addView(price, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        setContentView(subscriptionGate);
    }

    private void setupBilling() {
        PendingPurchasesParams pendingParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build();

        billingClient = BillingClient.newBuilder(this)
                .setListener(this)
                .enablePendingPurchases(pendingParams)
                .enableAutoServiceReconnection()
                .build();

        connectBilling();
    }

    private void connectBilling() {
        setStatus("Connecting to Google Play...");
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    querySubscriptionDetails();
                    checkEntitlement();
                } else {
                    setStatus("Google Play Billing error: " + billingResult.getDebugMessage());
                    restoreButton.setEnabled(true);
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                setStatus("Google Play connection lost. Tap RESTORE / CHECK SUBSCRIPTION to retry.");
            }
        });
    }

    private void querySubscriptionDetails() {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(SUBSCRIPTION_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(product);

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                setStatus("Could not load subscription: " + billingResult.getDebugMessage());
                return;
            }

            List<ProductDetails> details = result.getProductDetailsList();
            if (details == null || details.isEmpty()) {
                setStatus("Subscription " + SUBSCRIPTION_ID + " was not returned by Google Play. Check that the product, monthly base plan and trial offer are active.");
                return;
            }

            subscriptionDetails = details.get(0);
            subscribeButton.setEnabled(true);
        });
    }

    private void checkEntitlement() {
        if (billingClient == null || !billingClient.isReady()) {
            connectBilling();
            return;
        }

        setStatus("Checking active subscription...");

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                setStatus("Could not check subscription: " + billingResult.getDebugMessage());
                return;
            }
            processPurchases(purchases);
        });
    }

    private void processPurchases(List<Purchase> purchases) {
        boolean entitled = false;
        boolean pending = false;

        if (purchases != null) {
            for (Purchase purchase : purchases) {
                if (!purchase.getProducts().contains(SUBSCRIPTION_ID)) continue;

                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    entitled = true;
                    if (!purchase.isAcknowledged()) acknowledgePurchase(purchase);
                } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    pending = true;
                }
            }
        }

        if (entitled) {
            setStatus("Subscription active. Opening Strategy Tester...");
            loadTester();
        } else if (pending) {
            setStatus("Your Google Play purchase is pending. Access will unlock when the purchase completes.");
            subscribeButton.setEnabled(subscriptionDetails != null);
        } else {
            setStatus("No active subscription found. Start your 3-day free trial below.");
            subscribeButton.setEnabled(subscriptionDetails != null);
        }
    }

    private void startPurchase() {
        if (billingClient == null || !billingClient.isReady()) {
            connectBilling();
            return;
        }
        if (subscriptionDetails == null) {
            setStatus("Loading subscription from Google Play...");
            querySubscriptionDetails();
            return;
        }

        List<ProductDetails.SubscriptionOfferDetails> offers = subscriptionDetails.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            setStatus("No eligible subscription offer is available for this Google account.");
            return;
        }

        ProductDetails.SubscriptionOfferDetails selectedOffer = null;

        // Prefer an eligible offer whose first pricing phase is free (the 3-day trial).
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            if (phases != null && !phases.isEmpty() && phases.get(0).getPriceAmountMicros() == 0) {
                selectedOffer = offer;
                break;
            }
        }

        // If this Google account is not eligible for the free trial, use the first
        // eligible base-plan/offer returned by Google Play rather than failing.
        if (selectedOffer == null) selectedOffer = offers.get(0);

        BillingFlowParams.ProductDetailsParams productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(subscriptionDetails)
                        .setOfferToken(selectedOffer.getOfferToken())
                        .build();

        List<BillingFlowParams.ProductDetailsParams> productList = new ArrayList<>();
        productList.add(productParams);

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productList)
                .build();

        BillingResult result = billingClient.launchBillingFlow(this, flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            setStatus("Could not start purchase: " + result.getDebugMessage());
        }
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            processPurchases(purchases);
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            setStatus("Purchase cancelled.");
        } else {
            setStatus("Purchase error: " + billingResult.getDebugMessage());
        }
    }

    private void acknowledgePurchase(Purchase purchase) {
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                setStatus("Subscription active, but acknowledgement failed: " + billingResult.getDebugMessage());
            }
        });
    }

    private void loadTester() {
        if (testerLoaded || isFinishing()) return;
        testerLoaded = true;

        runOnUiThread(() -> {
            webView = new WebView(this);
            setContentView(webView);

            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setDatabaseEnabled(true);
            s.setAllowFileAccess(true);
            s.setAllowContentAccess(true);
            s.setAllowUniversalAccessFromFileURLs(true);
            s.setJavaScriptCanOpenWindowsAutomatically(false);
            s.setSupportMultipleWindows(false);
            s.setBuiltInZoomControls(false);
            s.setDisplayZoomControls(false);

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient());
            webView.loadUrl("file:///android_asset/index.html");
        });
    }

    private void setStatus(String message) {
        runOnUiThread(() -> {
            if (statusText != null) statusText.setText(message);
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
        if (billingClient != null) billingClient.endConnection();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
