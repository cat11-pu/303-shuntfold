import assert from "node:assert";
import { tokenKind, foldToken } from "../shunt.js";
import { step, close } from "../shuntrun.js";
import { render } from "../app.js";

const base = {
  budget: 2,
  state: { output: [], ops: [], operands: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "token", text: "1" }],
  token_error_code: "E_BAD_TOKEN", operand_error_code: "E_MISSING_OPERAND",
  paren_error_code: "E_UNBALANCED", count_error_code: "E_INCOMPLETE"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("tokenKind returns a word", () => {
  assert.strictEqual(typeof tokenKind("1"), "string");
});

check("foldToken returns a carry", () => {
  const got = foldToken({ output: [], ops: [], operands: 0 }, "1");
  assert.strictEqual(typeof got, "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  const mid = step(base);
  assert.strictEqual(typeof close(Object.assign({}, base, { state: mid.state })).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
