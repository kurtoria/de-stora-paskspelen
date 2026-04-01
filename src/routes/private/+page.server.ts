import { fail, redirect } from "@sveltejs/kit";
import {
  privateSessionConfig,
  verifySessionToken,
} from "$lib/server/private-auth";
import {
  createPerson,
  createRow,
  dataPath,
  ensureYear,
  findYear,
  normalizeYearScores,
  readScoreboard,
  writeScoreboard,
} from "$lib/server/scoreboard";
import type { ScoreYear } from "$lib/server/scoreboard";

export const prerender = false;

const getCurrentYear = () => String(new Date().getFullYear());

const getSelectedYear = ({
  requestedYear,
  years,
}: {
  requestedYear: string | null;
  years: ScoreYear[];
}) => {
  if (requestedYear && years.some((year) => year.year === requestedYear)) {
    return requestedYear;
  }

  if (years.length > 0) {
    return years[years.length - 1]?.year ?? getCurrentYear();
  }

  return getCurrentYear();
};

const requireAuth = (cookies: { get: (name: string) => string | undefined }) => {
  const token = cookies.get(privateSessionConfig.COOKIE_NAME);

  if (!verifySessionToken(token ?? null)) {
    throw redirect(303, "/");
  }
};

export const load = async ({ cookies, url }) => {
  requireAuth(cookies);
  const scoreboard = await readScoreboard();
  const selectedYear = getSelectedYear({
    requestedYear: url.searchParams.get("year"),
    years: scoreboard?.years ?? [],
  });
  const currentYear = scoreboard ? findYear(scoreboard, selectedYear) : null;
  const participants = currentYear
    ? currentYear.participantIds
        .map((participantId) =>
          scoreboard?.people.find((person) => person.id === participantId),
        )
        .filter((person) => person !== undefined)
    : [];
  const totals = Object.fromEntries(
    participants.map((participant) => [
      participant.id,
      currentYear?.rows.reduce(
        (sum, row) => sum + (row.scores[participant.id] ?? 0),
        0,
      ) ?? 0,
    ]),
  );

  return {
    currentYear,
    dataPath,
    participants,
    scoreboard,
    selectedYear,
    totals,
  };
};

export const actions = {
  logout: async ({ cookies }) => {
    cookies.delete(privateSessionConfig.COOKIE_NAME, { path: "/" });
    throw redirect(303, "/");
  },
  createYear: async ({ request, cookies }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue = String(form.get("year") ?? "").trim();

    if (!/^\d{4}$/.test(yearValue)) {
      return fail(400, { error: "Året måste anges med fyra siffror." });
    }

    const store = await readScoreboard();
    if (findYear(store, yearValue)) {
      return fail(400, { error: "Det året finns redan." });
    }

    const year = ensureYear(store, yearValue);
    year.participantIds = [];
    normalizeYearScores(year);
    await writeScoreboard(store);

    throw redirect(303, `/private?year=${yearValue}`);
  },
  deleteYear: async ({ request, cookies }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue = String(form.get("year") ?? "").trim();

    const store = await readScoreboard();
    const nextYears = store.years.filter((year) => year.year !== yearValue);

    if (nextYears.length === store.years.length) {
      return fail(404, { error: "Året kunde inte hittas." });
    }

    store.years = nextYears;
    await writeScoreboard(store);

    const redirectYear = store.years[store.years.length - 1]?.year;
    throw redirect(303, redirectYear ? `/private?year=${redirectYear}` : "/private");
  },
  addPerson: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      return fail(400, { error: "Skriv ett namn." });
    }

    const store = await readScoreboard();
    const duplicate = store.people.find(
      (person) => person.name.toLocaleLowerCase("sv") === name.toLocaleLowerCase("sv"),
    );
    const person = duplicate ?? createPerson(name);

    if (!duplicate) {
      store.people.push(person);
    }

    const year = ensureYear(store, yearValue);
    if (!year.participantIds.includes(person.id)) {
      year.participantIds.push(person.id);
      normalizeYearScores(year);
    }

    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
  deletePerson: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const personId = String(form.get("personId") ?? "").trim();

    const store = await readScoreboard();
    const personExists = store.people.some((person) => person.id === personId);

    if (!personExists) {
      return fail(404, { error: "Deltagaren kunde inte hittas." });
    }

    store.people = store.people.filter((person) => person.id !== personId);

    for (const year of store.years) {
      year.participantIds = year.participantIds.filter((id) => id !== personId);
      normalizeYearScores(year);
    }

    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
  setParticipants: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const selectedIds = form
      .getAll("personId")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const store = await readScoreboard();
    const year = ensureYear(store, yearValue);
    const validIds = new Set(store.people.map((person) => person.id));
    year.participantIds = selectedIds.filter((personId) => validIds.has(personId));
    normalizeYearScores(year);
    await writeScoreboard(store);

    return {
      success: true,
      participantIds: year.participantIds,
      year: yearValue,
    };
  },
  addRow: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title) {
      return fail(400, { error: "Skriv en rubrik för raden." });
    }

    const store = await readScoreboard();
    const year = ensureYear(store, yearValue);
    year.rows.push(createRow(year.participantIds, title, description));
    await writeScoreboard(store);

    throw redirect(303, `/private?year=${yearValue}`);
  },
  updateRow: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const rowId = String(form.get("rowId") ?? "").trim();

    const store = await readScoreboard();
    const year = findYear(store, yearValue);
    const row = year?.rows.find((entry) => entry.id === rowId);

    if (!year || !row) {
      return fail(404, { error: "Raden kunde inte hittas." });
    }

    row.title = String(form.get("title") ?? "").trim();
    row.description = String(form.get("description") ?? "").trim();

    for (const participantId of year.participantIds) {
      const rawValue = String(form.get(`score:${participantId}`) ?? "").trim();
      row.scores[participantId] = rawValue === "" ? 0 : Number(rawValue) || 0;
    }

    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
  deleteRow: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const rowId = String(form.get("rowId") ?? "").trim();

    const store = await readScoreboard();
    const year = findYear(store, yearValue);

    if (!year) {
      return fail(404, { error: "Året kunde inte hittas." });
    }

    year.rows = year.rows.filter((row) => row.id !== rowId);
    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
};
