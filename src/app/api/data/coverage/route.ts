import { NextResponse } from "next/server";
import { coverage, getCourses, getPrograms, getScholarships, getUniversities } from "@/lib/data/repo";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ coverage: coverage(), universities: getUniversities(), programs: getPrograms(), scholarships: getScholarships(), courses: getCourses() });
}
