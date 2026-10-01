import SwiftUI

/// Companion app: its only job in the MVP is consent for and sync of Apple Health.
/// The baseline home screen lives in the web prototype.
struct ContentView: View {
    @State private var status = "Apple Health is not connected."
    @State private var busy = false

    private let sync = SyncService()

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Baseline").font(.largeTitle.bold())
            Text("Baseline reads daily totals for sleep, steps, exercise, resting heart rate and HRV. Raw samples stay on your phone.")
                .foregroundStyle(.secondary)
            Button("Connect Apple Health and sync") { Task { await connect() } }
                .buttonStyle(.borderedProminent)
                .disabled(busy || !HealthKitClient.isAvailable)
            Text(status).font(.footnote)
            Spacer()
        }
        .padding()
    }

    private func connect() async {
        busy = true
        defer { busy = false }
        do {
            try await sync.health.requestAuthorization()
            let count = try await sync.sync()
            status = "Synced \(count) days."
        } catch {
            status = "Sync failed: \(error.localizedDescription)"
        }
    }
}
