<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
  export let form:
    | {
        error?: string;
      }
    | undefined;

  let availablePeople =
    data.scoreboard?.people.filter(
      (person) => !data.currentYear?.participantIds.includes(person.id),
    ) ?? [];

  $: availablePeople =
    data.scoreboard?.people.filter(
      (person) => !data.currentYear?.participantIds.includes(person.id),
    ) ?? [];
</script>

<div class="mx-auto max-w-6xl px-4 py-6 text-primary sm:px-6 sm:py-10">
  <header
    class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-[0.3em]">Scoreboard</p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        De stora påskspelen
      </h1>
      <p class="max-w-2xl text-sm sm:text-base">
        Årsflikar, återanvändbara personer och snabb poängsättning direkt i
        mobilen.
      </p>
    </div>

    <form method="post" action="?/logout">
      <button
        class="inline-flex w-fit items-center justify-center rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white/10"
      >
        Logga ut
      </button>
    </form>
  </header>

  {#if form?.error}
    <p
      class="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {form.error}
    </p>
  {/if}

  <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <div
      class="rounded-4xl border border-border bg-white/5 p-4 shadow-sm backdrop-blur sm:p-6"
    >
      <div
        class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.24em]">År</p>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each data.scoreboard?.years ?? [] as year}
              <a
                href={`/private?year=${year.year}`}
                class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  data.selectedYear === year.year
                    ? "border-secondary bg-secondary text-text-primary"
                    : "border-border bg-transparent hover:bg-white/10"
                }`}
              >
                {year.year}
              </a>
            {/each}
            {#if (data.scoreboard?.years?.length ?? 0) === 0}
              <span
                class="rounded-full border border-dashed border-border px-4 py-2 text-sm"
              >
                Inga år ännu
              </span>
            {/if}
          </div>
        </div>

        <form
          method="post"
          action="?/createYear"
          class="grid gap-2 sm:grid-cols-[auto_auto_auto]"
        >
          <input
            type="hidden"
            name="copyParticipantsFrom"
            value={data.selectedYear}
          />
          <input
            name="year"
            type="text"
            inputmode="numeric"
            pattern="[0-9]{4}"
            placeholder="2027"
            class="min-w-0 rounded-full border border-border bg-white px-4 py-3 text-base text-text-primary"
          />
          <button
            class="rounded-full border border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white/10"
          >
            Nytt år
          </button>
          <p class="self-center text-xs">Kopierar deltagare från valt år</p>
        </form>
      </div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each data.participants as person}
          <article class="rounded-3xl bg-text-primary px-4 py-4 text-secondary">
            <p class="text-xs uppercase tracking-[0.22em]">Total</p>
            <h2 class="mt-2 text-xl font-semibold">{person.name}</h2>
            <p class="mt-4 text-3xl font-semibold">
              {data.totals[person.id] ?? 0}
            </p>
          </article>
        {/each}
        {#if data.participants.length === 0}
          <article
            class="rounded-3xl border border-dashed border-border px-4 py-4 text-sm"
          >
            Lägg till deltagare för att börja räkna poäng.
          </article>
        {/if}
      </div>
    </div>

    <div
      class="rounded-4xl border border-border bg-panel p-4 text-stone-900 shadow-sm sm:p-6"
    >
      <p
        class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500"
      >
        Snabbtillägg
      </p>

      <form method="post" action="?/addPerson" class="mt-4 space-y-3">
        <input type="hidden" name="year" value={data.selectedYear} />
        <label class="block text-sm font-medium" for="name">Ny person</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Skriv ett namn"
          class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
        />
        <button
          class="w-full rounded-full bg-stone-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          Spara och lägg till i {data.selectedYear}
        </button>
      </form>

      {#if availablePeople.length > 0}
        <form method="post" action="?/assignPerson" class="mt-6 space-y-3">
          <input type="hidden" name="year" value={data.selectedYear} />
          <label class="block text-sm font-medium" for="personId"
            >Återanvänd person</label
          >
          <select
            id="personId"
            name="personId"
            class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
          >
            <option value="">Välj person</option>
            {#each availablePeople as person}
              <option value={person.id}>{person.name}</option>
            {/each}
          </select>
          <button
            class="w-full rounded-full border border-stone-400 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Lägg till i {data.selectedYear}
          </button>
        </form>
      {/if}

      <form method="post" action="?/addRow" class="mt-6 space-y-3">
        <input type="hidden" name="year" value={data.selectedYear} />
        <label class="block text-sm font-medium" for="title">Ny poängrad</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Till exempel Påskquiz"
          class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
        />
        <textarea
          name="description"
          rows="2"
          placeholder="Valfri beskrivning"
          class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
        ></textarea>
        <button
          class="w-full rounded-full bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          Lägg till rad
        </button>
      </form>

      <p class="mt-6 text-xs text-stone-500">
        Data sparas i <code class="rounded bg-white px-2 py-1 text-[11px]"
          >{data.dataPath}</code
        >
      </p>
    </div>
  </section>

  <section
    class="mt-8 rounded-4xl border border-border bg-white/5 p-4 shadow-sm backdrop-blur sm:p-6"
  >
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p class="text-xs uppercase tracking-[0.24em]">Poängrader</p>
        <h2 class="mt-1 text-2xl font-semibold">{data.selectedYear}</h2>
      </div>
      <p class="text-sm">
        Varje rad sparas separat så det blir snabbare att uppdatera från
        mobilen.
      </p>
    </div>

    <div class="mt-6 space-y-4">
      {#each data.currentYear?.rows ?? [] as row}
        <form
          method="post"
          action="?/updateRow"
          class="rounded-3xl border border-border bg-black/10 p-4"
        >
          <input type="hidden" name="year" value={data.selectedYear} />
          <input type="hidden" name="rowId" value={row.id} />

          <div class="grid gap-3 lg:grid-cols-[1.3fr_1fr_auto] lg:items-start">
            <div class="space-y-3">
              <input
                name="title"
                type="text"
                value={row.title}
                placeholder="Rubrik"
                class="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-text-primary"
              />
              <textarea
                name="description"
                rows="2"
                placeholder="Beskrivning"
                class="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-text-primary"
              >{row.description}</textarea>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {#each data.participants as person}
                <label
                  class="rounded-2xl border border-border bg-white/80 p-3 text-text-primary"
                >
                  <span class="mb-2 block text-sm font-semibold"
                    >{person.name}</span
                  >
                  <input
                    name={`score:${person.id}`}
                    type="number"
                    inputmode="numeric"
                    value={row.scores[person.id] ?? 0}
                    class="w-full rounded-xl border border-border px-3 py-3 text-lg"
                  />
                </label>
              {/each}
            </div>

            <div class="flex gap-2 lg:flex-col">
              <button
                class="flex-1 rounded-full bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-primary"
              >
                Spara
              </button>
            </div>
          </div>
        </form>

        <form method="post" action="?/deleteRow" class="-mt-2 flex justify-end">
          <input type="hidden" name="year" value={data.selectedYear} />
          <input type="hidden" name="rowId" value={row.id} />
          <button
            class="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition"
          >
            Ta bort rad
          </button>
        </form>
      {/each}

      {#if (data.currentYear?.rows.length ?? 0) === 0}
        <article
          class="rounded-3xl border border-dashed border-border px-4 py-8 text-center text-sm"
        >
          Inga poängrader än. Lägg till första raden ovan.
        </article>
      {/if}
    </div>
  </section>
</div>
