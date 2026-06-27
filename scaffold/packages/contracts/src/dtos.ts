/**
 * HTTP DTOs (zod) for the <Feature> bounded context, plus the generic
 * pagination contract and the structured-output envelope.
 *
 * Schema-first, one source: every DTO is a zod schema and its TypeScript type
 * is DERIVED via z.infer — never hand-write a type next to a schema, or the two
 * drift. Validation at the HTTP boundary uses these same schemas (the API's
 * ZodValidationPipe), so the wire shape and the runtime check can never diverge.
 */
import { z } from "zod";

// ── Structured output envelope ────────────────────────────────────────────────
// Machine consumers (the worker, the web, downstream automation) act on FIELDS,
// never on parsed prose. The envelope is versioned + discriminated; arrays
// default to [] so a consumer never sees `undefined`; optional additive fields
// stay ABSENT on legacy paths.

/** Result of executing a <Feature> — the structured, machine-consumable reply. */
export const FeatureResultSchema = z.object({
  version: z.literal(1),
  /** Routed intent (the deterministic path that produced this result). */
  intent: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  outcome: z.enum(["success", "no_data", "needs_refinement", "blocked", "error"]),
  summary: z.string(),
  /** The actual <Entity> rows. Defaulted so consumers never branch on undefined. */
  data: z.array(z.record(z.string(), z.unknown())).default([]),
  /** Audit breadcrumbs — which source produced the data + a non-PII query hash. */
  citations: z
    .array(z.object({ source: z.string(), queryHash: z.string() }))
    .default([]),
  /** Output-policy verdict (layer-3 guardrail): what was allowed / redacted. */
  policy: z.object({
    allowed: z.boolean(),
    redactedFields: z.array(z.string()).default([]),
    reason: z.string().nullable().default(null),
  }),
  /**
   * Optional ADDITIVE fields — present only when a later, opt-in capability
   * produced the reply; ABSENT on the keyless / deterministic default path.
   * Adding optional fields here is a non-breaking event/contract evolution.
   */
  variant: z.string().optional(),
});
export type FeatureResult = z.infer<typeof FeatureResultSchema>;

// ── Request / response DTOs ───────────────────────────────────────────────────

/** Request body for POST /v1/feature. */
export const ExecuteFeatureSchema = z.object({
  body: z.string().trim().min(1, "body must not be empty").max(4000),
  conversationId: z.string().uuid().optional(),
});
export type ExecuteFeatureRequest = z.infer<typeof ExecuteFeatureSchema>;

/** Response body for POST /v1/feature. */
export const ExecuteFeatureResponseSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  result: FeatureResultSchema,
  sentAt: z.string(),
});
export type ExecuteFeatureResponse = z.infer<typeof ExecuteFeatureResponseSchema>;

/** One item of the GET /v1/feature/items response (read-back of persisted rows). */
export const FeatureItemSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  authorId: z.string(),
  body: z.string(),
  result: FeatureResultSchema,
  createdAt: z.string(),
});
export type FeatureItem = z.infer<typeof FeatureItemSchema>;

// ── Generic pagination ────────────────────────────────────────────────────────

/** Generic paginated list response, shared across list endpoints. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Common query-string params for paginated lists. z.coerce because query
 *  strings arrive as strings and must be coerced to numbers. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ── Auth token claims (Architecture A) ────────────────────────────────────────

/** Claims carried by the short-lived HS256 API token minted by web, verified
 *  by the API. `tenant` is the scope used everywhere downstream — derived here
 *  from the authenticated session, never from request input. */
export interface ApiTokenClaims {
  sub: string;
  email: string;
  roles: string[];
  tenant: string;
  iss: string;
  aud: string;
  exp?: number;
  iat?: number;
}
