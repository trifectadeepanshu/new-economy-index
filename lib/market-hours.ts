import { toZonedTime } from "date-fns-tz";

const IST = "Asia/Kolkata";

// NSE trading hours: Mon–Fri, 09:15–15:30 IST
export function isMarketOpen(now: Date = new Date()): boolean {
  const ist = toZonedTime(now, IST);
  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const h = ist.getHours();
  const m = ist.getMinutes();
  const minutes = h * 60 + m;

  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30;
}

export function getISTDate(now: Date = new Date()): string {
  const ist = toZonedTime(now, IST);
  const y = ist.getFullYear();
  const mo = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function formatLastUpdated(date: Date, now: number | Date = Date.now()): string {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const diffMs = nowMs - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h ago`;
}
