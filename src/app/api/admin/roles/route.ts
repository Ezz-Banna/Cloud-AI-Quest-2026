import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readStore, writeStore } from "@/lib/data/repo";

// Delete a demo opportunity created through the employer portal. Seeded synthetic roles live in the repo and are not deletable here.
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const s = readStore();
  const before = (s.roles ?? []).length;
  s.roles = (s.roles ?? []).filter((r) => r.id !== id);
  if (s.roles.length === before) return NextResponse.json({ error: "Only demo roles created in the portal can be deleted" }, { status: 404 });
  writeStore(s);
  return NextResponse.json({ deleted: id });
}
