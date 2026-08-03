"use strict";

const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSdTwbdgK4zG0CTnFWTdSZMgq41Dtx8CJZfcVf-ryZMt8YvEnQ/formResponse";

const fieldMap = {
  branch: ["branch", "122330299"],
  administrator: ["administrator", "2112292342"],
  adminType: ["admin-type", "254166831"],
  services: ["services", "917932260"],
  retail: ["retail", "64237524"],
  beverages: ["beverages", "297324062"],
  tips: ["tips", "1137527693"],
  cash: ["cash", "1651387642"],
  clientTransfers: ["client-transfers", "611022667"],
  totalTransferred: ["total-transferred", "288290073"],
  cardSplit: ["card-split", "592351809"],
  tipsTransfer: ["tips-transfer", "1193271015"],
  otherReceipts: ["other-receipts", "2025133529"],
  barberPayroll: ["barber-payroll", "234096887"],
  adminPayment: ["admin-payment", "732285723"],
  managerPayment: ["manager-payment", "1492591162"],
  cleaning: ["cleaning", "1918861048"],
  expensesIncurred: ["expenses-incurred", "2016262522"],
  newExpensesPaid: ["new-expenses-paid", "599385646"],
  newPayable: ["new-payable", "490531636"],
  payableDetails: ["payable-details", "663989835"],
  priorPayablePaid: ["prior-payable-paid", "1083262078"],
  priorPayableSource: ["prior-payable-source", "1992729858"],
  cashBalance: ["cash-balance", "1070607434"],
  comment: ["comment", "1504088280"],
};

const reportLabels = {
  date: "Дата",
  branch: "Филиал",
  administrator: "Администратор",
  adminType: "Тип администратора",
  services: "Выручка услуг",
  retail: "Продажа косметики",
  beverages: "Напитки",
  tips: "Чаевые всего",
  cash: "Наличные от клиентов",
  clientTransfers: "Переводы клиентов мастерам",
  totalTransferred: "Мастера перевели бизнесу",
  cards: "Карты бизнеса",
  cardSplit: "Разбивка по картам",
  tipsTransfer: "Чаевые переводом",
  otherReceipts: "Другие поступления",
  benefits: "Льготные клиенты",
  barberPayroll: "ЗП мастеров",
  adminPayment: "Выплата за админские обязанности",
  managerPayment: "Выплата Светлане",
  cleaning: "Уборка",
  expensesIncurred: "Расходы возникли сегодня",
  expenseDetails: "На что потрачено",
  newExpensesPaid: "Новые расходы оплачены сегодня",
  newPayable: "Осталось оплатить позже",
  payableDetails: "Кому и за что должны",
  priorPayablePaid: "Оплачено по старым долгам",
  priorPayableDetails: "Кому и за какой старый долг",
  priorPayableSource: "Источник оплаты старого долга",
  cashBalance: "Остаток наличных",
  comment: "Комментарий",
};

const googleAdminFixedOptions = new Set([
  "Александр", "Бэлла", "Валерия", "Вероника", "Виталий", "Денис",
  "Мартин", "Олег", "Ольга", "Полина", "Светлана",
]);

const amountKeys = new Set([
  "services", "retail", "beverages", "tips", "cash", "clientTransfers",
  "totalTransferred", "tipsTransfer", "otherReceipts", "barberPayroll",
  "adminPayment", "managerPayment", "cleaning", "expensesIncurred",
  "newExpensesPaid", "newPayable", "priorPayablePaid", "cashBalance",
]);

const closingForm = document.getElementById("closing-form");
const formScreen = document.getElementById("form-screen");
const successScreen = document.getElementById("success-screen");
const administrator = document.getElementById("administrator");
const otherAdministrator = document.getElementById("other-administrator");
const managerField = document.getElementById("manager-field");
const managerPayment = document.getElementById("manager-payment");
const expensesIncurred = document.getElementById("expenses-incurred");
const expenseDetails = document.getElementById("expense-details");
const newPayable = document.getElementById("new-payable");
const payableDetails = document.getElementById("payable-details");
const priorPayablePaid = document.getElementById("prior-payable-paid");
const priorPayableDetails = document.getElementById("prior-payable-details");
const priorPayableSource = document.getElementById("prior-payable-source");
const benefitsAnswer = document.getElementById("benefits-answer");
const benefitsPanel = document.getElementById("benefits-panel");
const benefitsList = document.getElementById("benefits-list");
const addBenefitButton = document.getElementById("add-benefit");
const cardsHint = document.getElementById("cards-hint");
const submitButton = document.getElementById("submit-button");
const errorMessage = document.getElementById("error-message");
const targetFrame = document.getElementById("google-form-target");
let selectedCards = [];
let submissionStarted = false;
let submittedAnswers = null;
let benefitCounter = 0;
let activeTransport = null;
let submissionTimeoutId = null;

const now = new Date();
const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
document.getElementById("closing-date").value = localDate;

document.querySelectorAll("#branch-options button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#branch-options button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    document.getElementById("branch").value = button.dataset.value;
  });
});

document.querySelectorAll("#cards .chip").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.value;
    if (selectedCards.includes(value)) {
      selectedCards = selectedCards.filter((item) => item !== value);
      button.classList.remove("selected");
      button.querySelector("span").textContent = "+";
    } else {
      selectedCards.push(value);
      button.classList.add("selected");
      button.querySelector("span").textContent = "✓";
    }
    cardsHint.classList.toggle("is-hidden", selectedCards.length > 0);
  });
});

function calculateBenefitPayment(card) {
  const listPrice = Number(card.querySelector(".benefit-list-price").value);
  const type = card.querySelector(".benefit-type").value;
  const payment = type === "Скидка 40%" && Number.isFinite(listPrice)
    ? Math.round(listPrice * 0.6 * 100) / 100
    : 0;
  card.querySelector(".benefit-payment").value = payment.toFixed(2);
}

function syncBenefitBasis(card) {
  const basis = card.querySelector(".benefit-basis").value;
  const month = card.querySelector(".benefit-month");
  const note = card.querySelector(".benefit-limit-note");
  const isOwnerDecision = basis === "Решение собственника";
  month.disabled = isOwnerDecision;
  month.required = !isOwnerDecision;
  if (isOwnerDecision) month.value = "";
  note.classList.toggle("is-hidden", !isOwnerDecision);
}

function addBenefit() {
  if (!benefitsList) return;
  benefitCounter += 1;
  const card = document.createElement("article");
  card.className = "benefit-card";
  card.innerHTML = `
    <div class="benefit-card-header">
      <strong>Льготный клиент <span class="benefit-number"></span></strong>
      <button class="benefit-remove" type="button">Удалить</button>
    </div>
    <div class="benefit-grid">
      <label class="field"><span class="field-label">Барбер<b>*</b></span><span class="field-english">Barber</span><input class="benefit-barber" type="text" required /></label>
      <label class="field"><span class="field-label">Клиент<b>*</b></span><span class="field-english">Client name</span><input class="benefit-client" type="text" required /></label>
      <label class="field"><span class="field-label">Телефон клиента<b>*</b></span><span class="field-english">Client phone</span><input class="benefit-phone" type="tel" inputmode="tel" required /></label>
      <label class="field"><span class="field-label">Тип льготы<b>*</b></span><span class="field-english">Benefit type</span><select class="benefit-type" required><option>Скидка 40%</option><option>Бесплатник</option><option>Бесплатник-родственник</option></select></label>
      <label class="field amount-field"><span class="field-label">Полная стоимость по прайсу<b>*</b></span><span class="field-english">List price, RUB</span><span class="amount-wrap"><input class="benefit-list-price" type="number" min="0.01" step="0.01" required /><i>₽</i></span></label>
      <label class="field amount-field"><span class="field-label">Фактически оплатил клиент</span><span class="field-english">Calculated automatically</span><span class="amount-wrap"><input class="benefit-payment" type="number" value="0.00" readonly /><i>₽</i></span></label>
      <label class="field"><span class="field-label">Основание<b>*</b></span><span class="field-english">Benefit basis</span><select class="benefit-basis" required><option>Лимит барбера</option><option>Решение собственника</option></select></label>
      <label class="field"><span class="field-label">Месяц списания лимита<b>*</b></span><span class="field-english">Current or next month only</span><select class="benefit-month" required><option value="">Выберите месяц</option><option>Текущий месяц</option><option>Следующий месяц</option></select><span class="benefit-limit-note is-hidden">По решению собственника лимит барбера не расходуется.</span></label>
      <label class="field full-width"><span class="field-label">Комментарий</span><span class="field-english">Services or important details · optional</span><textarea class="benefit-comment" rows="2" placeholder="Например: стрижка + борода"></textarea></label>
    </div>
  `;
  card.querySelector(".benefit-number").textContent = benefitCounter;
  card.querySelector(".benefit-remove").addEventListener("click", () => card.remove());
  card.querySelector(".benefit-type").addEventListener("change", () => calculateBenefitPayment(card));
  card.querySelector(".benefit-list-price").addEventListener("input", () => calculateBenefitPayment(card));
  card.querySelector(".benefit-basis").addEventListener("change", () => syncBenefitBasis(card));
  benefitsList.appendChild(card);
  calculateBenefitPayment(card);
  syncBenefitBasis(card);
}

function syncBenefitsVisibility() {
  if (!benefitsAnswer || !benefitsPanel || !benefitsList) return;
  const hasBenefits = benefitsAnswer.value === "Да";
  benefitsPanel.classList.toggle("is-hidden", !hasBenefits);
  if (hasBenefits && benefitsList.children.length === 0) addBenefit();
  if (!hasBenefits) benefitsList.replaceChildren();
}

function ensureBenefitRows() {
  if (benefitsAnswer && benefitsAnswer.value === "Да" && benefitsList.children.length === 0) addBenefit();
}

function getBenefits() {
  if (!benefitsAnswer || benefitsAnswer.value !== "Да") return [];
  return [...benefitsList.querySelectorAll(".benefit-card")].map((card) => {
    const basis = card.querySelector(".benefit-basis").value;
    return {
      barber: card.querySelector(".benefit-barber").value.trim(),
      client: card.querySelector(".benefit-client").value.trim(),
      phone: card.querySelector(".benefit-phone").value.trim(),
      type: card.querySelector(".benefit-type").value,
      listPrice: card.querySelector(".benefit-list-price").value,
      payment: card.querySelector(".benefit-payment").value,
      basis,
      month: basis === "Решение собственника" ? "Не списывается" : card.querySelector(".benefit-month").value,
      comment: card.querySelector(".benefit-comment").value.trim(),
    };
  });
}

function formatBenefits(benefits) {
  if (!benefits || benefits.length === 0) return "Не было";
  return benefits.map((item, index) => [
    (index + 1) + ". Барбер: " + item.barber,
    "клиент: " + item.client,
    "телефон: " + item.phone,
    "тип: " + item.type,
    "прайс: " + formatValue("services", item.listPrice),
    "оплата: " + formatValue("services", item.payment),
    "основание: " + item.basis,
    "месяц: " + item.month,
    "комментарий: " + (item.comment || "—"),
  ].join("; ")).join("\n");
}

if (benefitsAnswer) {
  benefitsAnswer.addEventListener("change", syncBenefitsVisibility);
  addBenefitButton.addEventListener("click", addBenefit);
  syncBenefitsVisibility();
}

administrator.addEventListener("change", () => {
  const isOther = administrator.value === "Другой";
  const isSvetlana = administrator.value === "Светлана";
  otherAdministrator.classList.toggle("is-hidden", !isOther);
  otherAdministrator.required = isOther;
  managerField.classList.toggle("is-hidden", !isSvetlana);
  managerPayment.required = isSvetlana;
  if (!isSvetlana) managerPayment.value = "0";
});

function isPositive(value) {
  return Number(String(value).replace(",", ".")) > 0;
}

function syncConditionalRequirements() {
  const needsExpenseDetails = isPositive(expensesIncurred.value);
  const needsPayableDetails = isPositive(newPayable.value);
  const needsPriorPayableDetails = isPositive(priorPayablePaid.value);

  expenseDetails.required = needsExpenseDetails;
  payableDetails.required = needsPayableDetails;
  priorPayableDetails.required = needsPriorPayableDetails;

  document.getElementById("expense-details-required").classList.toggle("is-hidden", !needsExpenseDetails);
  document.getElementById("payable-details-required").classList.toggle("is-hidden", !needsPayableDetails);
  document.getElementById("prior-payable-details-required").classList.toggle("is-hidden", !needsPriorPayableDetails);

  priorPayableSource.setCustomValidity(
    needsPriorPayableDetails && priorPayableSource.value === "Не было"
      ? "Выберите, откуда оплатили старый долг"
      : ""
  );
}

[expensesIncurred, newPayable, priorPayablePaid].forEach((input) => {
  input.addEventListener("input", syncConditionalRequirements);
});
priorPayableSource.addEventListener("change", syncConditionalRequirements);
syncConditionalRequirements();

function getAnswers() {
  const answers = {};
  for (const [key, [elementId]] of Object.entries(fieldMap)) {
    answers[key] = document.getElementById(elementId).value;
  }
  answers.date = document.getElementById("closing-date").value;
  answers.administrator = administrator.value === "Другой"
    ? otherAdministrator.value.trim()
    : administrator.value;
  answers.cards = [...selectedCards];
  answers.email = document.getElementById("email").value.trim();
  answers.expenseDetails = expenseDetails.value.trim();
  answers.priorPayableDetails = priorPayableDetails.value.trim();
  if (answers.administrator !== "Светлана") answers.managerPayment = "0";
  answers.benefits = getBenefits();
  return answers;
}

function buildStructuredComment(answers) {
  return [
    `Расходы: ${answers.expenseDetails || "—"}`,
    `Старый долг: ${answers.priorPayableDetails || "—"}`,
    `Льготные клиенты:\n${formatBenefits(answers.benefits)}`,
    `Комментарий: ${answers.comment || "—"}`,
    `Email: ${answers.email || "—"}`,
  ].join("\n");
}

function addHiddenInput(form, name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = String(value);
  form.appendChild(input);
}

function sendToGoogle(answers) {
  const transport = document.createElement("form");
  transport.method = "POST";
  transport.action = FORM_ENDPOINT;
  transport.target = "google-form-target";
  transport.style.display = "none";

  const [year, month, day] = answers.date.split("-");
  addHiddenInput(transport, "entry.1115287526_year", year);
  addHiddenInput(transport, "entry.1115287526_month", String(Number(month)));
  addHiddenInput(transport, "entry.1115287526_day", String(Number(day)));

  for (const [key, [, entryId]] of Object.entries(fieldMap)) {
    const value = key === "comment" ? buildStructuredComment(answers) : answers[key];
    if (key === "administrator" && !googleAdminFixedOptions.has(value)) {
      addHiddenInput(transport, `entry.${entryId}`, "__other_option__");
      addHiddenInput(transport, `entry.${entryId}.other_option_response`, value);
    } else {
      addHiddenInput(transport, `entry.${entryId}`, value);
    }
  }
  answers.cards.forEach((card) => addHiddenInput(transport, "entry.69256334", card));
  addHiddenInput(transport, "entry.1591994395", answers.administrator === "Светлана" ? "Да" : "Нет");
  addHiddenInput(transport, "fvv", "1");
  addHiddenInput(transport, "pageHistory", "0");
  addHiddenInput(transport, "submissionTimestamp", "-1");

  document.body.appendChild(transport);
  activeTransport = transport;
  submissionStarted = true;
  transport.submit();

  submissionTimeoutId = window.setTimeout(() => {
    if (!submissionStarted) return;
    submissionStarted = false;
    activeTransport?.remove();
    activeTransport = null;
    submitButton.disabled = false;
    submitButton.textContent = "Отправить отчёт";
    errorMessage.textContent = "Google не подтвердил отправку. Проверьте интернет и попробуйте ещё раз.";
    errorMessage.classList.remove("is-hidden");
  }, 25000);
}

closingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.classList.add("is-hidden");

  syncConditionalRequirements();
  ensureBenefitRows();
  if (!closingForm.reportValidity()) return;
  if (selectedCards.length === 0) {
    cardsHint.classList.remove("is-hidden");
    document.getElementById("cards").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!navigator.onLine) {
    errorMessage.classList.remove("is-hidden");
    return;
  }

  submittedAnswers = getAnswers();
  submitButton.disabled = true;
  submitButton.textContent = "Сохраняю…";
  sendToGoogle(submittedAnswers);
});

targetFrame.addEventListener("load", () => {
  if (!submissionStarted || !submittedAnswers) return;
  submissionStarted = false;
  if (submissionTimeoutId) window.clearTimeout(submissionTimeoutId);
  submissionTimeoutId = null;
  activeTransport?.remove();
  activeTransport = null;
  showSuccess(submittedAnswers);
});

function formatValue(key, value) {
  if (key === "benefits") return formatBenefits(value);
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (amountKeys.has(key)) {
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? `${new Intl.NumberFormat("ru-RU").format(number)} ₽` : value;
  }
  return value || "—";
}

function buildReport(answers) {
  const rows = Object.entries(reportLabels).map(([key, label]) => `${label}: ${formatValue(key, answers[key])}`);
  return ["CHAPLIN — ЗАКРЫТИЕ СМЕНЫ", ...rows, "", "Отчёт отправлен ✓"].join("\n");
}

function showSuccess(answers) {
  document.getElementById("report-preview").textContent = buildReport(answers);
  formScreen.classList.add("is-hidden");
  successScreen.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("copy-button").addEventListener("click", async () => {
  const button = document.getElementById("copy-button");
  await navigator.clipboard.writeText(document.getElementById("report-preview").textContent);
  button.textContent = "Скопировано ✓";
});

document.getElementById("reset-button").addEventListener("click", () => {
  window.location.reload();
});

