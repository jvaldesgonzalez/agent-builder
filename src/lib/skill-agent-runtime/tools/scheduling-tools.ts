import { tool } from "@langchain/core/tools";
import * as z from "zod";

/** Mock available slots - in production would query a calendar API */
const MOCK_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
];

export const checkTimeSlotsTool = tool(
  async ({ date }: { date: string }) => {
    if (!date) return "Error: Date is required (YYYY-MM-DD format).";

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return `Error: Invalid date format. Please use YYYY-MM-DD.`;
    }

    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return `No availability on weekends. ${date} falls on a ${dayOfWeek === 0 ? "Sunday" : "Saturday"}. Please choose a weekday.`;
    }

    return `Available time slots on ${date}:\n${MOCK_SLOTS.map((s) => `- ${s}`).join("\n")}`;
  },
  {
    name: "check_time_slots",
    description:
      "Check available time slots for a given date. Use before scheduling an appointment. Date format: YYYY-MM-DD.",
    schema: z.object({
      date: z.string().describe("Date in YYYY-MM-DD format"),
    }),
  }
);

export const scheduleEventTool = tool(
  async ({ date, time, email }: { date: string; time: string; email: string }) => {
    if (!date || !time || !email) {
      return "Error: date, time, and email are all required.";
    }

    const d = new Date(`${date}T${time}`);
    if (isNaN(d.getTime())) {
      return "Error: Invalid date or time format.";
    }

    // Mock confirmation
    return `Appointment confirmed!\n- Date: ${date}\n- Time: ${time}\n- Contact: ${email}\nA confirmation email will be sent to ${email}.`;
  },
  {
    name: "schedule_event",
    description:
      "Schedule an appointment for a given date, time, and contact email. Use after the user has selected a slot from check_time_slots.",
    schema: z.object({
      date: z.string().describe("Date in YYYY-MM-DD format"),
      time: z.string().describe("Time slot (e.g. 10:00)"),
      email: z.string().email().describe("Contact email for confirmation"),
    }),
  }
);
