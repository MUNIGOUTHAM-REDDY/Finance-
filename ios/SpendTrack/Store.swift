import Foundation
import SwiftData

// MARK: - Settings (lightweight, stored in UserDefaults)

enum AppSettings {
    static var currency: String {
        get { UserDefaults.standard.string(forKey: "currency") ?? "INR" }
        set { UserDefaults.standard.set(newValue, forKey: "currency") }
    }
    static var name: String {
        get { UserDefaults.standard.string(forKey: "name") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "name") }
    }
    static var seeded: Bool {
        get { UserDefaults.standard.bool(forKey: "seeded_v1") }
        set { UserDefaults.standard.set(newValue, forKey: "seeded_v1") }
    }
}

// MARK: - Formatting

func formatCurrency(_ amount: Double, code: String = AppSettings.currency) -> String {
    let f = NumberFormatter()
    f.numberStyle = .currency
    f.currencyCode = code
    f.locale = Locale(identifier: "en_IN")
    f.maximumFractionDigits = amount.truncatingRemainder(dividingBy: 1) == 0 ? 0 : 2
    return f.string(from: NSNumber(value: amount)) ?? "\(amount)"
}

func signedCurrency(_ amount: Double, direction: Int) -> String {
    let prefix = direction > 0 ? "+" : direction < 0 ? "−" : ""
    return prefix + formatCurrency(abs(amount))
}

func shortDate(_ date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_IN")
    f.dateFormat = "d MMM"
    return f.string(from: date)
}

func longDate(_ date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_IN")
    f.dateFormat = "d MMM yyyy"
    return f.string(from: date)
}

// MARK: - Date helpers

func currentMonthInterval(_ now: Date = Date()) -> DateInterval {
    let cal = Calendar.current
    let comps = cal.dateComponents([.year, .month], from: now)
    let start = cal.date(from: comps)!
    let end = cal.date(byAdding: DateComponents(month: 1, second: -1), to: start)!
    return DateInterval(start: start, end: end)
}

func monthLabel(_ now: Date = Date()) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_IN")
    f.dateFormat = "MMMM yyyy"
    return f.string(from: now)
}

// MARK: - Derived balances

func balanceMap(accounts: [Account], transactions: [Transaction]) -> [UUID: Double] {
    var m: [UUID: Double] = [:]
    for a in accounts { m[a.id] = a.openingBalance }
    for t in transactions {
        if t.type == .transfer {
            m[t.accountID, default: 0] -= t.amount
            if let to = t.toAccountID { m[to, default: 0] += t.amount }
        } else {
            m[t.accountID, default: 0] += Double(t.type.direction) * t.amount
        }
    }
    return m
}

func loanOutstanding(loan: Loan, transactions: [Transaction]) -> Double {
    let repaid = transactions
        .filter { $0.loanID == loan.id && ($0.type == .loanRepaidToMe || $0.type == .loanRepaidByMe) }
        .reduce(0) { $0 + $1.amount }
    return loan.principal - repaid
}

// MARK: - Seeding

@MainActor
func seedDefaultsIfNeeded(_ context: ModelContext) {
    if AppSettings.seeded { return }
    let existing = (try? context.fetch(FetchDescriptor<Category>())) ?? []
    if existing.isEmpty {
        for c in defaultCategories {
            context.insert(Category(name: c.0, kind: c.1, icon: c.2, colorHex: c.3))
        }
        context.insert(Account(name: "Cash", type: .cash, icon: "💵", colorHex: "#22c55e"))
        context.insert(Account(name: "UPI", type: .upi, icon: "📱", colorHex: "#3b82f6"))
        try? context.save()
    }
    AppSettings.seeded = true
}

private let defaultCategories: [(String, CategoryKind, String, String)] = [
    ("Food", .expense, "🍔", "#D9A05B"),
    ("Groceries", .expense, "🛒", "#8DAF6B"),
    ("Transport", .expense, "🚕", "#6FA1C0"),
    ("Rent", .expense, "🏠", "#CC7E5C"),
    ("Bills", .expense, "🧾", "#C2A65B"),
    ("Subscriptions", .expense, "📺", "#9E8FC4"),
    ("Shopping", .expense, "🛍️", "#C783A6"),
    ("Health", .expense, "💊", "#CC7070"),
    ("Gym", .expense, "🏋️", "#5FAE93"),
    ("Entertainment", .expense, "🎬", "#8C7CC4"),
    ("Travel", .expense, "✈️", "#5FA3B0"),
    ("Education", .expense, "📚", "#7090C2"),
    ("Other", .expense, "💸", "#8A8A94"),
    ("Salary", .income, "💼", "#6FB293"),
    ("Freelance", .income, "🧑‍💻", "#84AE70"),
    ("Interest", .income, "🏦", "#5FAE93"),
    ("Refund", .income, "↩️", "#5FAEA2"),
    ("Other Income", .income, "➕", "#8DAF6B"),
]
