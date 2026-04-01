<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
  export let form:
    | {
        error?: string;
      }
    | undefined;
</script>

<div class="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6">
  <section class="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <div class="space-y-4 text-primary">
      <p class="text-xs font-semibold uppercase tracking-[0.3em]">Scoreboard</p>
      <h1 class="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
        De stora påskspelen
      </h1>
      <p class="max-w-xl text-base leading-relaxed">
        Logga in här och gå vidare till poängtavlan i <code>/private</code>.
        Resultaten ligger kvar per år och deltagare kan återanvändas mellan åren.
      </p>

      <div class="flex flex-wrap gap-3 text-sm">
        <span class="rounded-full border border-border px-4 py-2">
          Årsflikar
        </span>
        <span class="rounded-full border border-border px-4 py-2">
          Återanvänd deltagare
        </span>
        <span class="rounded-full border border-border px-4 py-2">
          Snabb uppdatering från mobilen
        </span>
      </div>
    </div>

    <div class="rounded-4xl border border-border bg-panel p-6 text-stone-900 shadow-subtle sm:p-8">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
        Inloggning
      </p>
      <h2 class="mt-3 text-2xl font-semibold">Öppna poängtavlan</h2>

      {#if !data.authConfigured}
        <p class="mt-4 text-sm">
          Lägg till <code>PRIVATE_ROUTE_PASSWORD</code> och
          <code>PRIVATE_ROUTE_COOKIE_SECRET</code> i din <code>.env</code>.
        </p>
      {:else}
        <form method="post" action="?/login" class="mt-6 space-y-4">
          <label class="block text-sm font-medium" for="password">Lösenord</label>
          <input
            id="password"
            name="password"
            type="password"
            aria-label="Lösenord"
            autocomplete="current-password"
            class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
          />
          {#if form?.error}
            <p class="text-sm text-red-600">{form.error}</p>
          {/if}
          <button
            class="w-full rounded-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary"
          >
            Logga in
          </button>
        </form>
      {/if}
    </div>
  </section>
</div>
