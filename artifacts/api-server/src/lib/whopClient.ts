import Whop from "@whop/sdk";

let clientPromise: Promise<Whop> | null = null;

async function initWhopClient(): Promise<Whop> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Missing Replit environment variables for the Whop connection.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=whop`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Whop connection: ${response.status}`);
  }

  const data = await response.json() as { items?: Array<{ settings?: { api_key?: string } }> };
  const apiKey = data.items?.[0]?.settings?.api_key;
  if (!apiKey) throw new Error("Whop is not connected or has no API key.");
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  return new Whop({
    apiKey,
    webhookKey: webhookSecret
      ? Buffer.from(webhookSecret, "utf8").toString("base64")
      : undefined,
  });
}

export function getWhopClient(): Promise<Whop> {
  if (!clientPromise) {
    clientPromise = initWhopClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}