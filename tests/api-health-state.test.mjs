import assert from "node:assert/strict";
import test from "node:test";

let healthStateModule;

try {
  healthStateModule = await import("../src/components/api-health-state.ts");
} catch {
  healthStateModule = null;
}

test("checking state never reports the backend as offline", () => {
  assert.ok(healthStateModule, "expected the API health state model to exist");

  const status = healthStateModule.getApiHealthViewStatus(null, true);
  const copy = healthStateModule.getApiHealthStatusCopy(status);

  assert.equal(status, "checking");
  assert.equal(copy.label, "Checking backend...");
  assert.doesNotMatch(copy.hint, /offline/i);
});
