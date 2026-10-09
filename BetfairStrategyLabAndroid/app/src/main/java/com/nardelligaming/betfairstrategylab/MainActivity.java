package com.nardelligaming.betfairstrategylab;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.content.Intent;
import android.net.Uri;
import android.widget.ScrollView;
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
    private TextView termsText;
    private TextView requirementText;
    private ProductDetails.SubscriptionOfferDetails displayedOffer;
    private boolean offerHasTrial = false;
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
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(7, 26, 45));
        subscriptionGate = new LinearLayout(this);
        subscriptionGate.setOrientation(LinearLayout.VERTICAL);
        subscriptionGate.setGravity(Gravity.CENTER_HORIZONTAL);
        subscriptionGate.setPadding(dp(22), dp(16), dp(22), dp(24));
        scroll.addView(subscriptionGate);

        Button close = new Button(this);
        close.setText("✕  CLOSE");
        close.setTextSize(16);
        close.setTextColor(Color.WHITE);
        close.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(50, 72, 94)));
        close.setContentDescription("Close subscription offer");
        close.setOnClickListener(v -> showSubscriptionRequired());
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(dp(130), dp(52));
        closeParams.gravity = Gravity.END;
        closeParams.bottomMargin = dp(12);
        subscriptionGate.addView(close, closeParams);

        TextView title = makeText("HORSE RACING\nSTRATEGY TESTER", 25, true);
        title.setPadding(0, 0, 0, dp(12));
        subscriptionGate.addView(title);

        TextView subtitle = makeText("Unlimited historical horse racing backtesting, strategy filters and results analysis.", 15, false);
        subtitle.setTextColor(Color.rgb(190, 205, 220));
        subtitle.setPadding(0, 0, 0, dp(16));
        subscriptionGate.addView(subtitle);

        requirementText = makeText("A paid subscription is required to use Horse Racing Strategy Tester.", 16, true);
        requirementText.setPadding(0, 0, 0, dp(12));
        subscriptionGate.addView(requirementText);

        statusText = makeText("Checking your Google Play subscription and available pricing…", 14, false);
        statusText.setTextColor(Color.rgb(190, 205, 220));
        statusText.setPadding(0, 0, 0, dp(12));
        subscriptionGate.addView(statusText);

        termsText = makeText("Loading your local price and eligibility from Google Play…", 15, false);
        termsText.setPadding(0, 0, 0, dp(16));
        subscriptionGate.addView(termsText);

        subscribeButton = new Button(this);
        subscribeButton.setText("LOADING SUBSCRIPTION…");
        subscribeButton.setTextSize(15);
        subscribeButton.setEnabled(false);
        subscribeButton.setOnClickListener(v -> startPurchase());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, dp(56));
        buttonParams.setMargins(0, dp(4), 0, dp(8));
        subscriptionGate.addView(subscribeButton, buttonParams);

        restoreButton = new Button(this);
        restoreButton.setText("RESTORE / CHECK SUBSCRIPTION");
        restoreButton.setTextSize(13);
        restoreButton.setOnClickListener(v -> checkEntitlement());
        subscriptionGate.addView(restoreButton, new LinearLayout.LayoutParams(-1, dp(52)));

        TextView cancellation = makeText("Cancel anytime in Google Play → Payments & subscriptions → Subscriptions. Cancelling during a free trial before it ends avoids the first charge. Subscription automatically renews unless cancelled.", 13, false);
        cancellation.setTextColor(Color.rgb(205, 215, 228));
        cancellation.setPadding(0, dp(16), 0, dp(8));
        subscriptionGate.addView(cancellation);

        Button manage = new Button(this);
        manage.setText("MANAGE SUBSCRIPTIONS IN GOOGLE PLAY");
        manage.setTextSize(12);
        manage.setOnClickListener(v -> openSubscriptions());
        subscriptionGate.addView(manage, new LinearLayout.LayoutParams(-1, dp(52)));
        setContentView(scroll);
    }

    private void showSubscriptionRequired() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(7, 26, 45));
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        content.setPadding(dp(24), dp(24), dp(24), dp(24));
        TextView title = makeText("Subscription required", 26, true);
        content.addView(title);
        TextView explanation = makeText("Horse Racing Strategy Tester requires an active paid subscription or eligible free trial to access the backtester. You can review the offer without purchasing.", 16, false);
        explanation.setPadding(0, dp(18), 0, dp(18));
        content.addView(explanation);
        Button viewOffer = new Button(this);
        viewOffer.setText("VIEW SUBSCRIPTION OPTIONS");
        viewOffer.setOnClickListener(v -> { showSubscriptionGate(); refreshOfferDisplay(); checkEntitlement(); });
        content.addView(viewOffer, new LinearLayout.LayoutParams(-1, dp(56)));
        Button exit = new Button(this);
        exit.setText("EXIT APP");
        exit.setOnClickListener(v -> finish());
        content.addView(exit, new LinearLayout.LayoutParams(-1, dp(56)));
        scroll.addView(content);
        setContentView(scroll);
    }

    private void openSubscriptions() {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?package=" + getPackageName()));
        startActivity(intent);
    }

    private ProductDetails.SubscriptionOfferDetails selectOffer(ProductDetails details) {
        if (details == null) return null;
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            if (phases != null && phases.size() >= 2 && phases.get(0).getPriceAmountMicros() == 0
                    && "P3D".equals(phases.get(0).getBillingPeriod())) return offer;
        }
        // If there is no eligible three-day trial, use a regular base plan if available.
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (offer.getOfferId() == null) return offer;
        }
        return offers.get(0);
    }

    private void refreshOfferDisplay() {
        displayedOffer = selectOffer(subscriptionDetails);
        if (termsText == null || subscribeButton == null) return;
        if (displayedOffer == null) {
            termsText.setText("Pricing is currently unavailable. Please check your Google Play connection.");
            subscribeButton.setText("SUBSCRIPTION UNAVAILABLE");
            subscribeButton.setEnabled(false);
            return;
        }
        List<ProductDetails.PricingPhase> phases = displayedOffer.getPricingPhases().getPricingPhaseList();
        if (phases == null || phases.isEmpty()) {
            termsText.setText("Google Play did not return pricing details.");
            subscribeButton.setEnabled(false);
            return;
        }
        ProductDetails.PricingPhase first = phases.get(0);
        offerHasTrial = phases.size() >= 2 && first.getPriceAmountMicros() == 0
                && "P3D".equals(first.getBillingPeriod());
        ProductDetails.PricingPhase recurring = phases.get(phases.size() - 1);
        String price = recurring.getFormattedPrice();
        String period = "P1M".equals(recurring.getBillingPeriod()) ? "month" :
                "P1Y".equals(recurring.getBillingPeriod()) ? "year" : "billing period";
        if (offerHasTrial) {
            termsText.setText("3 days free, then " + price + " per " + period + ". Your free trial ends 3 days after you subscribe; the first payment is charged when it ends. Automatically renews at " + price + " per " + period + " unless cancelled.");
            subscribeButton.setText("START 3-DAY FREE TRIAL");
        } else {
            termsText.setText(price + " per " + period + " starting today. No free trial is available for this Google Play account. Automatically renews at " + price + " per " + period + " unless cancelled.");
            subscribeButton.setText("SUBSCRIBE — " + price + " / " + period);
        }
        subscribeButton.setEnabled(true);
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
            runOnUiThread(this::refreshOfferDisplay);
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
            setStatus("No active subscription found. Review the eligible offer and terms below.");
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

        ProductDetails.SubscriptionOfferDetails selectedOffer = displayedOffer;
        if (selectedOffer == null) {
            setStatus("Subscription offer is not available. Please retry.");
            return;
        }

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
