<script lang="ts">
  import SlidePanel from "$lib/components/SlidePanel.svelte";

  export let showMenu = false;
  export let hasActiveFilters = false;
  export let allCategories: { id: string; name: string }[] = [];
  export let allSources: { id: string; name: string }[] = [];
  export let allAreas: { id: string; name: string }[] = [];
  export let selectedCategoryIds = new Set<string>();
  export let selectedSourceIds = new Set<string>();
  export let selectedAreaIds = new Set<string>();
  export let enableNearby = false;
  export let userLocation: { lat: number; lng: number } | null = null;
  export let locationStatus: "idle" | "requesting" | "denied" | "unavailable" =
    "idle";
  export let nearbyRadiusKm = 1;
  export let requestUserLocation: () => void;

  const toggleSetValue = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  };

  const clearFilters = () => {
    selectedCategoryIds = new Set();
    selectedSourceIds = new Set();
    selectedAreaIds = new Set();
    enableNearby = false;
  };
</script>

<button
  type="button"
  class="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs font-semibold text-text-secondary shadow-subtle transition hover:scale-105 md:top-6 md:bottom-auto"
  on:click={() => (showMenu = !showMenu)}
  aria-expanded={showMenu}
  aria-label="Meny"
>
  <span class="text-base leading-none">☰</span>
  <span class="hidden sm:inline">{showMenu ? "Stäng meny" : "Meny"}</span>
  {#if hasActiveFilters}
    <span class="ml-1 inline-flex h-2 w-2 bg-secondary"></span>
  {/if}
</button>

{#if showMenu}
  <SlidePanel bind:open={showMenu} label="Meny" closeLabel="Stäng meny">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Meny
      </p>
      <div class="flex items-center gap-2">
        {#if hasActiveFilters}
          <button
            type="button"
            class=" bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-primary transition hover:scale-105"
            on:click={clearFilters}
          >
            Rensa
          </button>
        {/if}
        <button
          type="button"
          class=" bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary transition hover:scale-105"
          on:click={() => (showMenu = false)}
        >
          Stäng
        </button>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Kategorier
        </p>
        <div class="flex flex-wrap gap-2">
          {#each allCategories as category}
            <button
              type="button"
              class=" px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition"
              class:bg-primary={selectedCategoryIds.has(category.id)}
              class:text-text-secondary={selectedCategoryIds.has(category.id)}
              class:bg-secondary={!selectedCategoryIds.has(category.id)}
              class:text-text-primary={!selectedCategoryIds.has(category.id)}
              on:click={() =>
                (selectedCategoryIds = toggleSetValue(
                  selectedCategoryIds,
                  category.id,
                ))}
              aria-pressed={selectedCategoryIds.has(category.id)}
            >
              {category.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Källor
        </p>
        <div class="flex flex-wrap gap-2">
          {#each allSources as source}
            <button
              type="button"
              class=" px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition"
              class:bg-primary={selectedSourceIds.has(source.id)}
              class:text-text-secondary={selectedSourceIds.has(source.id)}
              class:bg-secondary={!selectedSourceIds.has(source.id)}
              class:text-text-primary={!selectedSourceIds.has(source.id)}
              on:click={() =>
                (selectedSourceIds = toggleSetValue(
                  selectedSourceIds,
                  source.id,
                ))}
              aria-pressed={selectedSourceIds.has(source.id)}
            >
              {source.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Område
        </p>
        <div class="flex flex-wrap gap-2">
          {#each allAreas as area}
            <button
              type="button"
              class=" px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition"
              class:bg-primary={selectedAreaIds.has(area.id)}
              class:text-text-secondary={selectedAreaIds.has(area.id)}
              class:bg-secondary={!selectedAreaIds.has(area.id)}
              class:text-text-primary={!selectedAreaIds.has(area.id)}
              on:click={() =>
                (selectedAreaIds = toggleSetValue(
                  selectedAreaIds,
                  area.id,
                ))}
              aria-pressed={selectedAreaIds.has(area.id)}
            >
              {area.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Nära mig (fågelvägen)
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class=" px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition"
            class:bg-primary={enableNearby}
            class:text-text-secondary={enableNearby}
            class:bg-secondary={!enableNearby}
            class:text-text-primary={!enableNearby}
            on:click={() => {
              enableNearby = !enableNearby;
              if (enableNearby && !userLocation) {
                requestUserLocation();
              }
            }}
            aria-pressed={enableNearby}
          >
            {enableNearby ? `Aktiv (${nearbyRadiusKm} km)` : `Av (${nearbyRadiusKm} km)`}
          </button>
          {#if locationStatus === "requesting"}
            <span class="text-[10px] text-text-secondary">Hämtar plats...</span>
          {:else if locationStatus === "denied"}
            <span class="text-[10px] text-text-secondary">
              Plats nekad i webbläsaren
            </span>
          {:else if locationStatus === "unavailable"}
            <span class="text-[10px] text-text-secondary">
              Plats ej tillgänglig
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-6 border-t border-border pt-4">
      <a
        href="/private"
        class="inline-flex items-center gap-2 bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-primary transition hover:scale-105 hover:text-secondary hover:bg-primary"
      >
        Privat info
      </a>
    </div>
  </SlidePanel>
{/if}
