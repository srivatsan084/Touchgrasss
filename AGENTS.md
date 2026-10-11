<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## TouchGrass architecture
- Use TanStack Start React and Lovable Cloud for hosted application logic; Python/FastAPI requires an independently hosted service because the app host cannot run Python.
- Keep Leaflet dynamically imported behind ClientOnly to prevent browser-only imports during SSR.
- Keep demo activities explicitly labeled and separate from Cloud-owned activities so examples cannot be confused with verified activity records.
- Save activities and private photos under the signed-in owner; only trusted verification may award XP or confidence, preventing client-forged scores.
- Use PostgreSQL PostGIS geography for activity location indexing and JSON GPS route points for recorded trails.
