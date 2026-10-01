import Foundation
import HealthKit

/// Reads HealthKit and reduces it to one `HealthDaily` per calendar day.
struct HealthKitClient {
    private let store = HKHealthStore()
    private let calendar = Calendar.current

    private static let readTypes: Set<HKObjectType> = [
        HKCategoryType(.sleepAnalysis),
        HKQuantityType(.stepCount),
        HKQuantityType(.appleExerciseTime),
        HKQuantityType(.restingHeartRate),
        HKQuantityType(.heartRateVariabilitySDNN),
    ]

    static var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    func requestAuthorization() async throws {
        try await store.requestAuthorization(toShare: [], read: Self.readTypes)
    }

    func dailySummary(for date: Date) async throws -> HealthDaily {
        let start = calendar.startOfDay(for: date)
        let end = calendar.date(byAdding: .day, value: 1, to: start)!
        let bpm = HKUnit.count().unitDivided(by: .minute())

        return HealthDaily(
            day: start.formatted(.iso8601.year().month().day().dateSeparator(.dash)),
            sleepHours: try await sleepHours(endingOn: start),
            steps: try await statistic(.stepCount, .cumulativeSum, start, end)?
                .sumQuantity().map { Int($0.doubleValue(for: .count())) },
            activeMinutes: try await statistic(.appleExerciseTime, .cumulativeSum, start, end)?
                .sumQuantity()?.doubleValue(for: .minute()),
            restingHr: try await statistic(.restingHeartRate, .discreteAverage, start, end)?
                .averageQuantity()?.doubleValue(for: bpm),
            hrvMs: try await statistic(.heartRateVariabilitySDNN, .discreteAverage, start, end)?
                .averageQuantity()?.doubleValue(for: .secondUnit(with: .milli))
        )
    }

    private func statistic(
        _ id: HKQuantityTypeIdentifier,
        _ options: HKStatisticsOptions,
        _ start: Date,
        _ end: Date
    ) async throws -> HKStatistics? {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        let descriptor = HKStatisticsQueryDescriptor(
            predicate: .quantitySample(type: HKQuantityType(id), predicate: predicate),
            options: options
        )
        return try await descriptor.result(for: store)
    }

    /// Time asleep in the night ending on `day`: 18:00 the evening before to 18:00.
    private func sleepHours(endingOn day: Date) async throws -> Double? {
        let end = calendar.date(byAdding: .hour, value: 18, to: day)!
        let start = calendar.date(byAdding: .day, value: -1, to: end)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        let descriptor = HKSampleQueryDescriptor(
            predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: predicate)],
            sortDescriptors: []
        )
        let asleep = Set(HKCategoryValueSleepAnalysis.allAsleepValues.map(\.rawValue))
        // TODO: merge overlapping samples when several sources (watch + phone) record the same night.
        let seconds = try await descriptor.result(for: store)
            .filter { asleep.contains($0.value) }
            .reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
        return seconds > 0 ? seconds / 3600 : nil
    }
}
