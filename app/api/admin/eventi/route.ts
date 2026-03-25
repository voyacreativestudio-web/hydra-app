import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/app/api/admin/_check";

function getMondayOfWeek(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const { ok, res, admin } = await checkAdmin();
  if (!ok) return res!;

  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");

  if (!week) {
    return NextResponse.json(
      { error: "week query param required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const monday = getMondayOfWeek(week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const mondayStr = toLocalDateStr(monday);
  const sundayStr = toLocalDateStr(sunday);

  const { data, error } = await admin!
    .from("eventi")
    .select(
      "id, nome, indirizzo, lat, lng, data, orario_inizio, orario_fine, note, evento_assignments(count)"
    )
    .gte("data", mondayStr)
    .lte("data", sundayStr)
    .order("data")
    .order("orario_inizio");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { ok, res, admin } = await checkAdmin();
  if (!ok) return res!;

  const body = await req.json();
  const { nome, indirizzo, lat, lng, data, orario_inizio, orario_fine, note } =
    body;

  if (!nome || !indirizzo || !data || !orario_inizio) {
    return NextResponse.json(
      { error: "nome, indirizzo, data, orario_inizio are required" },
      { status: 400 }
    );
  }

  const insertData: Record<string, unknown> = {
    nome,
    indirizzo,
    data,
    orario_inizio,
  };
  if (lat !== undefined) insertData.lat = lat;
  if (lng !== undefined) insertData.lng = lng;
  if (orario_fine) insertData.orario_fine = orario_fine;
  if (note) insertData.note = note;

  const { data: newEvent, error } = await admin!
    .from("eventi")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newEvent, { status: 201 });
}
