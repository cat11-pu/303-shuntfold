// shunt.js：调度场的单步折叠（调度场算法，记号分五类）
const PRECEDENCE = { "+": 1, "-": 1, "*": 2 };

export function tokenKind(text) {
  if (typeof text === "string" && /^[0-9]+$/.test(text)) return "number";
  if (text === "+" || text === "-" || text === "*") return "operator";
  if (text === "(") return "open";
  if (text === ")") return "close";
  return "other";
}

export function foldToken(carry, text) {
  const next = {
    output: carry.output.slice(),
    ops: carry.ops.slice(),
    operands: carry.operands
  };
  const kind = tokenKind(text);
  if (kind === "number") {
    next.output.push(text);
    next.operands += 1;
    return next;
  }
  if (kind === "operator") {
    if (next.operands < 1) {
      const error = new Error("操作数不够：" + text);
      error.code = "E_MISSING_OPERAND";
      throw error;
    }
    next.operands -= 1;
    while (next.ops.length > 0) {
      const top = next.ops[next.ops.length - 1];
      if (top === "(" || (PRECEDENCE[top] || 0) < (PRECEDENCE[text] || 0)) break;
      next.output.push(next.ops.pop());
    }
    next.ops.push(text);
    return next;
  }
  if (kind === "open") {
    next.ops.push(text);
    return next;
  }
  if (kind === "close") {
    let found = false;
    while (next.ops.length > 0) {
      const top = next.ops.pop();
      if (top === "(") { found = true; break; }
      next.output.push(top);
    }
    if (!found) {
      const error = new Error("括号不配对：)");
      error.code = "E_UNBALANCED";
      throw error;
    }
    return next;
  }
  const error = new Error("记号不认识：" + String(text));
  error.code = "E_BAD_TOKEN";
  throw error;
}
