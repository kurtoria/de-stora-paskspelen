<script lang="ts">
  import { onMount } from "svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
  export let form:
    | {
        error?: string;
      }
    | undefined;

  const introWords = ["DE", "STORA", "PÅSKSPELEN"];
  let activeWordIndex = 0;

  onMount(() => {
    const interval = window.setInterval(() => {
      activeWordIndex = (activeWordIndex + 1) % introWords.length;
    }, 700);

    return () => {
      window.clearInterval(interval);
    };
  });
</script>

<div>
  <section
    class="flex min-h-screen items-center justify-center px-4 text-primary"
  >
    <div class="intro-stage">
      <h1 class="intro-word active-word" aria-label="De stora påskspelen">
        {introWords[activeWordIndex]}
      </h1>
    </div>
  </section>

  <section class="flex min-h-screen items-center px-4 py-8 sm:px-6">
    <div class="mx-auto w-full max-w-6xl">
      <div
        class="mx-auto max-w-xl border border-border bg-panel p-6 text-stone-900 shadow-subtle sm:p-8"
      >
        <h2 class="text-2xl font-semibold">Inloggning</h2>

        {#if !data.authConfigured}
          <p class="mt-4 text-sm">
            Lägg till <code>PRIVATE_ROUTE_PASSWORD</code> och
            <code>PRIVATE_ROUTE_COOKIE_SECRET</code> i din <code>.env</code>.
          </p>
        {:else}
          <form method="post" action="?/login" class="mt-6 space-y-4">
            <!-- <label class="block text-sm font-medium" for="password"
              >Lösenord</label
            > -->
            <input
              id="password"
              name="password"
              type="password"
              aria-label="Lösenord"
              placeholder="Lösenord"
              autocomplete="current-password"
              class="w-full border border-stone-300 bg-white px-4 py-3 text-base"
            />
            {#if form?.error}
              <p class="text-sm text-red-600">{form.error}</p>
            {/if}
            <button
              class="w-full bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary"
            >
              Logga in
            </button>
          </form>
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .intro-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 60vh;
    padding: 1rem;
  }

  .intro-word {
    position: absolute;
    margin: 0;
    width: 100%;
    max-width: 100%;
    padding-inline: 0.25rem;
    font-size: clamp(2.8rem, 14vw, 16rem);
    font-weight: 600;
    letter-spacing: -0.08em;
    line-height: 0.9;
    opacity: 0;
    text-align: center;
    text-transform: uppercase;
    transform: scale(1);
    white-space: nowrap;
    user-select: none;
  }

  .active-word {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .intro-stage {
      min-height: 52vh;
      padding: 1.25rem;
    }

    .intro-word {
      font-size: clamp(2.2rem, 13vw, 4.8rem);
      letter-spacing: -0.05em;
      line-height: 0.92;
    }
  }
</style>
