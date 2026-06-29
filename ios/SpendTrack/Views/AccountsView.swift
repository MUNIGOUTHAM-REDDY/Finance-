import SwiftUI
import SwiftData

struct AccountsView: View {
    @Query(sort: \Account.createdAt) private var accounts: [Account]
    @Query private var transactions: [Transaction]

    @State private var editing: Account?
    @State private var showNew = false

    private var balances: [UUID: Double] { balanceMap(accounts: accounts, transactions: transactions) }
    private var live: [Account] { accounts.filter { !$0.archived } }
    private var netWorth: Double { live.reduce(0) { $0 + (balances[$1.id] ?? 0) } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    Card {
                        Text("Net worth").font(.system(size: 14)).foregroundStyle(Palette.muted)
                        Text(formatCurrency(netWorth)).font(.system(size: 24, weight: .semibold)).foregroundStyle(Palette.text)
                            .padding(.top, 2)
                    }
                    if live.isEmpty {
                        Text("No accounts yet. Tap + to add one.")
                            .foregroundStyle(Palette.muted).font(.system(size: 14)).padding(.top, 24)
                    }
                    ForEach(live) { a in
                        Button { editing = a } label: {
                            AccountCardView(account: a, balance: balances[a.id] ?? 0)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Accounts")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNew = true } label: { Image(systemName: "plus").foregroundStyle(Palette.accent) }
                }
            }
            .sheet(item: $editing) { acc in AccountEditorView(account: acc) }
            .sheet(isPresented: $showNew) { AccountEditorView(account: nil) }
        }
    }
}

struct AccountCardView: View {
    let account: Account
    let balance: Double
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("\(account.icon) \(account.name)").font(.system(size: 16, weight: .semibold)).foregroundStyle(.white)
                Spacer()
                Image(systemName: "creditcard.fill").foregroundStyle(.white.opacity(0.7))
            }
            Text(account.type.label)
                .font(.system(size: 11)).foregroundStyle(.white)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(.white.opacity(0.15)).clipShape(Capsule())
                .padding(.top, 8)
            Text("BALANCE").font(.system(size: 11, weight: .semibold)).tracking(1).foregroundStyle(.white.opacity(0.6)).padding(.top, 24)
            Text(formatCurrency(balance)).font(.system(size: 24, weight: .semibold)).foregroundStyle(.white)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Color(hex: account.colorHex), Color(hex: "#0a0a0c")],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(.white.opacity(0.1), lineWidth: 1))
    }
}

struct AccountEditorView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let account: Account?

    @State private var name = ""
    @State private var type: AccountType = .bank
    @State private var opening = "0"
    @State private var icon = "🏦"
    @State private var colorHex = "#2a2a30"

    private let colors = ["#2a2a30","#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#475569"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    field("Name") {
                        TextField("e.g. HDFC, Cash", text: $name).textFieldStyle(.plain)
                            .padding(12).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(Palette.text)
                    }
                    field("Type") {
                        Picker("", selection: $type) {
                            ForEach(AccountType.allCases, id: \.self) { Text($0.label).tag($0) }
                        }.pickerStyle(.segmented)
                    }
                    HStack(spacing: 12) {
                        field("Icon") {
                            TextField("🏦", text: $icon).multilineTextAlignment(.center)
                                .padding(12).frame(width: 70).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12))
                                .foregroundStyle(Palette.text)
                        }
                        field(account == nil ? "Current balance" : "Opening balance") {
                            TextField("0", text: $opening).keyboardType(.decimalPad)
                                .padding(12).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12))
                                .foregroundStyle(Palette.text)
                        }
                    }
                    field("Card colour") {
                        HStack(spacing: 10) {
                            ForEach(colors, id: \.self) { c in
                                Circle()
                                    .fill(LinearGradient(colors: [Color(hex: c), Color(hex: "#0a0a0c")], startPoint: .topLeading, endPoint: .bottomTrailing))
                                    .frame(width: 32, height: 32)
                                    .overlay(Circle().stroke(.white, lineWidth: colorHex == c ? 2 : 0))
                                    .onTapGesture { colorHex = c }
                            }
                        }
                    }
                    if let acc = account {
                        Button(role: .destructive) {
                            context.delete(acc); try? context.save(); dismiss()
                        } label: { Text("Delete account").frame(maxWidth: .infinity) }
                            .foregroundStyle(Palette.negative).padding(.vertical, 12)
                    }
                    Button("Save", action: save).buttonStyle(PrimaryButtonStyle()).disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle(account == nil ? "New account" : "Edit account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted) } }
            .onAppear {
                if let a = account {
                    name = a.name; type = a.type; opening = String(a.openingBalance); icon = a.icon; colorHex = a.colorHex
                }
            }
        }
    }

    private func field<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.muted)
            content()
        }
    }

    private func save() {
        let bal = Double(opening) ?? 0
        if let a = account {
            a.name = name.trimmingCharacters(in: .whitespaces)
            a.typeRaw = type.rawValue
            a.openingBalance = bal
            a.icon = icon
            a.colorHex = colorHex
        } else {
            context.insert(Account(name: name.trimmingCharacters(in: .whitespaces), type: type, openingBalance: bal, icon: icon, colorHex: colorHex))
        }
        try? context.save()
        dismiss()
    }
}
