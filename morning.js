const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwNSO0hbd09AicYLzcf8JJrEIhRsI8HlVEWcv-GDU_RlsdeiuzTlZL_oNYNDySyaRO3/exec";

const morningForm = document.getElementById("morning-form");
const formScreen = document.getElementById("form-screen");
const successScreen = document.getElementById("success-screen");
const submitButton = document.getElementById("submit-button");
const errorMessage = document.getElementById("error-message");
const formStatusText = document.getElementById("form-status-text");
const targetFrame = document.getElementById("google-form-target");
const branch = document.getElementById("branch");
const administrator = document.getElementById("administrator");
const otherAdministrator = document.getElementById("other-administrator");

let submissionStarted = false;
let submissionTimeoutId = null;
let activeTransport = null;
let submittedAnswers = null;
let submissionNonce = null;

document.getElementById("report-date").value = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });

document.querySelectorAll("#branch-options button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#branch-options button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    branch.value = button.dataset.value;
    clearFieldError(document.getElementById("branch-options"));
    updateFormStatus();
  });
});

administrator.addEventListener("change", () => {
  const isOther = administrator.value === "Другой";
  otherAdministrator.classList.toggle("is-hidden", !isOther);
  otherAdministrator.required = isOther;
  if (!isOther) otherAdministrator.value = "";
  clearFieldError(administrator);
  updateFormStatus();
});

function fieldContainer(element) {
  return element?.closest(".field") || element?.parentElement || null;
}

function clearFieldError(element) {
  const container = fieldContainer(element);
  container?.classList.remove("has-error");
  container?.querySelectorAll(".inline-error").forEach((item) => item.remove());
}

function showFieldError(message, element) {
  document.querySelectorAll(".field.has-error").forEach((item) => item.classList.remove("has-error"));
  document.querySelectorAll(".inline-error").forEach((item) => item.remove());
  const container = fieldContainer(element);
  container?.classList.add("has-error");
  if (container) {
    const hint = document.createElement("p");
    hint.className = "inline-error";
    hint.textContent = message;
    container.appendChild(hint);
  }
  errorMessage.textContent = message;
  errorMessage.classList.remove("is-hidden");
  (container || element).scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => element?.focus?.({ preventScroll: true }), 250);
  return false;
}

function controlLabel(element) {
  return fieldContainer(element)?.querySelector(".field-label")?.textContent.replace("*", "").trim() || "обязательное поле";
}

function updateFormStatus() {
  let count = branch.value ? 0 : 1;
  [...morningForm.elements].forEach((element) => {
    if (!element.required || element.id === "branch" || element.disabled || element.closest(".is-hidden")) return;
    if (!element.validity.valid) count += 1;
  });
  const status = formStatusText?.parentElement;
  if (!formStatusText || !status) return;
  status.classList.toggle("is-ready", count === 0);
  formStatusText.textContent = count === 0
    ? "Обязательные поля заполнены — можно отправлять"
    : `Осталось заполнить: ${count}. Нажмите «Отправить» — покажу первое место.`;
}

function validateRequiredFields() {
  if (!branch.value) return showFieldError("Нажмите «Димитрова» или «Пролетарская».", document.getElementById("branch-options"));
  const invalid = [...morningForm.elements].find((element) =>
    element.required && element.id !== "branch" && !element.disabled && !element.closest(".is-hidden") && !element.validity.valid
  );
  if (!invalid) return true;
  const action = invalid.tagName === "SELECT" ? "Выберите значение" : "Заполните поле";
  return showFieldError(`${action} «${controlLabel(invalid)}».`, invalid);
}

function amount(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function rub(value) {
  if (String(value).trim() === "") return "не указано";
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

  submissionNonce = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  addHiddenInput(transport, "formType", "morning");
  addHiddenInput(transport, "nonce", submissionNonce);
  addHiddenInput(transport, "reportDate", answers.date);
  addHiddenInput(transport, "branch", answers.branch);
  addHiddenInput(transport, "administrator", answers.administrator);
  addHiddenInput(transport, "cash", answers.cash);
  addHiddenInput(transport, "tbank", answers.tbank);
  addHiddenInput(transport, "ozonSveta", answers.ozonSveta);
  addHiddenInput(transport, "ozonVeronika", answers.ozonVeronika);

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
    errorMessage.textContent = "Сервер не подтвердил сохранение. Данные не считаются отправленными — попробуйте ещё раз.";
    errorMessage.classList.remove("is-hidden");
  }, 25000);
}
morningForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.classList.add("is-hidden");
  updateFormStatus();
  if (!validateRequiredFields()) return;
  if (!navigator.onLine) {
    errorMessage.textContent = "Нет подключения к интернету. Подключитесь и нажмите «Отправить отчёт» ещё раз.";
    errorMessage.classList.remove("is-hidden");
    return;
  }

  submittedAnswers = getAnswers();
  submitButton.disabled = true;
  submitButton.textContent = "Сохраняю…";
  sendToGoogle(submittedAnswers);
});

morningForm.addEventListener("input", (event) => {
  clearFieldError(event.target);
  errorMessage.classList.add("is-hidden");
  updateFormStatus();
});
morningForm.addEventListener("change", (event) => {
  clearFieldError(event.target);
  updateFormStatus();
});
morningForm.addEventListener("invalid", (event) => event.preventDefault(), true);
updateFormStatus();

window.addEventListener("message", (event) => {
  const trustedOrigin =
    event.origin === "https://script.google.com" ||
    event.origin === "https://script.googleusercontent.com" ||
    /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(event.origin);
  const result = event.data;
  if (!trustedOrigin || !result || result.source !== "chaplin-morning" || result.nonce !== submissionNonce) return;
  if (!submissionStarted || !submittedAnswers) return;

  submissionStarted = false;
  if (submissionTimeoutId) window.clearTimeout(submissionTimeoutId);
  activeTransport?.remove();
  activeTransport = null;

  if (result.status !== "ok") {
    submitButton.disabled = false;
    submitButton.textContent = "Отправить отчёт";
    errorMessage.textContent = result.message || "Отчёт не сохранился. Попробуйте ещё раз.";
    errorMessage.classList.remove("is-hidden");
    return;
  }

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
