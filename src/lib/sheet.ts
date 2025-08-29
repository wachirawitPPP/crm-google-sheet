import { google } from "googleapis";

export type Row = Record<string, string | number | boolean | null | undefined>;

function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const raw = process.env.GOOGLE_SHEETS_PRIVATE_KEY || "";
const privateKey = raw.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Missing Google Sheets credentials envs");
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheets() {
  const auth = getAuth();
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID as string;
  if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  return { sheets, spreadsheetId };
}

async function readRaw(sheet: string) {
  const { sheets, spreadsheetId } = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A:ZZ` });
  const rows = (res.data.values || []) as string[][];
  return rows;
}

export async function readObjects(sheet: string): Promise<Row[]> {
  const [header, ...body] = await readRaw(sheet);
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

export async function appendObject(sheet: string, obj: Row) {
  const { sheets, spreadsheetId } = await getSheets();
  const rows = await readRaw(sheet);
  const header = rows[0] || [];
  const record = header.map((h) => (obj[h] ?? "") as string | number);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheet}!A:ZZ`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [record] },
  });
}

export async function updateObjectById(sheet: string, idCol: string, idVal: string, obj: Row) {
  const { sheets, spreadsheetId } = await getSheets();
  const rows = await readRaw(sheet);
  const header = rows[0] || [];
  const idIdx = header.indexOf(idCol);
  if (idIdx < 0) throw new Error(`ID column ${idCol} not found`);
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[idIdx] === idVal);
  if (rowIndex < 0) throw new Error(`Row with ${idCol}=${idVal} not found`);
  const record = header.map((h) => (obj[h] ?? rows[rowIndex][header.indexOf(h)] ?? ""));
  const range = `${sheet}!A${rowIndex + 1}:ZZ${rowIndex + 1}`; // +1 for header +1 for 1-based index
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [record] },
  });
}

export async function upsertObjectById(sheet: string, idCol: string, idVal: string, obj: Row) {
  try {
    await updateObjectById(sheet, idCol, idVal, obj);
  } catch (e) {
    await appendObject(sheet, obj);
  }
}
