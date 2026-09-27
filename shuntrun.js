// shuntrun.js：按处理预算处理并留账，收尾不限预算清账
import { tokenKind, foldToken } from "./shunt.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codesOf(spec) {
  return {
    token: spec.token_error_code || "E_BAD_TOKEN",
    operand: spec.operand_error_code || "E_MISSING_OPERAND",
    paren: spec.paren_error_code || "E_UNBALANCED",
    count: spec.count_error_code || "E_INCOMPLETE"
  };
}

function freshState(state) {
  const s = state || {};
  return {
    output: (s.output || []).slice(),
    ops: (s.ops || []).slice(),
    operands: s.operands || 0,
    ledger: (s.ledger || []).map(function (row) { return Array.isArray(row) ? row.slice() : row; }),
    applied: (s.applied || []).slice()
  };
}

function foldInto(state, text, codes) {
  const carry = foldToken({ output: state.output, ops: state.ops, operands: state.operands }, text, codes);
  state.output = carry.output;
  state.ops = carry.ops;
  state.operands = carry.operands;
}

export function step(spec) {
  const events = spec.events || [];
  if (!Array.isArray(events)) fail("E_BAD_EVENT", "事件不是列表");
  events.forEach(function (event) {
    if (!event || typeof event !== "object" || event.kind !== "token" || typeof event.text !== "string") {
      fail("E_BAD_EVENT", "事件结构不合法");
    }
  });
  const budget = Number.isFinite(spec.budget) ? Math.max(0, Math.floor(spec.budget)) : 0;
  const codes = codesOf(spec);
  const state = freshState(spec.state);
  let remaining = budget;
  let served = 0;
  while (state.ledger.length && remaining > 0) {
    const row = state.ledger.shift();
    foldInto(state, row[1], codes);
    state.applied.push(row[2] !== undefined ? row[2] : ["ledger", row[1]]);
    remaining -= 1;
    served += 1;
  }
  events.forEach(function (event) {
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) return;
    if (remaining > 0) {
      foldInto(state, event.text, codes);
      state.applied.push(event.id !== undefined ? event.id : [event.kind, event.text]);
      remaining -= 1;
      served += 1;
    } else {
      state.ledger.push(event.id !== undefined ? [event.kind, event.text, event.id] : [event.kind, event.text]);
    }
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return [row[0], row[1]]; }),
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const codes = codesOf(spec);
  const state = freshState(spec.state);
  let catchup = 0;
  while (state.ledger.length) {
    const row = state.ledger.shift();
    foldInto(state, row[1], codes);
    state.applied.push(row[2] !== undefined ? row[2] : ["ledger", row[1]]);
    catchup += 1;
  }
  while (state.ops.length) {
    const top = state.ops.pop();
    if (top === "(") fail(codes.paren, "收尾时栈里还剩左括号");
    state.output.push(top);
  }
  if (state.operands !== 1) fail(codes.count, "收尾计数不是一，是 " + state.operands);
  return { state: state, catchup: catchup };
}
