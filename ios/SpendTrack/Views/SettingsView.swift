import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @AppStorage("name") private var name = ""
    @AppStorage("currency") private var currency = "INR"

    private let currencies = ["INR","USD","EUR","GBP","AED","SGD","AUD","CAD","JPY"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Card {
                    Text("PROFILE").font(.system(size: 11, weight: .semibold)).tracking(1).foregroundStyle(Palette.muted).padding(.bottom, 8)
                    TextField("Your name", text: $name)
                        .padding(12).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12)).foregroundStyle(Palette.text)
                    HStack {
                        Text("Currency").foregroundStyle(Palette.text)
                        Spacer()
                        Picker("", selection: $currency) {
                            ForEach(currencies, id: \.self) { Text($0).tag($0) }
                        }.tint(Palette.accent)
                    }.padding(.top, 12)
                }

                Card {
                    Text("DATA").font(.system(size: 11, weight: .semibold)).tracking(1).foregroundStyle(Palette.muted).padding(.bottom, 8)
                    Button(role: .destructive) { clearAll() } label: {
                        Text("Clear all data").frame(maxWidth: .infinity)
                    }.foregroundStyle(Palette.negative).padding(.vertical, 8)
                }

                Text("SpendTrack · stored on this device")
                    .font(.system(size: 12)).foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(16)
        }
        .screenBackground()
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func clearAll() {
        try? context.delete(model: Transaction.self)
        try? context.delete(model: Recurring.self)
        try? context.delete(model: Loan.self)
        try? context.delete(model: Budget.self)
        try? context.delete(model: Category.self)
        try? context.delete(model: Account.self)
        try? context.save()
        AppSettings.seeded = false
        seedDefaultsIfNeeded(context)
    }
}
