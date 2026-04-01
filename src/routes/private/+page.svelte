<script lang="ts">
  import { applyAction, enhance } from "$app/forms";
  import SlidePanel from "$lib/components/SlidePanel.svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import type { PageData } from "./$types";

  export let data: PageData;
  export let form:
    | {
        error?: string;
      }
    | undefined;

  let showYearPanel = false;
  let selectedParticipantIds = data.currentYear?.participantIds ?? [];
  let newParticipantName = "";
  let newYearValue: string | number = "";
  let isSavingParticipants = false;
  let participantSelectionVersion = `${data.selectedYear}:${(data.currentYear?.participantIds ?? []).join(",")}`;

  let allPeople = data.scoreboard?.people ?? [];

  $: allPeople = data.scoreboard?.people ?? [];
  $: {
    const nextVersion = `${data.selectedYear}:${(data.currentYear?.participantIds ?? []).join(",")}`;

    if (nextVersion !== participantSelectionVersion) {
      selectedParticipantIds = data.currentYear?.participantIds ?? [];
      participantSelectionVersion = nextVersion;
    }
  }

  const toggleParticipantSelection = (personId: string) => {
    selectedParticipantIds = selectedParticipantIds.includes(personId)
      ? selectedParticipantIds.filter((id) => id !== personId)
      : [...selectedParticipantIds, personId];
  };

  $: canAddParticipant = newParticipantName.trim().length > 0;
  $: canCreateYear = /^\d{4}$/.test(String(newYearValue ?? "").trim());
  $: canSaveParticipants =
    selectedParticipantIds.join(",") !==
    (data.currentYear?.participantIds ?? []).join(",");
  $: sortedParticipants = [...data.participants].sort((a, b) => {
    const scoreDifference = (data.totals[b.id] ?? 0) - (data.totals[a.id] ?? 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return a.name.localeCompare(b.name, "sv");
  });

  const enhanceParticipants: SubmitFunction = () => {
    isSavingParticipants = true;

    return async ({ result, update }) => {
      if (result.type === "success") {
        await update({ reset: false, invalidateAll: true });
      } else {
        await applyAction(result);
      }

      isSavingParticipants = false;
    };
  };
</script>

<div class="mx-auto max-w-6xl px-4 py-6 text-primary sm:px-6 sm:py-10">
  <header
    class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        De stora påskspelen {data.selectedYear}
      </h1>
    </div>
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
      class="rounded-4xl border border-border p-4 shadow-sm backdrop-blur sm:p-6"
    >
      <div>
        <h2 class="text-2xl font-semibold">Ställning</h2>
      </div>
      <!-- TODO: sort participants based on score -->
      <div class="mt-6 grid gap-3">
        {#each sortedParticipants as person}
          <article
            class="rounded-3xl bg-text-primary px-4 py-4 text-secondary flex justify-between items-center"
          >
            <h2 class="text-xl font-semibold">{person.name}</h2>
            <p class="text-xl font-semibold">
              {data.totals[person.id] ?? 0}
            </p>
          </article>
        {/each}
        {#if sortedParticipants.length === 0}
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
        Ny poängrad
      </p>

      <form method="post" action="?/addRow" class="mt-4 space-y-3">
        <input type="hidden" name="year" value={data.selectedYear} />
        <label class="block text-sm font-medium" for="title">Ny poängrad</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Titel"
          class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
        />
        <textarea
          name="description"
          rows="2"
          placeholder="Beskrivning"
          class="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base"
        ></textarea>
        <button
          class="w-full rounded-full bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          Lägg till rad
        </button>
      </form>
    </div>
  </section>

  <section
    class="mt-8 rounded-4xl border border-border bg-white/5 p-4 shadow-sm backdrop-blur sm:p-6"
  >
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p class="text-xs uppercase tracking-[0.24em]">Grenar och poäng</p>
      </div>
    </div>

    <div class="mt-5 space-y-3">
      {#each data.currentYear?.rows ?? [] as row}
        <form
          method="post"
          action="?/updateRow"
          class="rounded-3xl border border-border bg-black/10 p-3 sm:p-4"
        >
          <input type="hidden" name="year" value={data.selectedYear} />
          <input type="hidden" name="rowId" value={row.id} />

          <div
            class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] lg:items-start"
          >
            <div class="space-y-2">
              <input
                name="title"
                type="text"
                value={row.title}
                placeholder="Rubrik"
                class="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary sm:text-base"
              />
              <textarea
                name="description"
                rows="1"
                placeholder="Beskrivning"
                class="min-h-0 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary sm:text-base"
                >{row.description}</textarea
              >
            </div>

            <div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {#each data.participants as person}
                <label
                  class="rounded-xl border border-border bg-white/80 px-3 py-2 text-text-primary"
                >
                  <span
                    class="mb-1 block text-xs font-semibold leading-tight sm:text-sm"
                    >{person.name}</span
                  >
                  <input
                    name={`score:${person.id}`}
                    type="number"
                    inputmode="numeric"
                    value={row.scores[person.id] ?? 0}
                    class="w-full rounded-lg border border-border px-2.5 py-2 text-base"
                  />
                </label>
              {/each}
            </div>

            <div class="flex gap-2 lg:flex-col lg:self-stretch">
              <button
                class="flex-1 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-text-primary"
              >
                Spara
              </button>
            </div>
          </div>
        </form>

        <form method="post" action="?/deleteRow" class="-mt-1 flex justify-end">
          <input type="hidden" name="year" value={data.selectedYear} />
          <input type="hidden" name="rowId" value={row.id} />
          <button
            class="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition"
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

<SlidePanel
  bind:open={showYearPanel}
  label="Årspanel"
  closeLabel="Stäng årspanel"
  panelClass="fixed right-0 bottom-0 left-0 z-40 max-h-[82vh] overflow-y-auto rounded-t-4xl border border-border bg-surface/95 p-6 shadow-subtle backdrop-blur md:top-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none md:border-l"
>
  <div class="flex items-center justify-between gap-4">
    <div>
      <p
        class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
      >
        År
      </p>
      <h2 class="mt-2 text-2xl font-semibold text-text-primary">
        Hantera spelår
      </h2>
    </div>

    <button
      type="button"
      class="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary"
      on:click={() => (showYearPanel = false)}
    >
      Stäng
    </button>
  </div>

  <div class="mt-6">
    <p
      class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
    >
      Byt år
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      {#each data.scoreboard?.years ?? [] as year}
        <a
          href={`/private?year=${year.year}`}
          class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            data.selectedYear === year.year
              ? "border-primary bg-primary text-text-secondary hover:bg-primary/90"
              : "border-border bg-white text-text-primary hover:bg-secondary hover:scale-105"
          }`}
        >
          {year.year}
        </a>
      {/each}
      {#if (data.scoreboard?.years?.length ?? 0) === 0}
        <span
          class="rounded-full border border-dashed border-border px-4 py-2 text-sm text-text-primary"
        >
          Inga år ännu
        </span>
      {/if}
    </div>
  </div>

  {#if data.currentYear}
    <form
      method="post"
      action="?/deleteYear"
      class="mt-6 border-t border-border pt-6"
    >
      <input type="hidden" name="year" value={data.selectedYear} />
      <p
        class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
      >
        Ta bort år
      </p>
      <button
        type="submit"
        class="mt-3 w-full rounded-full bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-primary transition hover:bg-secondary"
        on:click={(event) => {
          if (
            !confirm(
              `Ta bort året ${data.selectedYear}? Alla poängrader för året försvinner.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        Ta bort {data.selectedYear}
      </button>
    </form>
  {/if}

  <form use:enhance method="post" action="?/addPerson" class="mt-8 space-y-3">
    <input type="hidden" name="year" value={data.selectedYear} />
    <p
      class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
    >
      Ny deltagare
    </p>
    <input
      id="panel-name"
      name="name"
      type="text"
      bind:value={newParticipantName}
      placeholder="Skriv ett namn"
      class="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-text-primary"
    />
    <button
      disabled={!canAddParticipant}
      class={`w-full rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${
        canAddParticipant
          ? "bg-primary text-text-secondary hover:scale-105 hover:bg-primary/90"
          : "cursor-not-allowed bg-primary/40 text-text-secondary/70"
      }`}
    >
      Spara och lägg till i {data.selectedYear}
    </button>
  </form>

  <div class="mt-8 space-y-3">
    <p
      class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
    >
      Aktiva deltagare
    </p>
    <form
      use:enhance={enhanceParticipants}
      method="post"
      action="?/setParticipants"
      class="space-y-3"
    >
      <input type="hidden" name="year" value={data.selectedYear} />
      {#each selectedParticipantIds as personId}
        <input type="hidden" name="personId" value={personId} />
      {/each}

      <div class="flex flex-wrap gap-2">
        {#each allPeople as person}
          <button
            type="button"
            on:click={() => toggleParticipantSelection(person.id)}
            class={`rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-105 ${
              selectedParticipantIds.includes(person.id)
                ? "border-primary bg-primary text-text-secondary hover:bg-primary/90"
                : "border-border bg-white text-text-primary hover:bg-secondary"
            }`}
          >
            {person.name}
          </button>
        {/each}
        {#if allPeople.length === 0}
          <span
            class="rounded-full border border-dashed border-border px-4 py-2 text-sm text-text-primary"
          >
            Inga sparade deltagare ännu
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-3">
        <button
          disabled={!canSaveParticipants || isSavingParticipants}
          class={`rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            canSaveParticipants && !isSavingParticipants
              ? "bg-secondary text-text-primary hover:scale-105 hover:bg-primary hover:text-text-secondary"
              : "cursor-not-allowed bg-secondary/50 text-text-primary/50"
          }`}
        >
          {#if isSavingParticipants}Sparar...{:else}Spara deltagare{/if}
        </button>
      </div>
    </form>
  </div>

  <form
    use:enhance
    method="post"
    action="?/createYear"
    class="mt-8 space-y-3 border-t border-border pt-8"
  >
    <p
      class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
    >
      Nytt år
    </p>
    <input
      name="year"
      type="number"
      bind:value={newYearValue}
      inputmode="numeric"
      min="2000"
      max="9999"
      step="1"
      placeholder="2027"
      class="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-text-primary"
    />
    <button
      disabled={!canCreateYear}
      class={`w-full rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${
        canCreateYear
          ? "bg-secondary text-text-primary hover:scale-105 hover:bg-primary hover:text-text-secondary"
          : "cursor-not-allowed bg-secondary/50 text-text-primary/50"
      }`}
    >
      Skapa år
    </button>
  </form>

  <div class="mt-8 space-y-3 border-t border-border pt-8">
    <p
      class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary"
    >
      Deltagare
    </p>
    <div class="space-y-2">
      {#each allPeople as person}
        <form
          method="post"
          action="?/updatePerson"
          class="space-y-2"
        >
          <input type="hidden" name="year" value={data.selectedYear} />
          <input type="hidden" name="personId" value={person.id} />
          <input
            name="name"
            type="text"
            value={person.name}
            class="w-full rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary"
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              class="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-primary transition hover:bg-secondary"
            >
              Spara
            </button>
            <button
              type="submit"
              formaction="?/deletePerson"
              class="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-primary transition hover:bg-secondary"
              on:click={(event) => {
                if (
                  !confirm(
                    `Ta bort deltagaren ${person.name}? Personen försvinner från alla år och poängrader.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              Ta bort
            </button>
          </div>
        </form>
      {/each}
      {#if allPeople.length === 0}
        <p class="text-sm text-text-primary">Inga deltagare ännu.</p>
      {/if}
    </div>
  </div>

  <div class="mt-8 border-t border-border pt-8">
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
      Lagring
    </p>
    <p class="mt-3 text-xs text-text-primary">
      Data sparas i <code class="rounded bg-white px-2 py-1 text-[11px]"
        >{data.dataPath}</code
      >
    </p>
  </div>

  <form
    method="post"
    action="?/logout"
    class="mt-8 border-t border-border pt-4"
  >
    <button
      class="inline-flex items-center gap-2 bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary transition hover:scale-105"
    >
      Logga ut
    </button>
  </form>
</SlidePanel>

<button
  type="button"
  class="fixed right-5 bottom-5 z-30 inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs font-semibold text-text-secondary shadow-subtle transition hover:scale-105 md:top-6 md:right-6 md:bottom-auto"
  on:click={() => (showYearPanel = !showYearPanel)}
  aria-expanded={showYearPanel}
  aria-label="Öppna årspanel"
>
  <span class="text-base leading-none">☰</span>
  <span class="hidden sm:inline"
    >{showYearPanel ? "Stäng år" : data.selectedYear}</span
  >
</button>
