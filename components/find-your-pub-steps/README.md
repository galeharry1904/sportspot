# Find your pub in 4 steps — animated section (Option A: Matchday Route)

Drop-in replacement for the "Find your pub in 4 steps" section of the SportSpot site.

| File | What it is |
| --- | --- |
| `FindYourPubSteps.tsx` | The section as a React component. No props, no client JS, no dependencies. |
| `FindYourPubSteps.module.css` | All styles and the 12s animation timeline (CSS Modules, built into Next.js). |

Behaviour:

- 12-second loop. An orange marker runs along the route and each step card comes forward in turn while its illustration plays: picking a team, a pub confirming its fixtures, pins dropping on a London fan map, then walking up to the pub as the game goes live.
- Responsive: 4 columns on desktop, 2 on tablet (route line hidden), 1 on phones.
- Respects `prefers-reduced-motion` (shows everything finished, nothing moves).
- Inherits the site's font. The copy matches the live site.
- Checked with `next build` (Next 15, TypeScript and ESLint pass) and rendered in Chromium against the design.

## Prompt for Claude Code

Put this folder in your project (for example at `components/find-your-pub-steps/`), then paste this into Claude Code:

```
I've added a new component at components/find-your-pub-steps/ (FindYourPubSteps.tsx
+ FindYourPubSteps.module.css). It's an animated replacement for the
"Find your pub in 4 steps" section on the homepage.

1. Create a new git branch called feature/animated-steps.
2. Find the existing "Find your pub in 4 steps" section and replace it with
   <FindYourPubSteps />. Keep any id/anchor the old section had (e.g. for nav
   links) by putting it on a wrapper or passing it through.
3. If our project keeps components somewhere else (e.g. src/components) or uses a
   different import alias, move it and fix the import.
4. Don't change the component's design or animation. Only adjust the section's
   outer padding/background if it clashes with the sections above and below it.
5. Run the dev server and tell me the local URL so I can look at it. Don't commit
   or push until I say so.
```

## Seeing it on the real site

- **Locally:** `npm run dev`, then open http://localhost:3000 and scroll to the section.
- **On a Vercel preview URL:** once you're happy, ask Claude Code to commit and push
  the `feature/animated-steps` branch. Vercel builds a preview deployment for the
  branch (a separate URL), so you can check it on your phone or share it, and the
  live site doesn't change until the branch is merged.
