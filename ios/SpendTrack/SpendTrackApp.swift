import SwiftUI
import SwiftData

@main
struct SpendTrackApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(Palette.accent)
        }
        .modelContainer(for: [
            Account.self, Category.self, Transaction.self,
            Recurring.self, Loan.self, Budget.self,
        ])
    }
}
