import { getCalendarDeadlines } from "@/lib/actions/analytics";
import { CalendarClient } from "./client";

export default async function CalendarPage() {
    const now = new Date();
    const { data } = await getCalendarDeadlines(now.getMonth() + 1, now.getFullYear());
    return <CalendarClient initialProofs={data} initialMonth={now.getMonth() + 1} initialYear={now.getFullYear()} />;
}
