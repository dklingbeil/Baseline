import Foundation

/// Mirrors `HealthDaily` in engine/src/baseline/schemas.py.
/// Daily summaries only: raw HealthKit samples never leave the device.
struct HealthDaily: Codable, Equatable {
    var day: String  // YYYY-MM-DD, local calendar day
    var sleepHours: Double?
    var steps: Int?
    var activeMinutes: Double?
    var restingHr: Double?
    var hrvMs: Double?

    enum CodingKeys: String, CodingKey {
        case day
        case sleepHours = "sleep_hours"
        case steps
        case activeMinutes = "active_minutes"
        case restingHr = "resting_hr"
        case hrvMs = "hrv_ms"
    }
}
