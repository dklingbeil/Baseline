const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SUBJECT_ID = process.env.NEXT_PUBLIC_SUBJECT_ID ?? "demo";

export type Direction = "up" | "down" | "steady";

export type Snapshot = {
  building: boolean;
  days_collected: number;
  days_needed: number;
  normal_range: number;
  series: { day: string; score: number | null }[];
  deviation: {
    id: string;
    onset: string;
    detected: string;
    score: number;
    domains: Record<string, Direction>;
  } | null;
  explanation: string | null;
  ai_generated: boolean;
};

export type CheckIn = {
  day: string;
  mood: number;
  energy: number;
  stress: number;
  sleep_quality: number;
};

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Subject-Id": SUBJECT_ID, ...init?.headers },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
}

export async function getBaseline(locale = "en"): Promise<Snapshot> {
  return (await request(`/v1/baseline?locale=${locale}`)).json();
}

export async function postCheckIn(checkin: CheckIn): Promise<void> {
  await request("/v1/checkins", { method: "POST", body: JSON.stringify(checkin) });
}

export async function postFeedback(deviationId: string, accurate: boolean): Promise<void> {
  await request(`/v1/deviations/${deviationId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ accurate }),
  });
}
