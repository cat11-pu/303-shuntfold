// shuntrun.js：按处理预算跑调度场，用尽预算把记号连着载压账，收尾时清账并弹空栈
import { foldToken } from "./shunt.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codeFor(spec, key, fallback) {
  const value = spec ? spec[key] : null;
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function cloneState(state) {
  state = state || {};
  return {
    output: Array.isArray(state.output) ? state.output.slice() : [],
    ops: Array.isArray(state.ops) ? state.ops.slice() : [],
    operands: Number(state.operands) || 0,
    ledger: Array.isArray(state.ledger) ? state.ledger.map(function (row) { return row.slice(); }) : [],
    applied: Array.isArray(state.applied) ? state.applied.slice() : []
  };
}

// 在限额内消费队列；返回消费条数，未消费的记号留在 remainder 里。
function drain(work, limit, state, badTokenCode) {
  let served = 0;
  let remainder = [];
  while (work.length > 0) {
    if (served >= limit) { remainder = work; break; }
    const row = work.shift();
    const folded = foldToken(state, row[1]);
    state.output = folded.output;
    state.ops = folded.ops;
    state.operands = folded.operands;
    state.applied.push(row);
    served += 1;
  }
  return { served: served, remainder: remainder };
}

export function step(spec) {
  spec = spec || {};
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    fail("E_BAD_EVENT", "结构不合法：spec");
  }
  const state = cloneState(spec.state);
  if (!Array.isArray(spec.events)) fail("E_BAD_EVENT", "结构不合法：events");
  const events = spec.events;
  const budget = spec.budget;
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget < 0) {
    fail("E_BAD_EVENT", "结构不合法：budget");
  }
  for (const event of events) {
    if (typeof event !== "object" || event === null || event.kind !== "token"
        || typeof event.text !== "string") {
      fail("E_BAD_EVENT", "结构不合法：event");
    }
  }

  const badTokenCode = codeFor(spec, "token_error_code", "E_BAD_TOKEN");

  // 先清旧账（FIFO），旧账处理完才轮到本轮新记号。
  const queued = state.ledger.map(function (row) { return row.slice(); });
  state.ledger = [];

  const seen = new Set();
  for (const row of queued) seen.add(JSON.stringify(row));
  for (const row of state.applied) seen.add(JSON.stringify(row));
  for (const event of events) {
    const row = [event.kind, event.text];
    if (!seen.has(JSON.stringify(row))) queued.push(row);
  }

  const limit = Math.floor(budget);
  let served;
  let remainder;
  try {
    const result = drain(queued, limit, state, badTokenCode);
    served = result.served;
    remainder = result.remainder;
  } catch (error) {
    if (error && error.code === "E_BAD_TOKEN") error.code = badTokenCode;
    throw error;
  }
  state.ledger = remainder;

  const incomingLedger = Array.isArray((spec.state || {}).ledger) ? spec.state.ledger.length : 0;
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: served + state.ledger.length,
    judged_bound: incomingLedger + events.length
  };
}

export function close(spec) {
  spec = spec || {};
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    fail("E_BAD_EVENT", "结构不合法：spec");
  }
  const state = cloneState(spec.state);
  if (!Array.isArray(spec.events)) fail("E_BAD_EVENT", "结构不合法：events");
  for (const event of spec.events) {
    if (typeof event !== "object" || event === null || event.kind !== "token"
        || typeof event.text !== "string") {
      fail("E_BAD_EVENT", "结构不合法：event");
    }
  }

  const badTokenCode = codeFor(spec, "token_error_code", "E_BAD_TOKEN");
  const unbalancedCode = codeFor(spec, "paren_error_code", "E_UNBALANCED");
  const incompleteCode = codeFor(spec, "count_error_code", "E_INCOMPLETE");

  // 收尾不限预算：先把账上压着的记号全部处理完。
  let catchup = 0;
  while (state.ledger.length > 0) {
    const row = state.ledger.shift();
    let folded;
    try {
      folded = foldToken(state, row[1]);
    } catch (error) {
      if (error && error.code === "E_BAD_TOKEN") error.code = badTokenCode;
      throw error;
    }
    state.output = folded.output;
    state.ops = folded.ops;
    state.operands = folded.operands;
    state.applied.push(row);
    catchup += 1;
  }

  // 再把运算符栈弹空；碰到左括号就是括号不配对。
  while (state.ops.length > 0) {
    const top = state.ops.pop();
    if (top === "(") fail(unbalancedCode, "括号不配对：(");
    state.output.push(top);
  }

  if (state.operands !== 1) fail(incompleteCode, "收尾计数不是一：" + state.operands);

  return { state: state, catchup: catchup };
}
