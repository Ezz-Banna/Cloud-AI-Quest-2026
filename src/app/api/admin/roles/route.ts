import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readStore, updateStore } from "@/lib/data/repo";

// Delete a demo opportunity created through the employer portal, with its access token and anything shared with it.
// Seeded synthetic roles live in the repo and are not deletable here.
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!(readStore().roles ?? []).some((r) => r.id === id)) return NextResponse.json({ error: "Only demo roles created in the portal can be deleted" }, { status: 404 });
  const ok = updateStore((s) => {
    s.roles = (s.roles ?? []).filter((r) => r.id !== id);
    s.candidates = (s.candidates ?? []).filter((c) => c.role_id !== id);
    if (s.role_tokens && id) delete s.role_tokens[id];
  });
  if (!ok) return NextResponse.json({ error: "Could not save the change. Nothing was deleted." }, { status: 503 });
  return NextResponse.json({ deleted: id });
}
