import SwiftUI
import SwiftData

struct TransactionDetailView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let tx: Transaction

    @Query private var categories: [Category]
    @Query private var accounts: [Account]
    @State private var showEdit = false

    private var category: Category? { tx.categoryID.flatMap { id in categories.first { $0.id == id } } }
    private var account: Account? { accounts.first { $0.id == tx.accountID } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Card {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(Palette.surface2).frame(width: 48, height: 48)
                            Text(category?.icon ?? "•").font(.system(size: 22))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(tx.note.isEmpty ? (category?.name ?? tx.type.label) : tx.note)
                                .font(.system(size: 18, weight: .semibold)).foregroundStyle(Palette.text)
                            Text(tx.type.label).font(.system(size: 12)).foregroundStyle(Palette.muted)
                        }
                        Spacer()
                    }
                    .padding(.bottom, 12)
                    Text(signedCurrency(tx.amount, direction: tx.type.direction))
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(tx.type.direction > 0 ? Palette.positive : Palette.text)
                    HStack(spacing: 8) {
                        if let c = category {
                            tag("\(c.icon) \(c.name)", color: Color(hex: c.colorHex))
                        }
                        tag(account?.name ?? "—", color: Palette.muted)
                        tag(longDate(tx.date), color: Palette.muted)
                    }
                    .padding(.top, 12)
                }

                Card {
                    Text("NOTE").font(.system(size: 11, weight: .semibold)).tracking(1).foregroundStyle(Palette.muted)
                    Text(tx.note.isEmpty ? "—" : tx.note).font(.system(size: 15)).foregroundStyle(Palette.text).padding(.top, 4)
                }

                Button { showEdit = true } label: {
                    Label("Edit", systemImage: "pencil")
                }.buttonStyle(PrimaryButtonStyle())

                Button(role: .destructive) {
                    context.delete(tx); try? context.save(); dismiss()
                } label: {
                    Label("Delete", systemImage: "trash").frame(maxWidth: .infinity)
                }
                .foregroundStyle(Palette.negative).padding(.vertical, 12)
                .background(Palette.negative.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(16)
        }
        .screenBackground()
        .navigationTitle("Detail")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showEdit) { TransactionEditorView(tx: tx) }
    }

    private func tag(_ text: String, color: Color) -> some View {
        Text(text).font(.system(size: 12)).foregroundStyle(color)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(color.opacity(0.15)).clipShape(Capsule())
    }
}

struct TransactionEditorView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    let tx: Transaction

    @Query private var categories: [Category]
    @Query(sort: \Account.createdAt) private var accounts: [Account]

    @State private var amount = ""
    @State private var categoryID: UUID?
    @State private var accountID: UUID?
    @State private var date = Date()
    @State private var note = ""

    private var live: [Account] { accounts.filter { !$0.archived } }
    private var cats: [Category] { categories.filter { $0.kind == (tx.type == .income ? .income : .expense) } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    labeled("Amount") {
                        TextField("0", text: $amount).keyboardType(.decimalPad)
                            .padding(12).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12)).foregroundStyle(Palette.text)
                    }
                    if tx.type != .transfer {
                        labeled("Category") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(cats) { c in
                                        chip("\(c.icon) \(c.name)", selected: categoryID == c.id) { categoryID = c.id }
                                    }
                                }
                            }
                        }
                    }
                    labeled("Account") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(live) { a in chip("\(a.icon) \(a.name)", selected: accountID == a.id) { accountID = a.id } }
                            }
                        }
                    }
                    labeled("Date") {
                        DatePicker("", selection: $date, displayedComponents: .date).labelsHidden().tint(Palette.accent)
                    }
                    labeled("Note") {
                        TextField("Optional", text: $note)
                            .padding(12).background(Palette.surface2).clipShape(RoundedRectangle(cornerRadius: 12)).foregroundStyle(Palette.text)
                    }
                    Button("Save changes", action: save).buttonStyle(PrimaryButtonStyle())
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Edit").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted) } }
            .onAppear {
                amount = String(tx.amount); categoryID = tx.categoryID; accountID = tx.accountID; date = tx.date; note = tx.note
            }
        }
    }

    private func labeled<C: View>(_ title: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 13, weight: .medium)).foregroundStyle(Palette.muted)
            content()
        }
    }
    private func chip(_ label: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label).font(.system(size: 14)).foregroundStyle(Palette.text)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(selected ? Palette.accent.opacity(0.25) : Palette.surface2)
                .clipShape(Capsule()).overlay(Capsule().stroke(selected ? Palette.accent : Palette.border, lineWidth: 1))
        }
    }
    private func save() {
        let v = Double(amount) ?? 0
        guard v > 0, let accID = accountID else { return }
        tx.amount = v
        tx.categoryID = tx.type == .transfer ? nil : categoryID
        tx.accountID = accID
        tx.date = date
        tx.note = note.trimmingCharacters(in: .whitespaces)
        try? context.save()
        dismiss()
    }
}
