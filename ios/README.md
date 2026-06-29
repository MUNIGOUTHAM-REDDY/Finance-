# SpendTrack — native iOS app

A native **SwiftUI + SwiftData** version of SpendTrack. Local-only (all data on
the device), dark, matching the web app's calm design. This is **v1 core**:
Home, Quick-Add, Accounts, Activity, Settings. Recurring / Loans / Budgets /
Insights are coming next.

## Build & install on your iPhone (free Apple ID is fine)

You need a Mac with **Xcode 15+**.

### 1. Generate the Xcode project

The project is defined in `project.yml` and generated with
[XcodeGen](https://github.com/yonsm/XcodeGen) (so there's no fragile
`.xcodeproj` in git):

```bash
brew install xcodegen        # once
cd ios
xcodegen generate            # creates SpendTrack.xcodeproj
open SpendTrack.xcodeproj
```

### 2. Set signing

In Xcode: select the **SpendTrack** target → **Signing & Capabilities** →
- check **Automatically manage signing**
- pick your **Team** (your personal Apple ID works — add it in
  Xcode ▸ Settings ▸ Accounts if needed)
- if you get a "bundle identifier is not available" error, change
  **Bundle Identifier** to something unique, e.g. `com.yourname.spendtrack`.

### 3. Run on your phone

- Plug in your iPhone (or use a simulator to try it first).
- Pick your iPhone in the device dropdown (top bar) → press **▶ Run**.
- First time on the device: **Settings ▸ General ▸ VPN & Device Management** →
  trust your developer certificate.

### ⏳ Note about the free Apple ID

Apps signed with a free Apple ID **expire after 7 days**. To keep using it,
reconnect the phone and press **Run** again (it rebuilds in seconds). A paid
Apple Developer account ($99/yr) removes this limit and enables a Home Screen
widget — say the word when you're ready and I'll wire those up.

## Regenerating after code changes

When new Swift files are added, just run `xcodegen generate` again (or, if the
project is already open, Xcode picks new files up on next generate).

## Project layout

```
ios/
  project.yml                 XcodeGen project spec
  gen-appicon.js              regenerates the app icon (node, no deps)
  SpendTrack/
    SpendTrackApp.swift        @main + SwiftData container
    Models.swift               @Model types + enums
    Store.swift                balances, seeding, currency/date formatting
    Theme.swift                colours + Card
    Components.swift           StackedBar, TransactionRow, button style
    Views/                     RootView, Home, QuickAdd, Accounts,
                               Transactions, TransactionDetail, Settings
    Assets.xcassets/           AppIcon + AccentColor
```
