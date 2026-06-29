import SwiftUI

// Full-width stacked proportion bar (calm "where it went").
struct StackedBar: View {
    var segs: [(color: Color, value: Double)]
    var body: some View {
        let total = max(segs.reduce(0) { $0 + $1.value }, 0.0001)
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(Array(segs.enumerated()), id: \.offset) { _, s in
                    Rectangle()
                        .fill(s.color)
                        .frame(width: max(0, geo.size.width * (s.value / total) - 2))
                }
            }
        }
        .frame(height: 10)
        .background(Palette.surface2)
        .clipShape(Capsule())
    }
}

// A transaction list row.
struct TransactionRowView: View {
    let tx: Transaction
    let category: Category?
    let account: Account?

    private var icon: String {
        if let c = category { return c.icon }
        switch tx.type {
        case .income: return "↓"
        case .expense: return "↑"
        case .transfer: return "↔"
        default: return "•"
        }
    }
    private var title: String {
        if !tx.note.isEmpty { return tx.note }
        if let c = category { return c.name }
        return tx.type.label
    }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Palette.surface2).frame(width: 40, height: 40)
                Text(icon).font(.system(size: 18))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(Palette.text).font(.system(size: 15, weight: .medium)).lineLimit(1)
                Text("\(account?.name ?? "—") · \(shortDate(tx.date))")
                    .foregroundStyle(Palette.muted).font(.system(size: 12))
            }
            Spacer(minLength: 8)
            Text(signedCurrency(tx.amount, direction: tx.type.direction))
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tx.type.direction > 0 ? Palette.positive : Palette.text)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}

// Primary filled button label.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Palette.accent)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

extension View {
    func screenBackground() -> some View {
        self.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(Palette.bg.ignoresSafeArea())
    }
}
