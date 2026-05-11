export const categories = [
  "plane tickets",
  "stays",
  "food",
  "eating out",
  "transportation",
  "entertainment",
  "activities",
  "shopping",
  "visa/documents",
  "emergency money",
  "miscellaneous",
];

export const statuses = ["planned", "booked", "paid", "done", "cancelled"];
export const linkTypes = ["hotel", "restaurant", "flight", "activity", "map", "TikTok/YouTube", "article", "other"];

const seed = {
  meta: {
    tripName: "Indonesia Trip",
    travelers: "Me + my girlfriend",
    budget: 4200,
    currency: "USD",
    shareNote: "Anyone with the trip link can view and edit once this is connected to Supabase.",
  },
  expenses: [
    {
      id: crypto.randomUUID(),
      name: "Round trip flights",
      category: "plane tickets",
      estimated: 1600,
      actual: 0,
      notes: "Track fare alerts before booking.",
      link: "",
      status: "planned",
    },
    {
      id: crypto.randomUUID(),
      name: "Beach stay",
      category: "stays",
      estimated: 900,
      actual: 0,
      notes: "Compare Bali and Lombok options.",
      link: "",
      status: "planned",
    },
  ],
  links: [
    {
      id: crypto.randomUUID(),
      title: "Bali saved map",
      type: "map",
      destination: "Bali",
      url: "https://maps.google.com",
      notes: "Pin beaches, cafes, and hotels here.",
    },
  ],
  itinerary: [
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      title: "Plan first day",
      location: "TBD",
      notes: "Add arrival details and check-in time.",
    },
  ],
  plans: [
    {
      id: crypto.randomUUID(),
      name: "Bali",
      estimated: 4200,
      pros: "Beaches, cafes, resorts, easy recommendations",
      cons: "Can be busy and pricier",
      notes: "Best fit for a relaxed first version of the trip.",
      rank: 1,
    },
    {
      id: crypto.randomUUID(),
      name: "Bandung",
      estimated: 2900,
      pros: "Cooler weather, food, lower cost",
      cons: "Less beach time",
      notes: "Good city and food-focused option.",
      rank: 2,
    },
    {
      id: crypto.randomUUID(),
      name: "Lombok",
      estimated: 3600,
      pros: "Quieter beaches, nature, islands",
      cons: "More transfer planning",
      notes: "Better if the trip should feel slower.",
      rank: 3,
    },
  ],
  activity: [
    {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      text: "Started the shared trip workspace.",
    },
  ],
};

const keyPrefix = "trip-planner-local-v1";

export function createSeedTrip(id = "") {
  return {
    ...structuredClone(seed),
    id,
  };
}

export function loadTrip(tripId = "local") {
  const key = `${keyPrefix}:${tripId}`;
  const saved = localStorage.getItem(key);
  if (!saved) return createSeedTrip(tripId);

  try {
    return { ...createSeedTrip(tripId), ...JSON.parse(saved), id: tripId };
  } catch {
    return createSeedTrip(tripId);
  }
}

export function saveTrip(trip, tripId = "local") {
  const key = `${keyPrefix}:${tripId}`;
  localStorage.setItem(key, JSON.stringify(trip));
}
