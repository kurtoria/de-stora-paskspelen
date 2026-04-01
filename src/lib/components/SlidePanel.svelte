<script lang="ts">
  export let open = false;
  export let label = "Panel";
  export let closeLabel = "Stäng panel";
  export let panelClass =
    "fixed bottom-0 right-0 left-0 z-30 max-h-[80vh] overflow-y-auto bg-surface/95 p-6 shadow-subtle backdrop-blur md:top-0 md:bottom-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-96 md:p-6 md:ring-1";
  export let backdropClass = "fixed inset-0 z-30 bg-black/30 backdrop-blur-sm";
</script>

{#if open}
  <button
    type="button"
    class={backdropClass}
    aria-label={closeLabel}
    on:click={() => (open = false)}
  ></button>

  <div
    class={panelClass}
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="dialog"
    aria-label={label}
    tabindex="-1"
  >
    <slot />
  </div>
{/if}
