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

  // Handle foto_contratto_processata updates directly
  if (body.foto_contratto_processata !== undefined && body.fail === undefined) {
    const { data, error } = await admin!
      .from("pezzi")
      .update({ foto_contratto_processata: body.foto_contratto_processata })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Handle fail updates with commissione recalculation
  const { fail } = body as { fail: number };

  if (typeof fail !== "number") {
    return NextResponse.json({ error: "fail must be a number" }, { status: 400 });
  }

  // Fetch the pezzi row
  const { data: pezzoRow, error: pezzoError } = await admin!
    .from("pezzi")
    .select("numero_pezzi, mix_value, tipo")
    .eq("id", id)
    .single();

  if (pezzoError || !pezzoRow) {
    return NextResponse.json({ error: "Pezzo not found" }, { status: 404 });
  }

  // Fetch commissioni_lookup for this mix_value
  const { data: lookup } = await admin!
    .from("commissioni_lookup")
    .select("starter_street, starter_evento")
    .eq("mix_value", pezzoRow.mix_value)
    .single();

  let newCommissione = 0;
  if (lookup) {
    const rate =
      pezzoRow.tipo === "street"
        ? Number(lookup.starter_street)
        : Number(lookup.starter_evento);
    newCommissione = rate * Math.max(0, pezzoRow.numero_pezzi - fail);
  }

  const { data, error } = await admin!
    .from("pezzi")
    .update({ fail, commissione: newCommissione })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fail, commissione: newCommissione, ...data });
}
