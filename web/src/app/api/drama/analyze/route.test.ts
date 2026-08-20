import { describe, expect, it } from "vitest";

import { maxDuration } from "./route";

describe("POST /api/drama/analyze", () => {
    it("keeps script and visual analysis alive for the full text model timeout", () => {
        expect(maxDuration).toBeGreaterThanOrEqual(40 * 60);
    });
});
