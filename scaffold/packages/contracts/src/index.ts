/**
 * Barrel re-export of the contract package.
 *
 * Single source of truth for the cross-app contract: the messaging topology,
 * the versioned event payload, and the HTTP DTOs (zod). Imported COMPILED
 * (from ./dist) by the API/worker (NestJS) and the web app (Next.js).
 *
 * Add one file per bounded concept and re-export it here — producer (API),
 * consumer (worker) and web all import these symbols; nobody redeclares an
 * exchange name, routing key or event shape on its own.
 */
export * from "./events";
export * from "./dtos";
