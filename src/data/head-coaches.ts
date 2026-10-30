import coaches from "./head-coaches.json";

/**
 * Each school's head coach for the 2026 season, by school id: 669 of the 670 schools (Southern Virginia's job is open).
 * From Wikipedia's "List of current NCAA Division I FBS / FCS / Division II / Division III football coaches" (Oct 30, 2026).
 * Coaches change mid-season, so a name typed into a school's contacts always wins over this list.
 */
export const HEAD_COACHES: Record<string, string> = coaches;
export const HEAD_COACH_SOURCE = { label: "Wikipedia's lists of current NCAA football head coaches", date: "2026-10-30" };
