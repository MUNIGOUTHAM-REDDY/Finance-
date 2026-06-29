import SwiftUI

extension Color {
    init(hex: String) {
        let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: s).scanHexInt64(&int)
        let r, g, b: UInt64
        if s.count == 6 {
            (r, g, b) = (int >> 16 & 0xff, int >> 8 & 0xff, int & 0xff)
        } else {
            (r, g, b) = (255, 255, 255)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255)
    }
}

enum Palette {
    static let bg = Color.black
    static let surface = Color(hex: "#121214")
    static let surface2 = Color(hex: "#1c1c20")
    static let border = Color(hex: "#2a2a30")
    static let muted = Color(hex: "#8c8c94")
    static let text = Color(hex: "#f4f4f6")
    static let accent = Color(hex: "#3b82f6")
    static let positive = Color(hex: "#22c55e")
    static let negative = Color(hex: "#ef4444")
    static let warn = Color(hex: "#f59e0b")
}

// Card container matching the web app's rounded surface.
struct Card<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Palette.border, lineWidth: 1)
            )
    }
}
