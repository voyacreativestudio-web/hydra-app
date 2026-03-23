import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/app/api/admin/_check";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ok, res, admin } = await checkAdmin();
  if (!ok) return res!;

  const { id } = await params;

  const { data, error } = await admin!
    .from("evento_assignments")
    .select("id, user_id, profiles(full_name)")
    .eq("evento_id", id)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ok, res, admin } = await checkAdmin();
  if (!ok) return res!;

  const { id } = await params;
  const body = await req.json();
  const { user_ids } = body as { user_ids: string[] };

  if (!Array.isArray(user_ids)) {
    return NextResponse.json(
      { error: "user_ids must be an array" },
      { status: 400 }
    );
  }

  // Delete all existing assignments for this event
  const { error: deleteError } = await admin!
    .from("evento_assignments")
    .delete()
    .eq("evento_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new assignments
  if (user_ids.length > 0) {
    const inserts = user_ids.map((user_id) => ({
      evento_id: id,
      user_id,
    }));

    const { error: insertError } = await admin!
      .from("evento_assignments")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, count: user_ids.length });
}
