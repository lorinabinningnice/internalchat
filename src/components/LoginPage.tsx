import { LoginCard } from "@nicecxone/lyra-ui";

/* ── LoginPage ──
   Thin wrapper that centers the shared LoginCard on a full-screen shell
   background. `onLaunch` fires once the card's own launch animation
   completes (after the user clicks "Launch") — the parent App routes to
   the agent page at that point. */

export function LoginPage({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-lyra-bg-surface-shell">
      <LoginCard onLaunch={onLaunch} />
    </div>
  );
}
