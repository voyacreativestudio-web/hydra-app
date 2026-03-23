import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/app/api/admin/_check";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ok, res, admin } = await checkAdmin();
  if (!ok) return res!;

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.importo !== undefined) update.importo = body.importo;
  if (body.verificato !== undefined) update.verificato = body.verificato;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await admin!
    .from("bonus")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
