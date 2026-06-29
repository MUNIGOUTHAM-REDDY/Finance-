import SwiftUI
import SwiftData

struct QuickAddView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \Account.createdAt) private var accounts: [Account]
    @Query private var categories: [Category]

    @State private var txType: TxType = .expense
    @State private var amount = "0"
    @State private var categoryID: UUID?
    @State private var accountID: UUID?
    @State private var toAccountID: UUID?
    @State private var date = Date()
    @State private var note = ""

    private var liveAccounts: [Account] { accounts.filter { !$0.archived } }
    private var visibleCategories: [Category] {
        categories.filter { $0.kind == (txType == .income ? .income : .expense) }
    }
    private let keys = ["1","2","3","4","5","6","7","8","9",".","0","del"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Picker("", selection: $txType) {
                        Text("Expense").tag(TxType.expense)
                        Text("Income").tag(TxType.income)
                        Text("Transfer").tag(TxType.transfer)
                    }
                    .pickerStyle(.segmented)

                    Text("₹\(amount)")
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .padding(.vertical, 4)

                    keypad

                    if txType != .transfer {
                        chipSection(title: "Category") {
                            ForEach(visibleCategories) { c in
                                chip(label: "\(c.icon) \(c.name)", selected: categoryID == c.id) {
                                    categoryID = c.id
                                }
                            }
                        }
                    }

                    chipSection(title: txType == .transfer ? "From" : "Account") {
                        ForEach(liveAccounts) { a in
                            chip(label: "\(a.icon) \(a.name)", selected: accountID == a.id) { accountID = a.id }
                        }
                    }

                    if txType == .transfer {
                        chipSection(title: "To") {
                            ForEach(liveAccounts) { a in
                                chip(label: "\(a.icon) \(a.name)", selected: toAccountID == a.id) { toAccountID = a.id }
                            }
                        }
                    }

                    TextField("Note (optional)", text: $note)
                        .padding(12)
                        .background(Palette.surface2)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .foregroundStyle(Palette.text)

                    Button("Save", action: save)
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled((Double(amount) ?? 0) <= 0 || accountID == nil)
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Add")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted)
                }
            }
            .onAppear {
                if accountID == nil { accountID = liveAccounts.first?.id }
                if toAccountID == nil, liveAccounts.count > 1 { toAccountID = liveAccounts[1].id }
            }
        }
    }

    private var keypad: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
            ForEach(keys, id: \.self) { k in
                Button { press(k) } label: {
                    Text(k == "del" ? "⌫" : k)
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(Palette.text)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Palette.surface2)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
    }

    private func chipSection<C: View>(title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) { content() }
            }
        }
    }

    private func chip(label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(Palette.text)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(selected ? Palette.accent.opacity(0.25) : Palette.surface2)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(selected ? Palette.accent : Palette.border, lineWidth: 1))
        }
    }

    private func press(_ k: String) {
        if k == "del" {
            amount = amount.count <= 1 ? "0" : String(amount.dropLast())
        } else if k == "." {
            if !amount.contains(".") { amount += "." }
        } else {
            if amount.contains("."), let frac = amount.split(separator: ".").last, frac.count >= 2 { return }
            amount = amount == "0" ? k : amount + k
        }
    }

    private func save() {
        let value = Double(amount) ?? 0
        guard value > 0, let accID = accountID else { return }
        if txType == .transfer, accID == toAccountID { return }
        let tx = Transaction(
            type: txType,
            amount: value,
            accountID: accID,
            categoryID: txType == .transfer ? nil : categoryID,
            toAccountID: txType == .transfer ? toAccountID : nil,
            date: date,
            note: note.trimmingCharacters(in: .whitespaces)
        )
        context.insert(tx)
        try? context.save()
        dismiss()
    }
}
