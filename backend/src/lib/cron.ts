import { CronExpressionParser } from "cron-parser";
import { z } from "zod";

export function validateCron(expression: string): void {
  z.string().min(1).parse(expression);
  try {
    CronExpressionParser.parse(expression, { tz: "UTC" });
  } catch {
    throw new Error("Invalid cron expression");
  }
}

export function getNextRun(expression: string, from: Date = new Date()): Date {
  const interval = CronExpressionParser.parse(expression, { currentDate: from, tz: "UTC" });
  return interval.next().toDate();
}

export function describeCron(expression: string): string {
  try {
    const next = getNextRun(expression);
    return `Cron: ${expression} (UTC). Next: ${next.toISOString()}`;
  } catch {
    return expression;
  }
}

export function scheduleOccurrenceKey(jobId: string, dueAt: Date): string {
  return `${jobId}:${dueAt.toISOString()}`;
}
