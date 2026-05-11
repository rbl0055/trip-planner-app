import { categories, createSeedTrip, linkTypes, loadTrip, saveTrip, statuses } from "./data.js";
import { isSupabaseConfigured, loadSupabaseConfig, loadTripFromSupabase, saveTripToSupabase } from "./supabase.js";
import "./styles.css";

const defaultTripSlug = "indonesia-2026";
const tripAliases = {
  "trip-4b2347c8": defaultTripSlug,
};

const tripId = ensureTripId();
let trip = normalizeTrip(loadTrip(tripId), tripId);
let page = currentPage();
let editing = null;
let config = { supabaseUrl: "", supabaseAnonKey: "" };
let onlineState = {
  loading: true,
  configured: false,
  saving: false,
  message: "Loading trip...",
  error: "",
};

const app = document.querySelector("#app");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function safeUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  return /^(https?:)?\/\//i.test(url) ? url : "";
}

function money(value) {
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: trip.meta.currency || "USD" });
  return currency.format(Number(value || 0));
}

function toNumber(value) {
  return Number.parseFloat(value || "0") || 0;
}

function log(text) {
  trip.activity = safeList(trip.activity);
  trip.activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), text });
}

async function persist(text) {
  if (text) log(text);
  saveTrip(trip, tripId);
  onlineState.saving = true;
  onlineState.message = onlineState.configured ? "Saving online..." : "Saved locally.";
  render();

  if (onlineState.configured) {
    try {
      await saveTripToSupabase(config, trip);
      onlineState.error = "";
      onlineState.message = "Saved online.";
    } catch (error) {
      onlineState.error = friendlySupabaseError(error);
      onlineState.message = "Saved locally. Online save needs attention.";
    }
  }

  onlineState.saving = false;
  render();
}

function totals() {
  const expenses = safeList(trip.expenses);
  const itinerary = safeList(trip.itinerary).map(normalizeItineraryItem);
  const expenseEstimated = expenses.reduce((sum, item) => sum + toNumber(item.estimated), 0);
  const actual = expenses.reduce((sum, item) => sum + toNumber(item.actual), 0);
  const itineraryEstimated = itinerary.reduce((sum, item) => item.includeInTotal ? sum + toNumber(item.estimatedCost) : sum, 0);
  const combinedEstimated = expenseEstimated + itineraryEstimated;
  const totalBudget = toNumber(trip.meta.budget);
  const categoryTotals = categories.map((category) => {
    const items = expenses.filter((expense) => expense.category === category);
    return {
      category,
      estimated: items.reduce((sum, item) => sum + toNumber(item.estimated), 0),
      actual: items.reduce((sum, item) => sum + toNumber(item.actual), 0),
    };
  });

  return {
    totalBudget,
    expenseEstimated,
    actual,
    itineraryEstimated,
    combinedEstimated,
    remaining: totalBudget - combinedEstimated,
    categoryTotals,
  };
}

function optionList(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function shell(content) {
  const nav = [
    ["home", "Home"],
    ["itinerary", "Itinerary"],
    ["budget", "Budget"],
    ["places", "Places"],
  ];

  app.innerHTML = `
    ${statusBanner()}
    <header class="topbar">
      <div>
        <p class="eyebrow">Shared trip link</p>
        <h1>${escapeHtml(trip.meta.tripName)}</h1>
        <p>${escapeHtml(trip.meta.travelers)}</p>
      </div>
      <div class="header-actions">
        <form class="budget-form" data-action="save-meta">
          <label>
            Trip budget
            <input name="budget" type="number" min="0" step="1" value="${trip.meta.budget}" />
          </label>
          <button>Save</button>
        </form>
      </div>
    </header>
    <nav class="tabs">
      ${nav.map(([id, label]) => `<a href="#${id}" class="${page === id ? "active" : ""}">${escapeHtml(label)}</a>`).join("")}
    </nav>
    <main>${content}</main>
  `;
}

function renderWelcome() {
  app.innerHTML = `
    <main class="welcome-page">
      <img class="welcome-hero-image" src="/welcome-hero.png" alt="Our Indonesia Trip welcome artwork" />
      <nav class="welcome-nav" aria-label="Trip sections">
        <a class="active" href="#home">Home</a>
        <a href="#itinerary">Itinerary</a>
        <a href="#budget">Budget</a>
        <a href="#places">Places</a>
      </nav>
    </main>
  `;
}

function statusBanner() {
  if (onlineState.loading) {
    return `<div class="status-bar"><strong>Loading online trip...</strong></div>`;
  }

  if (!onlineState.configured) {
    return `
      <div class="status-bar warning">
        <strong>Online sharing is not connected yet.</strong>
        <span>Add Supabase environment variables and create the tables in <code>supabase-schema.sql</code>. This copy is still saving locally.</span>
      </div>
    `;
  }

  if (onlineState.error) {
    return `
      <div class="status-bar warning">
        <strong>Supabase needs attention.</strong>
        <span>${escapeHtml(onlineState.error)}</span>
      </div>
    `;
  }

  return "";
}

function renderBudget() {
  const summary = totals();
  const expenses = safeList(trip.expenses);
  shell(`
    <section class="summary-grid">
      <article><span>Total budget</span><strong>${money(summary.totalBudget)}</strong></article>
      <article><span>Expense tracker total</span><strong>${money(summary.expenseEstimated)}</strong></article>
      <article><span>Itinerary planned cost</span><strong>${money(summary.itineraryEstimated)}</strong></article>
      <article><span>Combined estimated total</span><strong>${money(summary.combinedEstimated)}</strong></article>
      <article><span>Remaining budget</span><strong class="${summary.remaining < 0 ? "danger" : ""}">${money(summary.remaining)}</strong></article>
      <article><span>Total actual so far</span><strong>${money(summary.actual)}</strong></article>
    </section>

    <section class="workbench">
      <div>
        <div class="section-title">
          <h2>Expenses</h2>
          <button data-action="new-expense">Add expense</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th>Estimated</th><th>Actual</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map((expense) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(expense.name)}</strong>
                    <small>${escapeHtml(expense.notes || "")}</small>
                    ${safeUrl(expense.link) ? `<a href="${escapeHtml(safeUrl(expense.link))}" target="_blank" rel="noreferrer">Open link</a>` : ""}
                  </td>
                  <td>${escapeHtml(expense.category)}</td>
                  <td>${money(expense.estimated)}</td>
                  <td>${money(expense.actual)}</td>
                  <td><span class="pill">${escapeHtml(expense.status)}</span></td>
                  <td class="row-actions">
                    <button data-action="edit-expense" data-id="${expense.id}">Edit</button>
                    <button data-action="delete-expense" data-id="${expense.id}">Delete</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <aside>
        <h2>Category totals</h2>
        ${summary.categoryTotals.map((item) => `
          <div class="category-row">
            <span>${item.category}</span>
            <strong>${money(item.actual)} <small>${money(item.estimated)} est.</small></strong>
          </div>
        `).join("")}
      </aside>
    </section>
    ${expenseDialog()}
  `);
}

function expenseDialog() {
  if (editing?.type !== "expense") return "";
  const expense = editing.id ? trip.expenses.find((item) => item.id === editing.id) : {};
  return `
    <div class="modal">
      <form class="panel" data-action="save-expense">
        <div class="section-title">
          <h2>${expense?.id ? "Edit expense" : "Add expense"}</h2>
          <button type="button" data-action="close-dialog">Close</button>
        </div>
        <input type="hidden" name="id" value="${escapeHtml(expense?.id || "")}" />
        <label>Name<input name="name" required value="${escapeHtml(expense?.name || "")}" /></label>
        <label>Category<select name="category">${optionList(categories, expense?.category || categories[0])}</select></label>
        <div class="split">
          <label>Estimated cost<input name="estimated" type="number" min="0" step="0.01" value="${expense?.estimated || ""}" /></label>
          <label>Actual cost<input name="actual" type="number" min="0" step="0.01" value="${expense?.actual || ""}" /></label>
        </div>
        <label>Status<select name="status">${optionList(statuses, expense?.status || statuses[0])}</select></label>
        <label>Link<input name="link" type="url" value="${escapeHtml(expense?.link || "")}" /></label>
        <label>Notes<textarea name="notes">${escapeHtml(expense?.notes || "")}</textarea></label>
        <button>Save expense</button>
      </form>
    </div>
  `;
}

function renderPlaces() {
  const links = safeList(trip.links);
  shell(`
    <section class="workbench">
      <div>
        <div class="section-title">
          <h2>Places and links</h2>
          <button data-action="new-link">Add link</button>
        </div>
        <div class="cards">
          ${links.map((item) => `
            <article class="card">
              <span class="pill">${escapeHtml(item.type)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.destination)}</p>
              <p>${escapeHtml(item.notes || "")}</p>
              <div class="row-actions">
                ${safeUrl(item.url) ? `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noreferrer">Open</a>` : ""}
                <button data-action="edit-link" data-id="${item.id}">Edit</button>
                <button data-action="delete-link" data-id="${item.id}">Delete</button>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
      <aside>
        <h2>Quick buckets</h2>
        ${linkTypes.map((type) => `<div class="category-row"><span>${escapeHtml(type)}</span><strong>${links.filter((item) => item.type === type).length}</strong></div>`).join("")}
      </aside>
    </section>
    ${linkDialog()}
  `);
}

function linkDialog() {
  if (editing?.type !== "link") return "";
  const item = editing.id ? trip.links.find((link) => link.id === editing.id) : {};
  return `
    <div class="modal">
      <form class="panel" data-action="save-link">
        <div class="section-title">
          <h2>${item?.id ? "Edit link" : "Add link"}</h2>
          <button type="button" data-action="close-dialog">Close</button>
        </div>
        <input type="hidden" name="id" value="${escapeHtml(item?.id || "")}" />
        <label>Title<input name="title" required value="${escapeHtml(item?.title || "")}" /></label>
        <label>Type<select name="type">${optionList(linkTypes, item?.type || linkTypes[0])}</select></label>
        <label>Destination<input name="destination" value="${escapeHtml(item?.destination || "")}" /></label>
        <label>URL<input name="url" type="url" required value="${escapeHtml(item?.url || "")}" /></label>
        <label>Notes<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
        <button>Save link</button>
      </form>
    </div>
  `;
}

function renderItinerary() {
  const days = safeList(trip.itinerary).map(normalizeItineraryItem).sort((a, b) => `${a.date || ""}`.localeCompare(`${b.date || ""}`));
  const calendar = buildCalendar(days);
  shell(`
    <section>
      <div class="section-title">
        <h2>${escapeHtml(calendar.monthLabel)} Itinerary</h2>
        <button data-action="new-itinerary">Add plan</button>
      </div>
      <div class="calendar-weekdays">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="calendar-grid">
        ${calendar.cells.map((cell) => cell.empty ? `
          <div class="calendar-day empty"></div>
        ` : cell.item ? `
          <article class="calendar-day has-plan" data-action="edit-itinerary" data-id="${cell.item.id}" tabindex="0">
            <div class="calendar-date">
              <strong>${cell.day}</strong>
              <span>${escapeHtml(cell.weekday)}</span>
            </div>
            <h3>${escapeHtml(cell.item.location || "TBD")}</h3>
            <p><b>Morning</b>${escapeHtml(cell.item.morning || "TBD")}</p>
            <p><b>Afternoon</b>${escapeHtml(cell.item.afternoon || "TBD")}</p>
            <p><b>Night</b>${escapeHtml(cell.item.night || "TBD")}</p>
            <div class="calendar-cost">
              <span>${money(cell.item.estimatedCost)}</span>
              <small>${cell.item.includeInTotal ? "Included in total" : "Itinerary only"}</small>
            </div>
            ${cell.item.notes ? `<small>${escapeHtml(cell.item.notes)}</small>` : ""}
          </article>
        ` : `
          <button class="calendar-day add-day" data-action="new-itinerary" data-date="${cell.date}" type="button">
            <span>${cell.day}</span>
            <small>Add plan</small>
          </button>
        `).join("")}
      </div>
    </section>
    ${itineraryDialog()}
  `);
}

function itineraryDialog() {
  if (editing?.type !== "itinerary") return "";
  const item = normalizeItineraryItem(editing.id ? trip.itinerary.find((entry) => entry.id === editing.id) : { date: editing.date });
  return `
    <div class="modal">
      <form class="panel" data-action="save-itinerary">
        <div class="section-title">
          <h2>${item?.id ? "Edit itinerary day" : "Add itinerary day"}</h2>
          <button type="button" data-action="close-dialog">Close</button>
        </div>
        <input type="hidden" name="id" value="${escapeHtml(item?.id || "")}" />
        <label>Date<input name="date" type="date" required value="${escapeHtml(item?.date || "")}" /></label>
        <label>City / location<input name="location" value="${escapeHtml(item?.location || "")}" /></label>
        <label>Morning plan<textarea name="morning">${escapeHtml(item?.morning || "")}</textarea></label>
        <label>Afternoon plan<textarea name="afternoon">${escapeHtml(item?.afternoon || "")}</textarea></label>
        <label>Night plan<textarea name="night">${escapeHtml(item?.night || "")}</textarea></label>
        <label>Estimated daily cost<input name="estimatedCost" type="number" min="0" step="0.01" value="${item?.estimatedCost || ""}" /></label>
        <label class="check-row">
          <input name="includeInTotal" type="checkbox" value="yes" ${item?.includeInTotal !== false ? "checked" : ""} />
          Include this cost in trip total
        </label>
        <label>Notes<textarea name="notes">${escapeHtml(item?.notes || "")}</textarea></label>
        <div class="row-actions">
          <button>Save itinerary day</button>
          ${item?.id ? `<button type="button" data-action="delete-itinerary" data-id="${item.id}">Delete</button>` : ""}
        </div>
      </form>
    </div>
  `;
}

function renderCompare() {
  const plans = safeList(trip.plans).sort((a, b) => toNumber(a.rank) - toNumber(b.rank));
  shell(`
    <section>
      <div class="section-title">
        <h2>Compare plans</h2>
        <button data-action="new-plan">Add option</button>
      </div>
      <div class="plan-grid">
        ${plans.map((plan) => `
          <article class="card">
            <span class="pill">Rank ${plan.rank}</span>
            <h3>${escapeHtml(plan.name)}</h3>
            <strong>${money(plan.estimated)}</strong>
            <p><b>Pros:</b> ${escapeHtml(plan.pros)}</p>
            <p><b>Cons:</b> ${escapeHtml(plan.cons)}</p>
            <p>${escapeHtml(plan.notes || "")}</p>
            <div class="row-actions">
              <button data-action="edit-plan" data-id="${plan.id}">Edit</button>
              <button data-action="delete-plan" data-id="${plan.id}">Delete</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
    ${planDialog()}
  `);
}

function planDialog() {
  if (editing?.type !== "plan") return "";
  const plan = editing.id ? trip.plans.find((item) => item.id === editing.id) : {};
  return `
    <div class="modal">
      <form class="panel" data-action="save-plan">
        <div class="section-title">
          <h2>${plan?.id ? "Edit option" : "Add option"}</h2>
          <button type="button" data-action="close-dialog">Close</button>
        </div>
        <input type="hidden" name="id" value="${escapeHtml(plan?.id || "")}" />
        <label>Name<input name="name" required value="${escapeHtml(plan?.name || "")}" /></label>
        <div class="split">
          <label>Estimated cost<input name="estimated" type="number" min="0" step="1" value="${plan?.estimated || ""}" /></label>
          <label>Rank<input name="rank" type="number" min="1" step="1" value="${plan?.rank || trip.plans.length + 1}" /></label>
        </div>
        <label>Pros<textarea name="pros">${escapeHtml(plan?.pros || "")}</textarea></label>
        <label>Cons<textarea name="cons">${escapeHtml(plan?.cons || "")}</textarea></label>
        <label>Notes<textarea name="notes">${escapeHtml(plan?.notes || "")}</textarea></label>
        <button>Save option</button>
      </form>
    </div>
  `;
}

function renderActivity() {
  const activity = safeList(trip.activity);
  shell(`
    <section class="activity">
      <div class="section-title">
        <h2>Activity log</h2>
        <button data-action="clear-activity">Clear log</button>
      </div>
      ${activity.map((item) => `
        <article class="log-entry">
          <time>${new Date(item.at).toLocaleString()}</time>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `).join("")}
    </section>
  `);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function upsert(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) collection[index] = item;
  else collection.unshift({ ...item, id: crypto.randomUUID() });
}

function safeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeItineraryItem(item = {}) {
  const legacyNotes = parseItineraryNotes(item.notes);
  const merged = { ...legacyNotes, ...item };
  const morning = merged.morning || merged.title || "";
  const notes = isStructuredItineraryNotes(item.notes) ? (legacyNotes.notesText || "") : (merged.notesText || merged.notes || "");

  return {
    ...merged,
    id: merged.id || "",
    date: merged.date || "",
    time: merged.time || "",
    title: merged.title || morning || "Daily plan",
    location: merged.location || "",
    morning,
    afternoon: merged.afternoon || "",
    night: merged.night || "",
    estimatedCost: toNumber(merged.estimatedCost),
    includeInTotal: merged.includeInTotal !== false,
    notes,
  };
}

function parseItineraryNotes(value) {
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed?.version === 2) {
      return {
        morning: parsed.morning || "",
        afternoon: parsed.afternoon || "",
        night: parsed.night || "",
        estimatedCost: toNumber(parsed.estimatedCost),
        includeInTotal: parsed.includeInTotal !== false,
        notesText: parsed.notes || "",
      };
    }
  } catch {
    // Plain legacy notes.
  }

  return { notesText: value };
}

function isStructuredItineraryNotes(value) {
  try {
    return JSON.parse(value)?.version === 2;
  } catch {
    return false;
  }
}

function buildCalendar(items) {
  const datedItems = items.filter((item) => item.date);
  const baseDate = datedItems[0]?.date ? new Date(`${datedItems[0].date}T00:00:00`) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = new Map(datedItems.map((item) => [item.date, item]));
  const cells = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
    cells.push({ date, day, weekday, item: byDate.get(date) });
  }

  return {
    monthLabel: firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    cells,
  };
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action], a[data-action], .calendar-day[data-action]");
  if (!target) return;
  const { action, id, date } = target.dataset;

  if (action === "new-expense") editing = { type: "expense" };
  if (action === "edit-expense") editing = { type: "expense", id };
  if (action === "delete-expense") {
    trip.expenses = safeList(trip.expenses).filter((item) => item.id !== id);
    return persist("Deleted an expense.");
  }

  if (action === "new-link") editing = { type: "link" };
  if (action === "edit-link") editing = { type: "link", id };
  if (action === "delete-link") {
    trip.links = safeList(trip.links).filter((item) => item.id !== id);
    return persist("Deleted a saved place or link.");
  }

  if (action === "new-itinerary") editing = { type: "itinerary", date };
  if (action === "edit-itinerary") editing = { type: "itinerary", id };
  if (action === "delete-itinerary") {
    trip.itinerary = safeList(trip.itinerary).filter((item) => item.id !== id);
    return persist("Deleted an itinerary item.");
  }

  if (action === "new-plan") editing = { type: "plan" };
  if (action === "edit-plan") editing = { type: "plan", id };
  if (action === "delete-plan") {
    trip.plans = safeList(trip.plans).filter((item) => item.id !== id);
    return persist("Deleted a comparison option.");
  }

  if (action === "clear-activity") {
    trip.activity = [];
    return persist();
  }

  if (action === "close-dialog") editing = null;
  render();
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  const action = form.dataset.action;
  if (!action) return;
  event.preventDefault();
  const values = formData(form);

  if (action === "save-meta") {
    trip.meta.budget = toNumber(values.budget);
    return persist("Updated the trip budget.");
  }

  if (action === "save-expense") {
    trip.expenses = safeList(trip.expenses);
    upsert(trip.expenses, { ...values, estimated: toNumber(values.estimated), actual: toNumber(values.actual) });
    editing = null;
    return persist("Saved an expense.");
  }

  if (action === "save-link") {
    trip.links = safeList(trip.links);
    upsert(trip.links, values);
    editing = null;
    return persist("Saved a place or link.");
  }

  if (action === "save-itinerary") {
    trip.itinerary = safeList(trip.itinerary);
    upsert(trip.itinerary, normalizeItineraryItem({
      ...values,
      title: values.morning || "Daily plan",
      time: "",
      estimatedCost: toNumber(values.estimatedCost),
      includeInTotal: values.includeInTotal === "yes",
    }));
    editing = null;
    return persist("Saved an itinerary item.");
  }

  if (action === "save-plan") {
    trip.plans = safeList(trip.plans);
    upsert(trip.plans, { ...values, estimated: toNumber(values.estimated), rank: toNumber(values.rank) });
    editing = null;
    return persist("Saved a comparison option.");
  }
});

window.addEventListener("hashchange", () => {
  page = currentPage();
  editing = null;
  render();
});

function render() {
  if (page === "home") return renderWelcome();
  if (page === "places") return renderPlaces();
  if (page === "itinerary") return renderItinerary();
  return renderBudget();
}

render();
initialize();

async function initialize() {
  config = await loadSupabaseConfig();
  onlineState.configured = isSupabaseConfigured(config);

  if (!onlineState.configured) {
    onlineState.loading = false;
    onlineState.message = "Saved locally.";
    saveTrip(trip, tripId);
    render();
    return;
  }

  try {
    trip = normalizeTrip(await loadTripFromSupabase(config, tripId, createSeedTrip(tripId)), tripId);
    saveTrip(trip, tripId);
    onlineState.error = "";
    onlineState.message = "Loaded from Supabase.";
  } catch (error) {
    onlineState.error = friendlySupabaseError(error);
    onlineState.message = "Using local copy until Supabase is ready.";
  }

  onlineState.loading = false;
  render();
}

function ensureTripId() {
  const match = location.pathname.match(/^\/trip\/([^/?#]+)/);
  const requestedId = match?.[1] ? sanitizeTripSlug(decodeURIComponent(match[1])) : "";
  const preservedHash = location.hash && location.hash !== "#budget" ? location.hash : "";

  if (requestedId) {
    const canonicalId = tripAliases[requestedId] || requestedId;
    localStorage.setItem("trip-planner-last-trip-id", canonicalId);

    if (canonicalId !== requestedId || location.hash === "#budget") {
      history.replaceState(null, "", `/trip/${encodeURIComponent(canonicalId)}${preservedHash}`);
    }

    return canonicalId;
  }

  const existing = sanitizeTripSlug(localStorage.getItem("trip-planner-last-trip-id") || "");
  const id = existing || defaultTripSlug;
  localStorage.setItem("trip-planner-last-trip-id", id);
  history.replaceState(null, "", `/trip/${encodeURIComponent(id)}${preservedHash}`);
  return id;
}

function sanitizeTripSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function currentPage() {
  const requested = location.hash.replace("#", "") || "home";
  return ["home", "itinerary", "budget", "places"].includes(requested) ? requested : "budget";
}

function normalizeTrip(value, id) {
  const seed = createSeedTrip(id);
  const incoming = value && typeof value === "object" ? value : {};
  const meta = incoming.meta && typeof incoming.meta === "object" ? incoming.meta : {};

  return {
    ...seed,
    ...incoming,
    id,
    meta: {
      ...seed.meta,
      ...meta,
      budget: toNumber(meta.budget ?? seed.meta.budget),
      currency: meta.currency || seed.meta.currency,
    },
    expenses: safeList(incoming.expenses),
    links: safeList(incoming.links),
    itinerary: safeList(incoming.itinerary).map(normalizeItineraryItem),
    plans: safeList(incoming.plans),
    activity: safeList(incoming.activity),
  };
}

function friendlySupabaseError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("Could not find the table") || message.includes("relation") || message.includes("schema cache")) {
    return "Create the Supabase tables from supabase-schema.sql, then refresh this page.";
  }
  if (message.includes("permission denied") || message.includes("row-level security")) {
    return "Check the anon row-level security policies in supabase-schema.sql.";
  }
  if (message.includes("Failed to fetch")) {
    return "The browser could not reach Supabase. Restart the local server, refresh the page, and check whether a browser blocker is blocking supabase.co.";
  }
  return message.slice(0, 180) || "Unknown Supabase error.";
}
