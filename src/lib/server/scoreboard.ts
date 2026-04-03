import { dev } from "$app/environment";
import { get, put } from "@vercel/blob";
import { env } from "$env/dynamic/private";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ScorePerson = {
  id: string;
  name: string;
};

export type ScoreCompetition = {
  id: string;
  templateId?: string | null;
  title: string;
  description: string;
  scores: Record<string, number>;
};

export type ScoreCompetitionTemplate = {
  id: string;
  title: string;
  description: string;
};

export type ScoreYear = {
  year: string;
  participantIds: string[];
  competitions: ScoreCompetition[];
};

export type ScoreboardStore = {
  people: ScorePerson[];
  competitionTemplates: ScoreCompetitionTemplate[];
  years: ScoreYear[];
};

type RawStore = {
  people?: unknown;
  competitionTemplates?: unknown;
  years?: unknown;
};

type RawYear = {
  year?: unknown;
  participantIds?: unknown;
  competitions?: unknown;
};

type RawCompetition = {
  id?: unknown;
  templateId?: unknown;
  title?: unknown;
  description?: unknown;
  scores?: unknown;
};

const dataDirectory = path.resolve(process.cwd(), "data");
const dataFilePath = path.join(dataDirectory, "scoreboard.json");
const backupDirectory = path.join(dataDirectory, "backups");
const blobPathname = "scoreboard/scoreboard.json";

const createId = () => randomUUID();
const getBlobToken = () => {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? token : null;
};

const usesBlobStorage = () => Boolean(getBlobToken());

const defaultStore = (): ScoreboardStore => ({
  people: [],
  competitionTemplates: [],
  years: [],
});

const sanitizeStore = (store: RawStore): ScoreboardStore => {
  const people = Array.isArray(store.people)
    ? store.people
        .filter(
          (person) =>
            person &&
            typeof person === "object" &&
            typeof (person as ScorePerson).id === "string" &&
            typeof (person as ScorePerson).name === "string",
        )
        .map((person) => ({
          id: (person as ScorePerson).id,
          name: (person as ScorePerson).name.trim(),
        }))
        .filter((person) => person.name.length > 0)
    : [];

  const sanitizedYears = Array.isArray(store.years)
    ? store.years
        .filter(
          (year) =>
            year &&
            typeof year === "object" &&
            typeof (year as RawYear).year === "string",
        )
        .map((year) => {
          const rawYear = year as RawYear;
          const rawCompetitions = Array.isArray(rawYear.competitions)
            ? rawYear.competitions
            : [];

          return {
            year: String(rawYear.year ?? "").trim(),
            participantIds: Array.isArray(rawYear.participantIds)
              ? [
                  ...new Set(
                    rawYear.participantIds.filter(
                      (value): value is string => typeof value === "string",
                    ),
                  ),
                ]
              : [],
            competitions: rawCompetitions
              .filter(
                (competition) =>
                  competition &&
                  typeof competition === "object" &&
                  typeof (competition as RawCompetition).id === "string",
              )
              .map((competition) => {
                const rawCompetition = competition as RawCompetition;

                return {
                  id: String(rawCompetition.id),
                  templateId:
                    typeof rawCompetition.templateId === "string" &&
                    rawCompetition.templateId.trim().length > 0
                      ? rawCompetition.templateId.trim()
                      : null,
                  title:
                    typeof rawCompetition.title === "string"
                      ? rawCompetition.title.trim()
                      : "",
                  description:
                    typeof rawCompetition.description === "string"
                      ? rawCompetition.description.trim()
                      : "",
                  scores:
                    rawCompetition.scores &&
                    typeof rawCompetition.scores === "object"
                      ? Object.fromEntries(
                          Object.entries(rawCompetition.scores)
                            .filter(([personId]) => typeof personId === "string")
                            .map(([personId, score]) => [personId, Number(score) || 0]),
                        )
                      : {},
                };
              }),
          };
        })
        .filter((year) => year.year.length > 0)
        .sort((left, right) => left.year.localeCompare(right.year, "sv"))
    : [];

  const competitionTemplates = Array.isArray(store.competitionTemplates)
    ? store.competitionTemplates
    .filter(
      (competition) =>
        competition &&
        typeof competition === "object" &&
        typeof (competition as ScoreCompetitionTemplate).id === "string" &&
        typeof (competition as ScoreCompetitionTemplate).title === "string" &&
        typeof (competition as ScoreCompetitionTemplate).description === "string",
    )
    .map((competition) => ({
      id: (competition as ScoreCompetitionTemplate).id.trim(),
      title: (competition as ScoreCompetitionTemplate).title.trim(),
      description: (competition as ScoreCompetitionTemplate).description.trim(),
    }))
    .filter((competition) => competition.id.length > 0 && competition.title.length > 0)
    : [];

  return {
    people,
    competitionTemplates,
    years: sanitizedYears,
  };
};

const ensureStoreFile = async () => {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(dataFilePath, "utf8");
  } catch {
    await writeFile(dataFilePath, JSON.stringify(defaultStore(), null, 2), "utf8");
  }
};

const formatBackupTimestamp = (date: Date) =>
  `${[
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")}_${[
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("-")}`;

export const createBackupFilename = (date = new Date()) =>
  `scoreboard-${formatBackupTimestamp(date)}.json`;

const readLocalScoreboard = async (): Promise<ScoreboardStore> => {
  await ensureStoreFile();
  const raw = await readFile(dataFilePath, "utf8");

  try {
    return sanitizeStore(JSON.parse(raw) as RawStore);
  } catch {
    return defaultStore();
  }
};

const readBlobScoreboard = async (): Promise<ScoreboardStore | null> => {
  const token = getBlobToken();
  if (!token) {
    return null;
  }

  const result = await get(blobPathname, {
    access: "private",
    token,
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const raw = await new Response(result.stream).text();

  try {
    return sanitizeStore(JSON.parse(raw) as RawStore);
  } catch {
    return defaultStore();
  }
};

export const readScoreboard = async (): Promise<ScoreboardStore> => {
  if (usesBlobStorage()) {
    try {
      const blobStore = await readBlobScoreboard();
      if (blobStore) {
        return blobStore;
      }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("No token found")) {
        throw error;
      }
    }

    try {
      return await readLocalScoreboard();
    } catch {
      return defaultStore();
    }
  }

  return readLocalScoreboard();
};

export const writeScoreboard = async (store: ScoreboardStore) => {
  const sanitized = sanitizeStore(store);

  if (usesBlobStorage()) {
    const token = getBlobToken();
    if (!token) {
      await ensureStoreFile();
      await writeFile(dataFilePath, JSON.stringify(sanitized, null, 2), "utf8");
      return;
    }

    try {
      await put(blobPathname, JSON.stringify(sanitized, null, 2), {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
        token,
      });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("No token found")) {
        throw error;
      }
    }
  }

  await ensureStoreFile();
  await writeFile(dataFilePath, JSON.stringify(sanitized, null, 2), "utf8");
};

export const createScoreboardBackup = async (store: ScoreboardStore) => {
  const sanitized = sanitizeStore(store);
  await mkdir(backupDirectory, { recursive: true });
  const backupFilePath = path.join(backupDirectory, createBackupFilename());
  await writeFile(backupFilePath, JSON.stringify(sanitized, null, 2), "utf8");
  return backupFilePath;
};

export const listLocalScoreboardBackups = async (limit = 5) => {
  try {
    await mkdir(backupDirectory, { recursive: true });
    const entries = await readdir(backupDirectory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, "sv"))
      .slice(0, limit);
  } catch {
    return [];
  }
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
    competitions: [],
  };

  store.years.push(year);
  store.years.sort((left, right) => left.year.localeCompare(right.year, "sv"));
  return year;
};

export const createPerson = (name: string): ScorePerson => ({
  id: createId(),
  name: name.trim(),
});

export const createCompetition = (
  participantIds: string[],
  title = "",
  description = "",
  templateId: string | null = null,
): ScoreCompetition => ({
  id: createId(),
  templateId,
  title: title.trim(),
  description: description.trim(),
  scores: Object.fromEntries(participantIds.map((participantId) => [participantId, 0])),
});

export const cloneCompetitionTemplate = (
  competition: Pick<ScoreCompetitionTemplate, "id" | "title" | "description">,
  participantIds: string[],
): ScoreCompetition =>
  createCompetition(
    participantIds,
    competition.title,
    competition.description,
    competition.id,
  );

export const createCompetitionTemplate = (
  title: string,
  description = "",
): ScoreCompetitionTemplate => ({
  id: createId(),
  title: title.trim(),
  description: description.trim(),
});

export const normalizeYearScores = (year: ScoreYear) => {
  for (const competition of year.competitions) {
    for (const participantId of year.participantIds) {
      if (!(participantId in competition.scores)) {
        competition.scores[participantId] = 0;
      }
    }

    for (const personId of Object.keys(competition.scores)) {
      if (!year.participantIds.includes(personId)) {
        delete competition.scores[personId];
      }
    }
  }
};

export const dataPath = usesBlobStorage()
  ? `vercel-blob:private/${blobPathname}`
  : dataFilePath;

export const backupPath = backupDirectory;
export const usesRemoteScoreboardStorage = () => !dev;
