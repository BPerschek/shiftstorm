const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SUBMISSIONS_TABLE = process.env.SUBMISSIONS_TABLE;
const SETTINGS_TABLE = process.env.SETTINGS_TABLE;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

async function readJson(event) {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const method = (event.requestContext?.http?.method || "GET").toUpperCase();
  const path = event.rawPath || "/";

  // Minimal endpoints:
  // - POST /submit
  // - GET/PUT /settings/emails?orgId=...
  // - GET/PUT /leadership-notes?orgId=...&date=YYYY-MM-DD&shift=1st|2nd|3rd
  //
  // NOTE: Auth is intentionally not enforced yet (practice step: add JWT authorizer).
  // Use "orgId" as a tenant key (default "default").

  const qs = event.queryStringParameters || {};
  const orgId = (qs.orgId || "default").trim();

  if (method === "POST" && path === "/submit") {
    const payload = await readJson(event);
    if (!payload || typeof payload !== "object") return json(400, { error: "Invalid JSON" });
    const { date, shift, staffInitials } = payload;
    if (!date || !shift) return json(400, { error: "Missing date/shift" });

    const ts = Date.now();
    const pk = `ORG#${orgId}#DATE#${date}`;
    const sk = `SHIFT#${shift}#TS#${ts}`;

    await ddb.send(new PutCommand({
      TableName: SUBMISSIONS_TABLE,
      Item: {
        pk,
        sk,
        type: "submission",
        orgId,
        date,
        shift,
        staffInitials: staffInitials || "",
        payload,
        createdAt: ts
      }
    }));
    return json(200, { ok: true, id: { pk, sk } });
  }

  if ((method === "GET" || method === "PUT") && path === "/settings/emails") {
    const pk = `ORG#${orgId}#SETTINGS`;
    if (method === "PUT") {
      const payload = await readJson(event);
      const emails = Array.isArray(payload?.emails) ? payload.emails : null;
      if (!emails) return json(400, { error: "Expected { emails: string[] }" });
      const clean = Array.from(new Set(emails.map(e => String(e).trim()).filter(Boolean)));
      await ddb.send(new PutCommand({
        TableName: SETTINGS_TABLE,
        Item: { pk, type: "settings", orgId, emails: clean, updatedAt: Date.now() }
      }));
      return json(200, { ok: true, emails: clean });
    }
    const res = await ddb.send(new GetCommand({ TableName: SETTINGS_TABLE, Key: { pk } }));
    return json(200, { ok: true, emails: res.Item?.emails || [] });
  }

  if ((method === "GET" || method === "PUT") && path === "/leadership-notes") {
    const date = (qs.date || "").trim();
    const shift = (qs.shift || "").trim();
    if (!date || !shift) return json(400, { error: "Missing date/shift query params" });

    const pk = `ORG#${orgId}#LEAD#${date}`;
    const sk = `SHIFT#${shift}`;

    if (method === "PUT") {
      const payload = await readJson(event);
      const notes = String(payload?.notes || "");
      await ddb.send(new PutCommand({
        TableName: SUBMISSIONS_TABLE,
        Item: { pk, sk, type: "leadership_notes", orgId, date, shift, notes, updatedAt: Date.now() }
      }));
      return json(200, { ok: true });
    }

    const res = await ddb.send(new GetCommand({ TableName: SUBMISSIONS_TABLE, Key: { pk, sk } }));
    return json(200, { ok: true, notes: res.Item?.notes || "" });
  }

  return json(404, { error: "Not found" });
};

