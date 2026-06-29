import SwiftUI
import SwiftData

private struct CatSpend: Identifiable {
    let id: UUID
    let name: String
    let icon: String
    let color: Color
    var amount: Double
}

struct HomeView: View {
    @Query(sort: \Account.createdAt) private var accounts: [Account]
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    @Query private var categories: [Category]
    @Query private var budgets: [Budget]

    private var categoryByID: [UUID: Category] {
        Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) })
    }
    private var accountByID: [UUID: Account] {
        Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0) })
    }
    private var totalBalance: Double {
        let m = balanceMap(accounts: accounts, transactions: transactions)
        return accounts.filter { !$0.archived }.reduce(0) { $0 + (m[$1.id] ?? 0) }
    }
    private var monthTx: [Transaction] {
        let i = currentMonthInterval()
        return transactions.filter { $0.date >= i.start && $0.date <= i.end }
    }
    private var spent: Double { monthTx.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount } }
    private var income: Double { monthTx.filter { $0.type == .income }.reduce(0) { $0 + $1.amount } }

    private var catSpend: [CatSpend] {
        var map: [UUID: CatSpend] = [:]
        for t in monthTx where t.type == .expense {
            guard let cid = t.categoryID, let c = categoryByID[cid] else { continue }
            if map[cid] != nil { map[cid]!.amount += t.amount }
            else { map[cid] = CatSpend(id: cid, name: c.name, icon: c.icon, color: Color(hex: c.colorHex), amount: t.amount) }
        }
        return map.values.sorted { $0.amount > $1.amount }
    }
    private var overallBudget: Double? {
        budgets.first { $0.categoryID == nil }?.amount
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Balance hero
                    VStack(alignment: .leading, spacing: 4) {
                        Text("BALANCE").font(.system(size: 12, weight: .semibold)).tracking(1.5).foregroundStyle(Palette.muted)
                        Text(formatCurrency(totalBalance)).font(.system(size: 40, weight: .semibold)).foregroundStyle(Palette.text)
                        (Text("Spent ").foregroundStyle(Palette.muted)
                         + Text(formatCurrency(spent)).foregroundStyle(Palette.text)
                         + Text(" · Income ").foregroundStyle(Palette.muted)
                         + Text(formatCurrency(income)).foregroundStyle(Palette.positive)
                         + Text(" · this month").foregroundStyle(Palette.muted))
                            .font(.system(size: 14))
                    }
                    .padding(.top, 4)

                    if let budget = overallBudget {
                        budgetCard(budget)
                    }
                    if !catSpend.isEmpty {
                        whereItWent
                    }
                    recentCard
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink { SettingsView() } label: {
                        Image(systemName: "gearshape").foregroundStyle(Palette.muted)
                    }
                }
            }
        }
    }

    private func budgetCard(_ budget: Double) -> some View {
        let pct = budget > 0 ? spent / budget : 0
        let color: Color = pct >= 1 ? Palette.negative : pct >= 0.8 ? Palette.warn : Palette.positive
        return Card {
            HStack {
                Text("This month").font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
                Spacer()
                Text("\(formatCurrency(spent)) / \(formatCurrency(budget))").font(.system(size: 14)).foregroundStyle(Palette.muted)
            }
            .padding(.bottom, 8)
            ProgressBar(value: pct, color: color).padding(.bottom, 8)
            Text(pct >= 1 ? "Over by \(formatCurrency(spent - budget))" : "\(formatCurrency(budget - spent)) left")
                .font(.system(size: 12)).foregroundStyle(pct >= 1 ? Palette.negative : Palette.muted)
        }
    }

    private var whereItWent: some View {
        Card {
            Text("Where it went").font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text).padding(.bottom, 12)
            StackedBar(segs: catSpend.map { ($0.color, $0.amount) }).padding(.bottom, 12)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible())], alignment: .leading, spacing: 8) {
                ForEach(catSpend.prefix(6)) { c in
                    HStack(spacing: 8) {
                        Circle().fill(c.color).frame(width: 10, height: 10)
                        Text(c.name).font(.system(size: 14)).foregroundStyle(Palette.muted).lineLimit(1)
                        Spacer(minLength: 4)
                        Text(formatCurrency(c.amount)).font(.system(size: 14)).foregroundStyle(Palette.text)
                    }
                }
            }
        }
    }

    private var recentCard: some View {
        Card {
            HStack {
                Text("Recent").font(.system(size: 14, weight: .medium)).foregroundStyle(Palette.text)
                Spacer()
                NavigationLink { TransactionsView() } label: {
                    Text("See all").font(.system(size: 14)).foregroundStyle(Palette.accent)
                }
            }
            if transactions.isEmpty {
                Text("No transactions yet. Tap + to log your first spend.")
                    .font(.system(size: 14)).foregroundStyle(Palette.muted).padding(.vertical, 16)
            } else {
                ForEach(Array(transactions.prefix(6))) { t in
                    NavigationLink {
                        TransactionDetailView(tx: t)
                    } label: {
                        TransactionRowView(tx: t, category: t.categoryID.flatMap { categoryByID[$0] }, account: accountByID[t.accountID])
                    }
                    Divider().overlay(Palette.border)
                }
            }
        }
    }
}

struct ProgressBar: View {
    var value: Double
    var color: Color
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.surface2)
                Capsule().fill(color).frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: 10)
    }
}
