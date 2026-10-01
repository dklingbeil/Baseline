import { BaselineChart } from "@/components/BaselineChart";
import { Feedback } from "@/components/Feedback";
import { getBaseline, type Direction } from "@/lib/api";

export const dynamic = "force-dynamic";

const ARROW: Record<Direction, string> = { up: "↑", down: "↓", steady: "≈" };

export default async function Home() {
  const snapshot = await getBaseline();

  if (snapshot.building) {
    return (
      <>
        <h1>Building your Baseline</h1>
        <p>
          {snapshot.days_collected} of {snapshot.days_needed} days collected. Baseline needs a few weeks to learn
          what is normal for you.
        </p>
      </>
    );
  }

  const { deviation } = snapshot;
  return (
    <>
      <h1>Your Baseline</h1>
      <BaselineChart snapshot={snapshot} />
      {deviation ? (
        <>
          <ul className="domains">
            {Object.entries(deviation.domains).map(([domain, direction]) => (
              <li key={domain}>
                <span>{domain}</span>
                <span>{ARROW[direction]}</span>
              </li>
            ))}
          </ul>
          <p>{snapshot.explanation}</p>
          {snapshot.ai_generated && <p className="muted">This explanation was written by AI.</p>}
          <Feedback deviationId={deviation.id} />
        </>
      ) : (
        <p>You are within your normal range.</p>
      )}
    </>
  );
}
