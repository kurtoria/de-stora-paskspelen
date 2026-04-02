import { fail, redirect } from "@sveltejs/kit";
import {
  privateSessionConfig,
  verifySessionToken,
} from "$lib/server/private-auth";
import {
  cloneCompetitionTemplate,
  createCompetitionTemplate,
  createPerson,
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
      currentYear?.competitions.reduce(
        (sum, competition) => sum + (competition.scores[participant.id] ?? 0),
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
    year.competitions = store.competitionTemplates.map((competition) =>
      cloneCompetitionTemplate(competition, year.participantIds),
    );
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
  updatePerson: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const personId = String(form.get("personId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      return fail(400, { error: "Skriv ett namn." });
    }

    const store = await readScoreboard();
    const person = store.people.find((entry) => entry.id === personId);

    if (!person) {
      return fail(404, { error: "Deltagaren kunde inte hittas." });
    }

    const duplicate = store.people.find(
      (entry) =>
        entry.id !== personId &&
        entry.name.toLocaleLowerCase("sv") === name.toLocaleLowerCase("sv"),
    );

    if (duplicate) {
      return fail(400, { error: "Det finns redan en deltagare med det namnet." });
    }

    person.name = name;
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
  addCompetitionTemplate: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title) {
      return fail(400, { error: "Skriv ett namn för tävlingsgrenen." });
    }

    const store = await readScoreboard();
    const template = createCompetitionTemplate(title, description);
    store.competitionTemplates.push(template);
    const year = ensureYear(store, yearValue);
    year.competitions.push(cloneCompetitionTemplate(template, year.participantIds));
    await writeScoreboard(store);

    throw redirect(303, `/private?year=${yearValue}`);
  },
  setActiveCompetitions: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const selectedIds = form
      .getAll("competitionTemplateId")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const store = await readScoreboard();
    const year = ensureYear(store, yearValue);
    const templates = store.competitionTemplates.filter((competition) =>
      selectedIds.includes(competition.id),
    );
    const existingCompetitionsByTemplateId = new Map(
      year.competitions
        .filter((competition) => competition.templateId)
        .map((competition) => [competition.templateId as string, competition]),
    );
    year.competitions = templates.map(
      (template) =>
        existingCompetitionsByTemplateId.get(template.id) ??
        cloneCompetitionTemplate(template, year.participantIds),
    );
    normalizeYearScores(year);
    await writeScoreboard(store);

    return {
      success: true,
      competitionTemplateIds: templates.map((template) => template.id),
      year: yearValue,
    };
  },
  updateCompetitionTemplate: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const templateId = String(form.get("competitionTemplateId") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title) {
      return fail(400, { error: "Skriv ett namn för tävlingsgrenen." });
    }

    const store = await readScoreboard();
    const template = store.competitionTemplates.find(
      (competition) => competition.id === templateId,
    );

    if (!template) {
      return fail(404, { error: "Tävlingsgrenen kunde inte hittas." });
    }

    template.title = title;
    template.description = description;

    for (const year of store.years) {
      for (const competition of year.competitions) {
        if (competition.templateId === templateId) {
          competition.title = title;
          competition.description = description;
        }
      }
    }

    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
  deleteCompetitionTemplate: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const templateId = String(form.get("competitionTemplateId") ?? "").trim();

    const store = await readScoreboard();
    const templateExists = store.competitionTemplates.some(
      (competition) => competition.id === templateId,
    );

    if (!templateExists) {
      return fail(404, { error: "Tävlingsgrenen kunde inte hittas." });
    }

    store.competitionTemplates = store.competitionTemplates.filter(
      (competition) => competition.id !== templateId,
    );
    for (const year of store.years) {
      year.competitions = year.competitions.filter(
        (competition) => competition.templateId !== templateId,
      );
    }

    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
  updateCompetition: async ({ request, cookies, url }) => {
    requireAuth(cookies);
    const form = await request.formData();
    const yearValue =
      String(form.get("year") ?? "").trim() ||
      url.searchParams.get("year") ||
      getCurrentYear();
    const competitionId = String(form.get("competitionId") ?? "").trim();

    const store = await readScoreboard();
    const year = findYear(store, yearValue);
    const competition = year?.competitions.find((entry) => entry.id === competitionId);

    if (!year || !competition) {
      return fail(404, { error: "Tävlingsgrenen kunde inte hittas." });
    }

    competition.title = String(form.get("title") ?? "").trim();
    competition.description = String(form.get("description") ?? "").trim();

    for (const participantId of year.participantIds) {
      const rawValue = String(form.get(`score:${participantId}`) ?? "").trim();
      competition.scores[participantId] = rawValue === "" ? 0 : Number(rawValue) || 0;
    }
    await writeScoreboard(store);
    throw redirect(303, `/private?year=${yearValue}`);
  },
};
