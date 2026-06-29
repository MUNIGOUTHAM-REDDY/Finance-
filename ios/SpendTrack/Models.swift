import Foundation
import SwiftData

// MARK: - Enums

enum AccountType: String, CaseIterable, Codable {
    case bank, upi, cash, creditCard = "credit_card", wallet
    var label: String {
        switch self {
        case .bank: return "Bank"
        case .upi: return "UPI"
        case .cash: return "Cash"
        case .creditCard: return "Credit card"
        case .wallet: return "Wallet"
        }
    }
}

enum CategoryKind: String, Codable { case expense, income }

enum TxType: String, CaseIterable, Codable {
    case expense, income, transfer
    case loanGiven = "loan_given"
    case loanRepaidToMe = "loan_repaid_to_me"
    case loanTaken = "loan_taken"
    case loanRepaidByMe = "loan_repaid_by_me"

    /// +1 money in, -1 money out, 0 neutral (transfer).
    var direction: Int {
        switch self {
        case .income, .loanRepaidToMe, .loanTaken: return 1
        case .expense, .loanGiven, .loanRepaidByMe: return -1
        case .transfer: return 0
        }
    }
    var label: String {
        switch self {
        case .expense: return "Expense"
        case .income: return "Income"
        case .transfer: return "Transfer"
        case .loanGiven: return "Lent"
        case .loanRepaidToMe: return "Repaid to me"
        case .loanTaken: return "Borrowed"
        case .loanRepaidByMe: return "Repaid by me"
        }
    }
}

enum RecurringKind: String, CaseIterable, Codable { case emi, rent, subscription, other }
enum Frequency: String, CaseIterable, Codable { case monthly, weekly, yearly }
enum LoanDirection: String, Codable { case lent, borrowed }
enum LoanStatus: String, Codable { case open, settled }

// MARK: - SwiftData models (foreign keys stored as UUIDs, like the web app)

@Model final class Account {
    @Attribute(.unique) var id: UUID
    var name: String
    var typeRaw: String
    var openingBalance: Double
    var icon: String
    var colorHex: String
    var archived: Bool
    var createdAt: Date

    init(name: String, type: AccountType, openingBalance: Double = 0,
         icon: String = "💳", colorHex: String = "#2a2a30") {
        self.id = UUID()
        self.name = name
        self.typeRaw = type.rawValue
        self.openingBalance = openingBalance
        self.icon = icon
        self.colorHex = colorHex
        self.archived = false
        self.createdAt = Date()
    }
    var type: AccountType { AccountType(rawValue: typeRaw) ?? .bank }
}

@Model final class Category {
    @Attribute(.unique) var id: UUID
    var name: String
    var kindRaw: String
    var icon: String
    var colorHex: String
    var createdAt: Date

    init(name: String, kind: CategoryKind, icon: String, colorHex: String) {
        self.id = UUID()
        self.name = name
        self.kindRaw = kind.rawValue
        self.icon = icon
        self.colorHex = colorHex
        self.createdAt = Date()
    }
    var kind: CategoryKind { CategoryKind(rawValue: kindRaw) ?? .expense }
}

@Model final class Transaction {
    @Attribute(.unique) var id: UUID
    var typeRaw: String
    var amount: Double
    var accountID: UUID
    var toAccountID: UUID?
    var categoryID: UUID?
    var loanID: UUID?
    var recurringID: UUID?
    var date: Date
    var note: String
    var createdAt: Date

    init(type: TxType, amount: Double, accountID: UUID, categoryID: UUID? = nil,
         toAccountID: UUID? = nil, loanID: UUID? = nil, date: Date = Date(), note: String = "") {
        self.id = UUID()
        self.typeRaw = type.rawValue
        self.amount = amount
        self.accountID = accountID
        self.toAccountID = toAccountID
        self.categoryID = categoryID
        self.loanID = loanID
        self.recurringID = nil
        self.date = date
        self.note = note
        self.createdAt = Date()
    }
    var type: TxType { TxType(rawValue: typeRaw) ?? .expense }
}

@Model final class Recurring {
    @Attribute(.unique) var id: UUID
    var name: String
    var kindRaw: String
    var amount: Double
    var accountID: UUID
    var categoryID: UUID?
    var frequencyRaw: String
    var dueDay: Int
    var nextDueDate: Date
    var installmentsTotal: Int?
    var active: Bool
    var createdAt: Date

    init(name: String, kind: RecurringKind, amount: Double, accountID: UUID,
         categoryID: UUID?, frequency: Frequency, dueDay: Int, nextDueDate: Date,
         installmentsTotal: Int? = nil) {
        self.id = UUID()
        self.name = name
        self.kindRaw = kind.rawValue
        self.amount = amount
        self.accountID = accountID
        self.categoryID = categoryID
        self.frequencyRaw = frequency.rawValue
        self.dueDay = dueDay
        self.nextDueDate = nextDueDate
        self.installmentsTotal = installmentsTotal
        self.active = true
        self.createdAt = Date()
    }
    var kind: RecurringKind { RecurringKind(rawValue: kindRaw) ?? .other }
    var frequency: Frequency { Frequency(rawValue: frequencyRaw) ?? .monthly }
}

@Model final class Loan {
    @Attribute(.unique) var id: UUID
    var personName: String
    var directionRaw: String
    var principal: Double
    var accountID: UUID?
    var date: Date
    var note: String
    var statusRaw: String
    var createdAt: Date

    init(personName: String, direction: LoanDirection, principal: Double,
         accountID: UUID?, date: Date = Date(), note: String = "") {
        self.id = UUID()
        self.personName = personName
        self.directionRaw = direction.rawValue
        self.principal = principal
        self.accountID = accountID
        self.date = date
        self.note = note
        self.statusRaw = LoanStatus.open.rawValue
        self.createdAt = Date()
    }
    var direction: LoanDirection { LoanDirection(rawValue: directionRaw) ?? .lent }
    var status: LoanStatus { get { LoanStatus(rawValue: statusRaw) ?? .open } set { statusRaw = newValue.rawValue } }
}

@Model final class Budget {
    @Attribute(.unique) var id: UUID
    var categoryID: UUID?   // nil == overall monthly budget
    var amount: Double

    init(categoryID: UUID?, amount: Double) {
        self.id = UUID()
        self.categoryID = categoryID
        self.amount = amount
    }
}
