const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSesh_va65QitwSrBFbNg7MzTbpBKoISD02gn93AoQDTlYlvrQ/formResponse";

const morningForm = document.getElementById("morning-form");
const formScreen = document.getElementById("form-screen");
const successScreen = document.getElementById("success-screen");
const submitButton = document.getElementById("submit-button");
const errorMessage = document.getElementById("error-message");
const targetFrame = document.getElementById("google-form-target");
const branch = document.getElementById("branch");
const administrator = document.getElementById("administrator");
const otherAdministrator = document.getElementById("other-administrator");

let submissionStarted = false;
let submissionTimeoutId = null;
let activeTransport = null;
let submittedAnswers = null;

document.getElementById("report-date").value = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });

document.querySelectorAll("#branch-options button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#branch-options button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    branch.value = button.dataset.value;
  });
});

administrator.addEventListener("change", () => {
  const isOther = administrator.value === "Другой";
  otherAdministrator.classList.toggle("is-hidden", !isOther);
  otherAdministrator.required = isOther;
  if (!isOther) otherAdministrator.value = "";
});

function amount(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function rub(value) {
  return `${new Intl.NumberFormat("ru-RU").format(amount(value))} ₽`;
}

function getAnswers() {
  return {
    date: document.getElementById("report-date").value,
    branch: branch.value,
    administrator: administrator.value === "Другой" ? otherAdministrator.value.trim() : administrator.value,
    cash: document.getElementById("cash").value,
    tbank: document.getElementById("tbank").value,
    ozonSveta: document.getElementById("ozon-sveta").value,
    ozonVeronika: document.getElementById("ozon-veronika").value,
  };
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
  addHiddenInput(transport, "entry.719482607_year", year);
  addHiddenInput(transport, "entry.719482607_month", String(Number(month)));
  addHiddenInput(transport, "entry.719482607_day", String(Number(day)));
  addHiddenInput(transport, "entry.2136402635", answers.branch);
  addHiddenInput(transport, "entry.1409369550", answers.administrator);
  addHiddenInput(transport, "entry.532223289", answers.cash);
  addHiddenInput(transport, "entry.758397248", answers.tbank);
  addHiddenInput(transport, "entry.121576337", answers.ozonSveta);
  addHiddenInput(transport, "entry.469702088", answers.ozonVeronika);
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
    errorMessage.classList.remove("is-hidden");
  }, 25000);
}

morningForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.classList.add("is-hidden");
  if (!morningForm.reportValidity()) return;
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
  activeTransport?.remove();
  activeTransport = null;
  document.getElementById("report-preview").textContent = buildReport(submittedAnswers);
  formScreen.classList.add("is-hidden");
  successScreen.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function buildReport(answers) {
  return [
    "CHAPLIN — УТРЕННИЙ ОТЧЁТ",
    `Дата: ${answers.date}`,
    `Филиал: ${answers.branch}`,
    `Администратор: ${answers.administrator}`,
    `Касса наличными: ${rub(answers.cash)}`,
    `T-Банк: ${rub(answers.tbank)}`,
    `Ozon Света: ${rub(answers.ozonSveta)}`,
    `Ozon Вероника: ${rub(answers.ozonVeronika)}`,
    "",
    "Отчёт отправлен ✓",
  ].join("\n");
}

document.getElementById("copy-button").addEventListener("click", async () => {
  await navigator.clipboard.writeText(document.getElementById("report-preview").textContent);
  document.getElementById("copy-button").textContent = "Скопировано ✓";
});

document.getElementById("reset-button").addEventListener("click", () => window.location.reload());
