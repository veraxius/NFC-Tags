import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requestId } from "./ids";
import { AuthError } from "./auth";

// TRS 26 — predictable API envelope
export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(
    { success: true, data, request_id: requestId() },
    init
  );
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message }, request_id: requestId() },
    { status }
  );
}

// Wraps a route handler with uniform error handling
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) {
        const status = err.code === "UNAUTHENTICATED" ? 401 : 403;
        return fail(err.code, err.message, status);
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION_ERROR", err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
      }
      console.error(err);
      return fail("INTERNAL_ERROR", "Unexpected server error.", 500);
    }
  };
}
