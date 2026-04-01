import { dev } from "$app/environment";
import { fail, redirect } from "@sveltejs/kit";
import { PRIVATE_ROUTE_PASSWORD } from "$env/static/private";
import {
  createSessionToken,
  isAuthConfigured,
  privateSessionConfig,
  verifySessionToken,
} from "$lib/server/private-auth";

export const prerender = false;

export const load = ({ cookies }) => {
  const token = cookies.get(privateSessionConfig.COOKIE_NAME);
  const isAuthed = verifySessionToken(token ?? null);

  if (isAuthed) {
    throw redirect(303, "/private");
  }

  return {
    authConfigured: isAuthConfigured(),
  };
};

export const actions = {
  login: async ({ request, cookies }) => {
    if (!isAuthConfigured()) {
      return fail(500, { error: "Auth is not configured." });
    }

    const data = await request.formData();
    const password = data.get("password");

    if (typeof password !== "string") {
      return fail(400, { error: "Invalid form submission." });
    }

    if (password !== PRIVATE_ROUTE_PASSWORD) {
      return fail(401, { error: "Fel lösenord." });
    }

    cookies.set(privateSessionConfig.COOKIE_NAME, createSessionToken(), {
      path: "/",
      httpOnly: true,
      maxAge: privateSessionConfig.MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: !dev,
    });

    throw redirect(303, "/private");
  },
};
