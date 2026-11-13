import { useState, useCallback, useEffect } from "react";
import { LoginPage } from "@/components/LoginPage";
import { AgentNextGenPage } from "@/components/AgentNextGenPage";
import { AgentShellPage } from "@/components/AgentShellPage";

/* ── Hash-based routing ── */

type Page = "login" | "agent" | "agent-shell";

function pageFromHash(): Page {
  if (window.location.hash === "#/agent-shell") return "agent-shell";
  if (window.location.hash === "#/agent") return "agent";
  return "login";
}

function useHashRouter(): [Page, (page: Page) => void] {
  const [page, setPageState] = useState<Page>(pageFromHash);

  useEffect(() => {
    const onPop = () => setPageState(pageFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Page) => {
    const hash = next === "agent" ? "#/agent" : next === "agent-shell" ? "#/agent-shell" : "";
    window.history.pushState(null, "", hash || window.location.pathname);
    setPageState(next);
  }, []);

  return [page, navigate];
}

/* ── App ── */

function App() {
  const [page, navigate] = useHashRouter();

  if (page === "login") {
    return <LoginPage onLaunch={() => navigate("agent")} />;
  }

  if (page === "agent-shell") {
    return <AgentShellPage onNavigate={navigate as (page: string) => void} />;
  }

  return <AgentNextGenPage onNavigate={navigate as (page: string) => void} />;
}

export default App;
