/**
 * Integration adapter contract.
 *
 * Adapters are responsible for: validating credentials, fetching external data,
 * and normalizing it into CommercePulse schemas. The sync engine calls them.
 */
export interface IntegrationAdapter {
  platform: string;
  displayName: string;
  /** True if real credentials are required to operate. */
  requiresCredentials: boolean;
  /** Validate stored credentials. Throws on failure. */
  validate(credentials: Record<string, unknown>): Promise<void>;
  /** Fetch + normalize + persist data into our DB for the given user. */
  sync(userId: string, credentials: Record<string, unknown>): Promise<SyncResult>;
}

export interface SyncResult {
  ordersAdded: number;
  productsAdded: number;
  customersAdded: number;
  campaignsAdded: number;
  metricsAdded: number;
}

export const ZERO_SYNC: SyncResult = {
  ordersAdded: 0,
  productsAdded: 0,
  customersAdded: 0,
  campaignsAdded: 0,
  metricsAdded: 0,
};
