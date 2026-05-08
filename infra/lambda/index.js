const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SUBMISSIONS_TABLE = process.env.SUBMISSIONS_TABLE;
const SETTINGS_TABLE    = process.env.SETTINGS_TABLE;

/**
 * Extract Cognito JWT claims that API Gateway injects into the request context.
 * API Gateway validates the token before invoking Lambda, so this is always
 * safe to trust on protected routes. Returns null on open routes (e.g. /submit).
 */
function extractClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims || null;
}

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
  const path   = event.rawPath || "/";
  const claims  = extractClaims(event); // present on auth-protected routes

  // NOTE: /submit is open (no JWT required). All other routes are protected by
  // the Cognito JWT authorizer at API Gateway level — Lambda never sees
  // unauthenticated calls for those paths.

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

  if (method === "GET" && path === "/submissions") {
    const date = (qs.date || "").trim();
    const shift = (qs.shift || "").trim();
    if (!date || !shift) return json(400, { error: "Missing date/shift query params" });

    const pk = `ORG#${orgId}#DATE#${date}`;
    const { Items } = await ddb.send(new QueryCommand({
      TableName: SUBMISSIONS_TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':sk': `SHIFT#${shift}`
      }
    }));
    const submissions = Items.filter(item => item.type === 'submission').map(item => ({
      id: `${item.pk}#${item.sk}`,
      orgId: item.orgId,
      date: item.date,
      shift: item.shift,
      staffInitials: item.staffInitials,
      payload: item.payload,
      createdAt: item.createdAt
    }));
    return json(200, { ok: true, submissions });
  }

  return json(404, { error: "Not found" });
};

