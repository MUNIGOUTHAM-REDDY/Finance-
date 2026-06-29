import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(\.modelContext) private var context
    @State private var showAdd = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            TabView {
                HomeView()
                    .tabItem { Label("Home", systemImage: "house.fill") }
                TransactionsView()
                    .tabItem { Label("Activity", systemImage: "list.bullet") }
                AccountsView()
                    .tabItem { Label("Accounts", systemImage: "creditcard.fill") }
            }
            .tint(Palette.accent)

            Button {
                showAdd = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(Palette.accent)
                    .clipShape(Circle())
                    .shadow(color: Palette.accent.opacity(0.4), radius: 10, y: 4)
            }
            .padding(.trailing, 20)
            .padding(.bottom, 68)
        }
        .onAppear { seedDefaultsIfNeeded(context) }
        .sheet(isPresented: $showAdd) { QuickAddView() }
    }
}
