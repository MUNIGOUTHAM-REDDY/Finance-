import SwiftUI
import SwiftData

struct TransactionsView: View {
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    @Query private var categories: [Category]
    @Query private var accounts: [Account]

    @State private var filter: TxFilter = .all
    @State private var search = ""

    enum TxFilter: String, CaseIterable { case all = "All", expense = "Expense", income = "Income", transfer = "Transfer" }

    private var categoryByID: [UUID: Category] { Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) }) }
    private var accountByID: [UUID: Account] { Dictionary(uniqueKeysWithValues: accounts.map { ($0.id, $0) }) }

    private var filtered: [Transaction] {
        transactions.filter { t in
            switch filter {
            case .all: break
            case .expense: if t.type != .expense { return false }
            case .income: if t.type != .income { return false }
            case .transfer: if t.type != .transfer { return false }
            }
            if !search.isEmpty, !t.note.lowercased().contains(search.lowercased()) { return false }
            return true
        }
    }

    private var grouped: [(day: Date, items: [Transaction])] {
        let cal = Calendar.current
        let dict = Dictionary(grouping: filtered) { cal.startOfDay(for: $0.date) }
        return dict.keys.sorted(by: >).map { (day: $0, items: dict[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("", selection: $filter) {
                        ForEach(TxFilter.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }.pickerStyle(.segmented)

                    if grouped.isEmpty {
                        Text("Nothing here yet.").foregroundStyle(Palette.muted).font(.system(size: 14)).padding(.top, 24)
                    }
                    ForEach(grouped, id: \.day) { group in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(longDate(group.day).uppercased())
                                .font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.muted)
                            Card {
                                ForEach(Array(group.items.enumerated()), id: \.element.id) { idx, t in
                                    NavigationLink {
                                        TransactionDetailView(tx: t)
                                    } label: {
                                        TransactionRowView(tx: t, category: t.categoryID.flatMap { categoryByID[$0] }, account: accountByID[t.accountID])
                                    }
                                    if idx < group.items.count - 1 { Divider().overlay(Palette.border) }
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Activity")
            .searchable(text: $search, prompt: "Search notes")
        }
    }
}
