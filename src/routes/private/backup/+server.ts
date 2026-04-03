import { redirect } from "@sveltejs/kit";
import {
  createBackupFilename,
  createScoreboardBackup,
  readScoreboard,
  usesRemoteScoreboardStorage,
} from "$lib/server/scoreboard";
import {
  privateSessionConfig,
  verifySessionToken,
} from "$lib/server/private-auth";

const getCurrentYear = () => String(new Date().getFullYear());

const requireAuth = (cookies: { get: (name: string) => string | undefined }) => {
  const token = cookies.get(privateSessionConfig.COOKIE_NAME);

  if (!verifySessionToken(token ?? null)) {
    throw redirect(303, "/");
  }
};

export const GET = async ({ cookies, url }) => {
  requireAuth(cookies);

  const store = await readScoreboard();

  if (usesRemoteScoreboardStorage()) {
    return new Response(JSON.stringify(store, null, 2), {
      headers: {
        "content-disposition": `attachment; filename="${createBackupFilename()}"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  const yearValue = url.searchParams.get("year") || getCurrentYear();
  await createScoreboardBackup(store);
  throw redirect(303, `/private?year=${yearValue}`);
};
