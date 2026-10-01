import Foundation

/// Uploads daily summaries to the engine (`POST /v1/health/daily`).
struct SyncService {
    // TODO: real auth and a configurable, EU-hosted base URL.
    var baseURL = URL(string: "http://localhost:8000")!
    var subjectID = "demo"
    var health = HealthKitClient()

    /// Uploads the last `days` complete days. Re-uploading a day overwrites it.
    func sync(days: Int = 7, now: Date = .now) async throws -> Int {
        var summaries: [HealthDaily] = []
        for offset in 1...days {
            let date = Calendar.current.date(byAdding: .day, value: -offset, to: now)!
            summaries.append(try await health.dailySummary(for: date))
        }

        var request = URLRequest(url: baseURL.appending(path: "v1/health/daily"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(subjectID, forHTTPHeaderField: "X-Subject-Id")
        request.httpBody = try JSONEncoder().encode(summaries)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return summaries.count
    }
}
