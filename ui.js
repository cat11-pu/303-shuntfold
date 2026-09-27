// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，本轮处理预算 "
    + (spec.budget || 0) + " 条。";

  function draw() {
    let view = null;
    try {
      view = render(spec);
    } catch (error) {
      parts.out.textContent = String(error && error.code ? error.code : error);
      parts.log.textContent = "跑不动：" + String(error && error.message ? error.message : error);
      return;
    }
    parts.out.textContent = JSON.stringify(view, null, 1);
    parts.stage.textContent = "";
    const outLine = document.createElement("div");
    outLine.className = "row";
    const outHead = document.createElement("span");
    outHead.textContent = "后缀：" + (view.output || []).join(" ");
    outLine.appendChild(outHead);
    const outChip = document.createElement("span");
    outChip.className = "chip ok";
    outChip.textContent = "共 " + (view.output || []).length + " 个记号";
    outLine.appendChild(outChip);
    parts.stage.appendChild(outLine);
    const opsLine = document.createElement("div");
    opsLine.className = "row ghost";
    const opsHead = document.createElement("span");
    opsHead.textContent = "运算符栈：" + (view.ops || []).join(" ") || "（空）";
    opsLine.appendChild(opsHead);
    const opsChip = document.createElement("span");
    opsChip.className = (view.ops || []).length ? "chip warn" : "chip";
    opsChip.textContent = (view.ops || []).length ? "还有 " + view.ops.length + " 个" : "已清空";
    opsLine.appendChild(opsChip);
    parts.stage.appendChild(opsLine);
    const cntLine = document.createElement("div");
    cntLine.className = "row";
    const cntHead = document.createElement("span");
    cntHead.textContent = "操作数计数：" + view.operands;
    cntLine.appendChild(cntHead);
    const cntChip = document.createElement("span");
    cntChip.className = view.operands === 1 ? "chip ok" : "chip bad";
    cntChip.textContent = view.operands === 1 ? "正好一个" : "对不上";
    cntLine.appendChild(cntChip);
    parts.stage.appendChild(cntLine);
    (view.ledger || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "记号 " + row[1] + " 压在账上";
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "等收尾";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    parts.legend.textContent = "首轮处理 " + view.served_first + " 条，二档 "
      + view.served_wide + " 条，收尾前账 " + view.ledger_before + " 条，收尾补齐 "
      + view.catchup + " 条，收尾后账 " + view.ledger_after + " 条";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新处理 " + view.replay_new + "，与全量对照差异 " + view.full_diff;
  }

  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.value = "2";
  parts.controls.appendChild(budgetInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const budgetButton = document.createElement("button");
  budgetButton.textContent = "把处理预算换成输入框的值";
  budgetButton.addEventListener("click", function () {
    const next = Number(budgetInput.value);
    spec.budget = Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1;
    draw();
  });
  parts.controls.appendChild(budgetButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
