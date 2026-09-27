// shunt.js：调度场的单步（中缀记号折叠进后缀序列与运算符栈）
const PRECEDENCE = { "+": 1, "-": 1, "*": 2 };

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function tokenKind(text) {
  if (typeof text === "string" && /^[0-9]+$/.test(text)) return "number";
  if (text === "+" || text === "-" || text === "*") return "operator";
  if (text === "(") return "open";
  if (text === ")") return "close";
  return "other";
}

export function foldToken(carry, text, codes) {
  const code = codes || {};
  const kind = tokenKind(text);
  const output = carry.output.slice();
  const ops = carry.ops.slice();
  let operands = carry.operands;
  if (kind === "number") {
    output.push(text);
    operands += 1;
  } else if (kind === "operator") {
    if (operands < 1) fail(code.operand || "E_MISSING_OPERAND", "操作数不够，吃不下 " + text);
    operands -= 1;
    while (ops.length && ops[ops.length - 1] !== "(" && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[text]) {
      output.push(ops.pop());
    }
    ops.push(text);
  } else if (kind === "open") {
    ops.push(text);
  } else if (kind === "close") {
    while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop());
    if (!ops.length) fail(code.paren || "E_UNBALANCED", "右括号找不到左括号");
    ops.pop();
  } else {
    fail(code.token || "E_BAD_TOKEN", "不认识的记号 " + text);
  }
  return { output: output, ops: ops, operands: operands };
}
