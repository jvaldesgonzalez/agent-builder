import { NextResponse } from "next/server";
import { BUILT_IN_SKILLS } from "@/lib/skills/registry";

export async function GET() {
  return NextResponse.json(BUILT_IN_SKILLS);
}
