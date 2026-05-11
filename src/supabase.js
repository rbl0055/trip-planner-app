const configPath = "/api/config";

export async function loadSupabaseConfig() {
  const viteEnv = import.meta.env || {};
  const inline = {
    ...(window.TRIP_PLANNER_CONFIG || {}),
    supabaseUrl: viteEnv.VITE_SUPABASE_URL || "",
    supabaseAnonKey: viteEnv.VITE_SUPABASE_ANON_KEY || "",
  };

  try {
    const response = await fetch(configPath, { headers: { accept: "application/json" } });
    if (response.ok) {
      const config = await response.json();
      return normalizeConfig({ ...inline, ...config });
    }
  } catch {
    // Static previews without the API route will land here and use inline config/local storage.
  }

  return normalizeConfig(inline);
}

export function isSupabaseConfigured(config) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export async function loadTripFromSupabase(config, tripId, seedTrip) {
  const client = createClient(config, tripId);
  const tripRows = await client.request(`/trips?id=eq.${encodeURIComponent(tripId)}&select=*`);

  if (tripRows.length === 0) {
    const trip = { ...seedTrip, id: tripId };
    await saveTripToSupabase(config, trip);
    return trip;
  }

  const [tripRow] = tripRows;
  const [expenses, links, itinerary, plans, activity] = await Promise.all([
    client.request(`/expenses?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=created_at.asc`),
    client.request(`/places?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=created_at.asc`),
    client.request(`/itinerary_items?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=trip_date.asc,start_time.asc`),
    client.request(`/plan_options?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=rank.asc`),
    client.request(`/activity_log?trip_id=eq.${encodeURIComponent(tripId)}&select=*&order=created_at.desc`),
  ]);

  return {
    id: tripId,
    meta: {
      ...seedTrip.meta,
      tripName: tripRow.trip_name || seedTrip.meta.tripName,
      travelers: tripRow.travelers || seedTrip.meta.travelers,
      budget: Number(tripRow.budget || 0),
      currency: tripRow.currency || "USD",
      shareNote: tripRow.share_note || "",
    },
    expenses: safeRows(expenses).map((row) => ({
      id: row.id || crypto.randomUUID(),
      name: row.name || "Untitled expense",
      category: row.category || "miscellaneous",
      estimated: Number(row.estimated || 0),
      actual: Number(row.actual || 0),
      notes: row.notes || "",
      link: row.link || "",
      status: row.status || "planned",
    })),
    links: safeRows(links).map((row) => ({
      id: row.id || crypto.randomUUID(),
      title: row.title || "Untitled link",
      type: row.type || "other",
      destination: row.destination || "",
      url: row.url || "",
      notes: row.notes || "",
    })),
    itinerary: safeRows(itinerary).map((row) => itineraryFromRow(row)),
    plans: safeRows(plans).map((row) => ({
      id: row.id || crypto.randomUUID(),
      name: row.name || "Untitled option",
      estimated: Number(row.estimated || 0),
      pros: row.pros || "",
      cons: row.cons || "",
      notes: row.notes || "",
      rank: Number(row.rank || 1),
    })),
    activity: safeRows(activity).map((row) => ({
      id: row.id || crypto.randomUUID(),
      at: row.happened_at || row.created_at || new Date().toISOString(),
      text: row.text || "Updated the trip.",
    })),
  };
}

export async function saveTripToSupabase(config, trip) {
  const tripId = trip.id;
  const client = createClient(config, tripId);

  await client.request("/trips?on_conflict=id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: [
      {
        id: tripId,
        trip_name: trip.meta.tripName,
        travelers: trip.meta.travelers,
        budget: trip.meta.budget,
        currency: trip.meta.currency,
        share_note: trip.meta.shareNote,
      },
    ],
  });

  await Promise.all([
    replaceRows(client, "expenses", tripId, trip.expenses.map((item) => ({
      id: item.id,
      trip_id: tripId,
      name: item.name,
      category: item.category,
      estimated: item.estimated,
      actual: item.actual,
      notes: item.notes,
      link: item.link,
      status: item.status,
    }))),
    replaceRows(client, "places", tripId, trip.links.map((item) => ({
      id: item.id,
      trip_id: tripId,
      title: item.title,
      type: item.type,
      destination: item.destination,
      url: item.url,
      notes: item.notes,
    }))),
    replaceRows(client, "itinerary_items", tripId, trip.itinerary.map((item) => ({
      id: item.id,
      trip_id: tripId,
      trip_date: item.date || null,
      start_time: item.time || null,
      title: item.title || item.morning || "Daily plan",
      location: item.location,
      notes: itineraryNotesForStorage(item),
    }))),
    replaceRows(client, "plan_options", tripId, trip.plans.map((item) => ({
      id: item.id,
      trip_id: tripId,
      name: item.name,
      estimated: item.estimated,
      pros: item.pros,
      cons: item.cons,
      notes: item.notes,
      rank: item.rank,
    }))),
    replaceRows(client, "activity_log", tripId, trip.activity.map((item) => ({
      id: item.id,
      trip_id: tripId,
      happened_at: item.at,
      text: item.text,
    }))),
  ]);
}

function normalizeConfig(config) {
  return {
    supabaseUrl: String(config.supabaseUrl || config.SUPABASE_URL || "").replace(/\/$/, ""),
    supabaseAnonKey: String(config.supabaseAnonKey || config.SUPABASE_ANON_KEY || ""),
  };
}

function createClient(config, tripId) {
  const headers = {
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${config.supabaseAnonKey}`,
    "content-type": "application/json",
    "x-trip-id": tripId,
  };

  return {
    async request(path, options = {}) {
      const response = await fetch(`${config.supabaseUrl}/rest/v1${path}`, {
        method: options.method || "GET",
        headers: { ...headers, ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Supabase request failed with ${response.status}`);
      }

      if (response.status === 204) return [];
      const text = await response.text();
      return text ? JSON.parse(text) : [];
    },
  };
}

async function replaceRows(client, table, tripId, rows) {
  await client.request(`/${table}?trip_id=eq.${encodeURIComponent(tripId)}`, { method: "DELETE" });

  if (rows.length > 0) {
    await client.request(`/${table}`, {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: rows,
    });
  }
}

function safeRows(rows) {
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}

function itineraryFromRow(row) {
  const details = parseItineraryNotes(row.notes);
  return {
    id: row.id || crypto.randomUUID(),
    date: row.trip_date || "",
    time: row.start_time || "",
    title: row.title || details.morning || "Untitled itinerary item",
    location: row.location || details.location || "",
    morning: details.morning || row.title || "",
    afternoon: details.afternoon || "",
    night: details.night || "",
    estimatedCost: Number(details.estimatedCost || 0),
    includeInTotal: details.includeInTotal !== false,
    notes: details.notes || "",
  };
}

function parseItineraryNotes(value) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.version === 2) return parsed;
  } catch {
    // Older rows stored plain notes.
  }

  return { notes: value };
}

function itineraryNotesForStorage(item) {
  return JSON.stringify({
    version: 2,
    morning: item.morning || "",
    afternoon: item.afternoon || "",
    night: item.night || "",
    estimatedCost: Number(item.estimatedCost || 0),
    includeInTotal: item.includeInTotal !== false,
    notes: item.notes || "",
  });
}
