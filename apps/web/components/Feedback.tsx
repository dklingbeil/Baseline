"use client";

import { useState } from "react";
import { postFeedback } from "@/lib/api";

export function Feedback({ deviationId }: { deviationId: string }) {
  const [answer, setAnswer] = useState<boolean | null>(null);

  async function send(accurate: boolean) {
    await postFeedback(deviationId, accurate);
    setAnswer(accurate);
  }

  return (
    <div className="row">
      <button aria-pressed={answer === true} onClick={() => send(true)}>
        ✓ Accurate
      </button>
      <button aria-pressed={answer === false} onClick={() => send(false)}>
        ✕ Incorrect
      </button>
    </div>
  );
}
