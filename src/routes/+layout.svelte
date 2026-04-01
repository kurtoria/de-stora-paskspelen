<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="relative min-h-screen overflow-hidden bg-secondary">

  <div class="relative z-10 flex min-h-screen flex-col">
    <main class="flex-1">
      {@render children()}
    </main>
  </div>
</div>
