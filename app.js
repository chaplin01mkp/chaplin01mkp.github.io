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
  totalTransferred: "Переведено на карты",
  cards: "Карты",
  cardSplit: "Разбивка по картам",
  tipsTransfer: "Чаевые переводом",
  otherReceipts: "Другие поступления",
  barberPayroll: "ЗП мастеров",
  adminPayment: "Выплата за админские обязанности",
  managerPayment: "Выплата Светлане",
  cleaning: "Уборка",
  expensesIncurred: "Расходы возникли сегодня",
  newExpensesPaid: "Новые расходы оплачены сегодня",
  newPayable: "Осталось оплатить позже",
  payableDetails: "Кому и за что должны",
  priorPayablePaid: "Оплачено по старым долгам",
  priorPayableSource: "Источник оплаты старого долга",
  cashBalance: "Остаток наличных",
  comment: "Комментарий",
};

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
const cardsHint = document.getElementById("cards-hint");
const submitButton = document.getElementById("submit-button");
const errorMessage = document.getElementById("error-message");
const targetFrame = document.getElementById("google-form-target");
let selectedCards = [];
let submissionStarted = false;
let submittedAnswers = null;

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

administrator.addEventListener("change", () => {
  const isOther = administrator.value === "Другой";
  const isSvetlana = administrator.value === "Светлана";
  otherAdministrator.classList.toggle("is-hidden", !isOther);
  otherAdministrator.required = isOther;
  managerField.classList.toggle("is-hidden", !isSvetlana);
  managerPayment.required = isSvetlana;
  if (!isSvetlana) managerPayment.value = "0";
});

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
  if (answers.administrator !== "Светлана") answers.managerPayment = "0";
  return answers;
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
    addHiddenInput(transport, `entry.${entryId}`, answers[key]);
  }
  answers.cards.forEach((card) => addHiddenInput(transport, "entry.69256334", card));
  addHiddenInput(transport, "entry.1591994395", answers.administrator === "Светлана" ? "Да" : "Нет");
  addHiddenInput(transport, "emailAddress", answers.email);
  addHiddenInput(transport, "fvv", "1");
  addHiddenInput(transport, "pageHistory", "0");
  addHiddenInput(transport, "submissionTimestamp", "-1");

  document.body.appendChild(transport);
  submissionStarted = true;
  transport.submit();
  transport.remove();
}

closingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.classList.add("is-hidden");

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
  showSuccess(submittedAnswers);
});

function formatValue(key, value) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (amountKeys.has(key)) {
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? `${new Intl.NumberFormat("ru-RU").format(number)} ₽` : value;
  }
  return value || "—";
}

function buildReport(answers) {
  const rows = Object.entries(reportLabels).map(([key, label]) => `${label}: ${formatValue(key, answers[key])}`);
  return ["CHAPLIN — ЗАКРЫТИЕ СМЕНЫ", ...rows, "", "Отчёт принят ✓"].join("\n");
}

function showSuccess(answers) {
  document.getElementById("submitted-email").textContent = answers.email;
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
