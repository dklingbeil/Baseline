"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postCheckIn } from "@/lib/api";

const QUESTIONS = [
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "stress", label: "Stress" },
  { key: "sleep_quality", label: "How did you sleep?" },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];

export default function CheckInPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<Record<Key, number>>>({});
  const complete = QUESTIONS.every((q) => answers[q.key] !== undefined);

  async function submit() {
    const day = new Date().toLocaleDateString("sv"); // local YYYY-MM-DD
    await postCheckIn({ day, ...(answers as Record<Key, number>) });
    router.push("/");
  }

  return (
    <>
      <h1>Daily check-in</h1>
      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <div>{q.label}</div>
          <div className="row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                aria-pressed={answers[q.key] === n}
                onClick={() => setAnswers({ ...answers, [q.key]: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="primary" disabled={!complete} onClick={submit}>
        Save
      </button>
    </>
  );
}
