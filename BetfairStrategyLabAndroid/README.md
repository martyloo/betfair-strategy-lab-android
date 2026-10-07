# Betfair Strategy Lab — Android

Mobile-first Android client for the Betfair Strategy Lab historical horse-racing backtester.

Production API: `https://betfair-strategy-lab.onrender.com`

## What is included
- Android WebView shell (min SDK 23, target/compile SDK 36)
- Mobile-first local UI in `app/src/main/assets/`
- Render API integration for health, filter options, job submission/polling/results, and saved public runs
- Current strategies including **Lay all horses matching odds filter** and **Back all horses matching odds filter**
- Signed release AAB + APK GitHub Actions workflow

## Build in GitHub Actions
Create a GitHub repository, upload this project, then add these repository secrets under **Settings → Secrets and variables → Actions**:

- `KEYSTORE_BASE64`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

`KEYSTORE_BASE64` is the base64 text of your Android upload keystore. Do not commit the keystore or passwords to the repository.

Run **Actions → Build Android AAB and APK → Run workflow**. Two downloadable artifacts will be produced: `BetfairStrategyLab-AAB` and `BetfairStrategyLab-APK`.

## API address
To change the backend later, edit the first line of `app/src/main/assets/app.js`:

```js
const API='https://betfair-strategy-lab.onrender.com';
```

## Important pricing note
The backend currently calls the historical pre-start `last_traded_price` value `bsp` in several response fields for compatibility. The mobile UI therefore presents it generically as **odds** rather than claiming it is Betfair Starting Price.
