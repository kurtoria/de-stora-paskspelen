import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ScorePerson = {
  id: string;
  name: string;
};

export type ScoreRow = {
  id: string;
  title: string;
  description: string;
  scores: Record<string, number>;
};

export type ScoreYear = {
  year: string;
  participantIds: string[];
  rows: ScoreRow[];
};

export type ScoreboardStore = {
  people: ScorePerson[];
  years: ScoreYear[];
};

const dataDirectory = path.resolve(process.cwd(), "data");
const dataFilePath = path.join(dataDirectory, "scoreboard.json");

const createId = () => randomUUID();

const defaultStore = (): ScoreboardStore => ({
  people: [],
  years: [],
});

const sanitizeStore = (store: ScoreboardStore): ScoreboardStore => ({
  people: Array.isArray(store.people)
    ? store.people
        .filter((person) => person && typeof person.id === "string" && typeof person.name === "string")
        .map((person) => ({
          id: person.id,
          name: person.name.trim(),
        }))
        .filter((person) => person.name.length > 0)
    : [],
  years: Array.isArray(store.years)
    ? store.years
        .filter((year) => year && typeof year.year === "string")
        .map((year) => ({
          year: year.year.trim(),
          participantIds: Array.isArray(year.participantIds)
            ? [...new Set(year.participantIds.filter((value) => typeof value === "string"))]
            : [],
          rows: Array.isArray(year.rows)
            ? year.rows
                .filter((row) => row && typeof row.id === "string")
                .map((row) => ({
                  id: row.id,
                  title: typeof row.title === "string" ? row.title.trim() : "",
                  description:
                    typeof row.description === "string" ? row.description.trim() : "",
                  scores:
                    row.scores && typeof row.scores === "object"
                      ? Object.fromEntries(
                          Object.entries(row.scores)
                            .filter(([personId]) => typeof personId === "string")
                            .map(([personId, score]) => [personId, Number(score) || 0]),
                        )
                      : {},
                }))
            : [],
        }))
        .filter((year) => year.year.length > 0)
        .sort((left, right) => left.year.localeCompare(right.year, "sv"))
    : [],
});

const ensureStoreFile = async () => {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(dataFilePath, "utf8");
  } catch {
    await writeFile(dataFilePath, JSON.stringify(defaultStore(), null, 2), "utf8");
  }
};

export const readScoreboard = async (): Promise<ScoreboardStore> => {
  await ensureStoreFile();
  const raw = await readFile(dataFilePath, "utf8");

  try {
    return sanitizeStore(JSON.parse(raw) as ScoreboardStore);
  } catch {
    return defaultStore();
  }
};

export const writeScoreboard = async (store: ScoreboardStore) => {
  await ensureStoreFile();
  await writeFile(
    dataFilePath,
    JSON.stringify(sanitizeStore(store), null, 2),
    "utf8",
  );
};

export const findYear = (store: ScoreboardStore, yearValue: string) =>
  store.years.find((year) => year.year === yearValue);

export const ensureYear = (store: ScoreboardStore, yearValue: string) => {
  const existingYear = findYear(store, yearValue);
  if (existingYear) {
    return existingYear;
  }

  const year: ScoreYear = {
    year: yearValue,
    participantIds: [],
    rows: [],
  };

  store.years.push(year);
  store.years.sort((left, right) => left.year.localeCompare(right.year, "sv"));
  return year;
};

export const createPerson = (name: string): ScorePerson => ({
  id: createId(),
  name: name.trim(),
});

export const createRow = (participantIds: string[], title = "", description = ""): ScoreRow => ({
  id: createId(),
  title: title.trim(),
  description: description.trim(),
  scores: Object.fromEntries(participantIds.map((participantId) => [participantId, 0])),
});

export const normalizeYearScores = (year: ScoreYear) => {
  for (const row of year.rows) {
    for (const participantId of year.participantIds) {
      if (!(participantId in row.scores)) {
        row.scores[participantId] = 0;
      }
    }

    for (const personId of Object.keys(row.scores)) {
      if (!year.participantIds.includes(personId)) {
        delete row.scores[personId];
      }
    }
  }
};

export const dataPath = dataFilePath;
