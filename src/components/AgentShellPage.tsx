import React, { useState, useEffect, useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  AppHeader,
  AppName,
  AppMenu,
  CXoneLogo,
  AiPanel,
  AiSparkleIcon,
  NotificationsBell,
  AgentNotifications,
  AgentProfile,
  Container,
  LeftNav,
  CreateNew,
  useOutboundAddButton,
  InteractionNavItem,
  TabList,
  ChannelTab,
  type NavItem,
  type CreateNewOutboundConfig,
  type CreateNewOutboundContact,
  type InteractionChannel,
  type ChannelType,
  type AgentStatus,
  type AgentNotification,
  type DraggableVariant,
} from "@nicecxone/lyra-ui";
import appIcon from "@/assets/app-icon.svg";
import {
  Home,
  Users,
  BookUser,
  CalendarDays,
  Settings,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  User,
  Sun,
  Moon,
  MessagesSquare,
} from "lucide-react";
import { InternalChatDrawer } from "@/components/InternalChatDrawer";


// ── Left nav items ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { icon: <Home      className="h-4 w-4" strokeWidth={1.5} />, label: "Home" },
  { icon: <Users     className="h-4 w-4" strokeWidth={1.5} />, label: "Contacts" },
  { icon: <BookUser  className="h-4 w-4" strokeWidth={1.5} />, label: "Directory" },
  { icon: <CalendarDays className="h-4 w-4" strokeWidth={1.5} />, label: "Schedule" },
  { icon: <Settings  className="h-4 w-4" strokeWidth={1.5} />, label: "Settings" },
];

// ── Outbound config ────────────────────────────────────────────────────────────

const OUTBOUND_CONFIG: CreateNewOutboundConfig = {
  outboundTitle: "New Outbound",
  groups: [
    { id: "favorites", label: "Favorites", kind: "favorites", emptyMessage: "No favorites yet" },
    { id: "agents",    label: "Agents",    searchPlaceholder: "Search agents",    contacts: [] },
    { id: "customers", label: "Customers", searchPlaceholder: "Search customers", contacts: [] },
    { id: "dialpad",   label: "Dial Pad",  kind: "dialpad" },
  ],
  defaultGroupId: "agents",
  channelOptions: [
    { id: "voice",    label: "Call",     selectLabel: "Voice", icon: <Phone         className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "email",    label: "Email",                          icon: <Mail          className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "sms",      label: "SMS",                            icon: <MessageSquare className="h-5 w-5" strokeWidth={1.5} /> },
    { id: "whatsapp", label: "WhatsApp",                       icon: <MessageCircle className="h-5 w-5" strokeWidth={1.5} /> },
  ],
  phoneOptions: [],
  skillOptions: [],
  onQuickDial: () => {},
  onStartCall: () => {},
  pageSize: 10,
};

// ── Interaction tracking ───────────────────────────────────────────────────────

interface TrackedChannel {
  id: string;
  type: ChannelType;
  startTick: number;
  preview?: string;
  value?: string;
  addressLabel?: string;
  awaitingResponse?: boolean;
  messageCount?: number;
  interactionId?: string;
}

interface ActiveInteraction {
  id: string;
  customerName?: string;
  recordId: string;
  channels: TrackedChannel[];
  currentChannelId?: string;
}

function generateCaseId() {
  return `CS-${Math.floor(1000000 + Math.random() * 9000000)}`;
}
function generateInteractionId() {
  return String(Math.floor(100000000000 + Math.random() * 900000000000));
}
function formatElapsed(ticks: number) {
  const t = Math.max(0, ticks);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_PANEL_DEFAULT_WIDTH = 360;

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentShellPage({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  // ── Dark mode ──
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    darkMode ? root.setAttribute("data-theme", "dark") : root.removeAttribute("data-theme");
    return () => root.removeAttribute("data-theme");
  }, [darkMode]);

  // ── Window / layout ──
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isNavNarrow    = windowWidth < 1280;
  const isCompactHeader = windowWidth < 760;

  // ── Nav ──
  const [navOpen, setNavOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  // Auto-collapse nav on narrow
  useEffect(() => {
    if (isNavNarrow && navOpen) setNavOpen(false);
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Interactions ──
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [interactions,       setInteractions]       = useState<ActiveInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) ?? null;

  const handleStartCall = (selection: {
    contact: CreateNewOutboundContact;
    channel: ChannelType;
    phone: string;
    skillId: string;
  }) => {
    const addressLabel = OUTBOUND_CONFIG.phoneOptions.find((o) => o.value === selection.phone)?.label ?? selection.phone;
    const newChannel: TrackedChannel = {
      id: `${selection.channel}:${selection.phone}`,
      type: selection.channel,
      startTick: clockTick,
      value: selection.phone,
      addressLabel,
      messageCount: selection.channel === "voice" ? undefined : 0,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === selection.contact.id);
      if (idx === -1) return [...prev, { id: selection.contact.id, customerName: selection.contact.name, recordId: selection.contact.subtitle ?? generateCaseId(), channels: [newChannel], currentChannelId: newChannel.id }];
      return prev.map((interaction, i) => {
        if (i !== idx) return interaction;
        const chIdx = interaction.channels.findIndex((c) => c.id === newChannel.id);
        const channels = chIdx === -1 ? [...interaction.channels, newChannel] : interaction.channels.map((c, j) => j === chIdx ? newChannel : c);
        return { ...interaction, channels, currentChannelId: newChannel.id };
      });
    });
    setActiveInteractionId(selection.contact.id);
    setNavOpen(true);
  };

  const handleQuickDial = (phoneNumber: string) => {
    const id = `quickdial:${phoneNumber}`;
    const newChannel: TrackedChannel = { id: "voice", type: "voice", startTick: clockTick, value: phoneNumber, addressLabel: phoneNumber, interactionId: generateInteractionId() };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, recordId: generateCaseId(), channels: [newChannel], currentChannelId: newChannel.id }];
      return prev.map((interaction, i) => i === idx ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id } : interaction);
    });
    setActiveInteractionId(id);
    setNavOpen(true);
  };

  const handleDismissInteraction = (id: string) => {
    setInteractions((prev) => prev.filter((i) => i.id !== id));
    setActiveInteractionId((cur) => cur === id ? null : cur);
  };

  const handleDismissChannel = (id: string, channel: Pick<InteractionChannel, "id" | "type">) => {
    const key = channel.id ?? channel.type;
    setInteractions((prev) => prev.map((interaction) => {
      if (interaction.id !== id) return interaction;
      const channels = interaction.channels.filter((c) => (c.id ?? c.type) !== key);
      const currentChannelId = interaction.currentChannelId === key ? channels[channels.length - 1]?.id : interaction.currentChannelId;
      return { ...interaction, channels, currentChannelId };
    }));
  };

  const handleChannelSelect = (interactionId: string, channelKey: string) => {
    setInteractions((prev) => prev.map((i) => i.id === interactionId ? { ...i, currentChannelId: channelKey } : i));
  };

  const outboundConfig = useMemo<CreateNewOutboundConfig>(() => {
    const openByContact = new Map<string, Partial<Record<ChannelType, string[]>>>(
      interactions.map((i) => {
        const byType: Partial<Record<ChannelType, string[]>> = {};
        for (const c of i.channels) { if (c.value) (byType[c.type] ??= []).push(c.value); }
        return [i.id, byType];
      })
    );
    return {
      ...OUTBOUND_CONFIG,
      groups: OUTBOUND_CONFIG.groups.map((g) => {
        if (!g.contacts) return g;
        return { ...g, contacts: g.contacts.map((c) => { const open = openByContact.get(c.id); return open ? { ...c, openChannelAddresses: open } : c; }) };
      }),
    };
  }, [interactions]);

  const { launchRequest: outboundLaunchRequest, onLaunchRequestHandled, getHeaderAction } = useOutboundAddButton(outboundConfig);

  // ── Agent status / timer ──
  const [agentStatus,    setAgentStatus]    = useState<AgentStatus>("available");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;
  const formattedTimer = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // ── Notifications ──
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);

  // ── Panel state machine ──
  type PanelState = "closed" | "open" | "closing";
  const containerRef = useRef<HTMLDivElement>(null);

  // AI panel
  const [aiPanelOpen,  setAiPanelOpen]  = useState(false);
  const [aiMounted,    setAiMounted]    = useState(false);
  const [aiState,      setAiState]      = useState<PanelState>("closed");
  const [aiVariant,    setAiVariant]    = useState<DraggableVariant>("float");
  const [aiWidth,      setAiWidth]      = useState(AI_PANEL_DEFAULT_WIDTH);
  const [aiHeight,     setAiHeight]     = useState(860);
  const [aiIsResizing, setAiIsResizing] = useState(false);
  const aiFloatLeft  = useRef<number | null>(null);
  const aiFloatTop   = useRef<number | null>(null);
  const aiPanelRef   = useRef<HTMLDivElement>(null);
  const aiAnimTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Notifications panel
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notifMounted,    setNotifMounted]    = useState(false);
  const [notifState,      setNotifState]      = useState<PanelState>("closed");
  const [notifVariant,    setNotifVariant]    = useState<DraggableVariant>("float");
  const [notifWidth,      setNotifWidth]      = useState(360);
  const [notifHeight,     setNotifHeight]     = useState(860);
  const [notifIsResizing, setNotifIsResizing] = useState(false);
  const [topPanel,        setTopPanel]        = useState<"ai" | "notif" | "chat" | null>(null);
  const notifFloatLeft = useRef<number | null>(null);
  const notifFloatTop  = useRef<number | null>(null);
  const notifPanelRef  = useRef<HTMLDivElement>(null);
  const notifAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Chat panel
  const [chatOpen,       setChatOpen]       = useState(false);
  const [chatMounted,    setChatMounted]    = useState(false);
  const [chatState,      setChatState]      = useState<PanelState>("closed");
  const [chatVariant,    setChatVariant]    = useState<DraggableVariant>("float");
  const [chatWidth,      setChatWidth]      = useState(360);
  const [chatHeight,     setChatHeight]     = useState(860);
  const [chatIsResizing, setChatIsResizing] = useState(false);
  const chatFloatLeft = useRef<number | null>(null);
  const chatFloatTop  = useRef<number | null>(null);
  const chatPanelRef  = useRef<HTMLDivElement>(null);
  const chatAnimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const computePanelHeight = () => {
    if (!containerRef.current) return 860;
    return Math.min(window.innerHeight - containerRef.current.getBoundingClientRect().top - 8, 860);
  };

  // AI open/close
  useEffect(() => {
    clearTimeout(aiAnimTimer.current);
    if (aiPanelOpen) {
      if (containerRef.current && aiFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      }
      setAiHeight(computePanelHeight());
      setAiMounted(true);
      setAiState("open");
      setTopPanel("ai");
    } else {
      setAiState("closing");
      aiAnimTimer.current = setTimeout(() => setAiState("closed"), 150);
    }
    return () => clearTimeout(aiAnimTimer.current);
  }, [aiPanelOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aiPanelOpen) return;
    const onResize = () => setAiHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aiPanelOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notif open/close
  useEffect(() => {
    clearTimeout(notifAnimTimer.current);
    if (notifOpen) {
      if (containerRef.current && notifFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16;
      }
      setNotifHeight(computePanelHeight());
      setNotifMounted(true);
      setNotifState("open");
      setTopPanel("notif");
    } else {
      setNotifState("closing");
      notifAnimTimer.current = setTimeout(() => setNotifState("closed"), 150);
    }
    return () => clearTimeout(notifAnimTimer.current);
  }, [notifOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notifOpen) return;
    const onResize = () => setNotifHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [notifOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chat open/close
  useEffect(() => {
    clearTimeout(chatAnimTimer.current);
    if (chatOpen) {
      if (containerRef.current && chatFloatLeft.current === null) {
        const r = containerRef.current.getBoundingClientRect();
        chatFloatLeft.current = r.left + containerRef.current.offsetWidth - chatWidth - 16;
      }
      setChatHeight(computePanelHeight());
      setChatMounted(true);
      setChatState("open");
      setTopPanel("chat");
    } else {
      setChatState("closing");
      chatAnimTimer.current = setTimeout(() => setChatState("closed"), 150);
    }
    return () => clearTimeout(chatAnimTimer.current);
  }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chatOpen) return;
    const onResize = () => setChatHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotifVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && notifPanelRef.current) { const r = notifPanelRef.current.getBoundingClientRect(); notifFloatLeft.current = r.left; notifFloatTop.current = r.top; }
    if (v === "docked" && aiVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16; aiFloatTop.current = null; setAiVariant("float"); }
    if (v === "docked" && chatVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); chatFloatLeft.current = r.left + containerRef.current.offsetWidth - chatWidth - 16; chatFloatTop.current = null; setChatVariant("float"); }
    setNotifVariant(v);
  };

  const handleAiVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && aiPanelRef.current) { const r = aiPanelRef.current.getBoundingClientRect(); aiFloatLeft.current = r.left; aiFloatTop.current = r.top; }
    if (v === "docked" && notifVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16; notifFloatTop.current = null; setNotifVariant("float"); }
    if (v === "docked" && chatVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); chatFloatLeft.current = r.left + containerRef.current.offsetWidth - chatWidth - 16; chatFloatTop.current = null; setChatVariant("float"); }
    setAiVariant(v);
  };

  const handleChatVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && chatPanelRef.current) { const r = chatPanelRef.current.getBoundingClientRect(); chatFloatLeft.current = r.left; chatFloatTop.current = r.top; }
    if (v === "docked" && aiVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16; aiFloatTop.current = null; setAiVariant("float"); }
    if (v === "docked" && notifVariant === "docked" && containerRef.current) { const r = containerRef.current.getBoundingClientRect(); notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16; notifFloatTop.current = null; setNotifVariant("float"); }
    setChatVariant(v);
  };

  const getFloatStyle = (
    floatLeft: React.MutableRefObject<number | null>,
    floatTop:  React.MutableRefObject<number | null>,
    panelWidth: number,
    zIndex: number,
  ): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = floatLeft.current !== null ? floatLeft.current : containerRef.current ? (rect?.left ?? 0) + containerRef.current.offsetWidth - panelWidth - 16 : 0;
    const top  = floatTop.current  !== null ? floatTop.current  : (rect?.top ?? 0);
    return { position: "fixed", top, left, zIndex };
  };

  const notifPanel = notifMounted ? (
    <AgentNotifications
      ref={notifPanelRef}
      notifications={notifications}
      draggableVariant={notifVariant}
      onVariantChange={handleNotifVariantChange}
      onWidthChange={setNotifWidth}
      onResizeStateChange={setNotifIsResizing}
      onInteract={() => setTopPanel("notif")}
      onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
      onClearAll={() => setNotifications([])}
      onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      onNotificationClick={(n) => setNotifications((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))}
      onClose={() => setNotifOpen(false)}
      defaultWidth={notifWidth}
      height={notifHeight}
    />
  ) : null;

  const aiPanel = aiMounted ? (
    <AiPanel
      ref={aiPanelRef}
      draggable
      draggableVariant={aiVariant}
      defaultDraggableWidth={aiWidth}
      defaultDraggableHeight={aiHeight}
      onVariantChange={handleAiVariantChange}
      onWidthChange={setAiWidth}
      onResizeStateChange={setAiIsResizing}
      onInteract={() => setTopPanel("ai")}
      userName="John"
      suggestions={[
        { id: "1", label: "Summarise this contact's history" },
        { id: "2", label: "Suggest a response to the customer" },
        { id: "3", label: "What changed since yesterday?" },
      ]}
      onClose={() => setAiPanelOpen(false)}
      className={aiVariant === "docked" ? "h-full" : undefined}
    />
  ) : null;

  const chatPanel = chatMounted ? (
    <InternalChatDrawer
      ref={chatPanelRef}
      draggableVariant={chatVariant}
      onVariantChange={handleChatVariantChange}
      onWidthChange={setChatWidth}
      onResizeStateChange={setChatIsResizing}
      onInteract={() => setTopPanel("chat")}
      onClose={() => setChatOpen(false)}
      defaultDraggableWidth={chatWidth}
      height={chatHeight}
      className={chatVariant === "docked" ? "h-full" : undefined}
    />
  ) : null;

  // Close docked panels on narrow viewport
  useEffect(() => {
    if (isNavNarrow) {
      if (aiVariant === "docked")    { setAiVariant("float");    setAiPanelOpen(false); }
      if (notifVariant === "docked") { setNotifVariant("float"); setNotifOpen(false); }
      if (chatVariant === "docked")  { setChatVariant("float");  setChatOpen(false); }
    }
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── App menu groups (with navigation wired) ──
  const appMenuGroups = [
    {
      items: [
        { label: "Admin" },
        { label: "Supervisor" },
        { label: "Agent", active: true },
        {
          label: "Internal Chat",
          onClick: () => {
            setAppMenuOpen(false);
            onNavigate?.("agent");
          },
        },
      ],
    },
    {
      items: [
        { label: "Workforce Management" },
        { label: "Quality Management" },
        { label: "Interaction Hub" },
        { label: "My Zone" },
      ],
    },
    {
      items: [
        { label: "Dashboard" },
        { label: "Analytics" },
      ],
    },
  ];

  // ── Render ──
  return (
    <div className="flex flex-col h-screen bg-lyra-bg-surface-shell overflow-hidden animate-in fade-in-0 duration-300">

      {/* App Header */}
      <AppHeader
        appName={
          <PopoverPrimitive.Root open={appMenuOpen} onOpenChange={setAppMenuOpen}>
            <PopoverPrimitive.Trigger asChild>
              <AppName
                icon={<img src={appIcon} alt="Agent Next Gen" className="h-6 w-6" />}
                name="Agent Next Gen"
                compact={isCompactHeader}
                aria-expanded={appMenuOpen}
              />
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="start"
                sideOffset={6}
                onOpenAutoFocus={(e: Event) => e.preventDefault()}
                className="z-[9999] animate-in fade-in-0 slide-in-from-top-2 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=closed]:duration-100"
              >
                <AppMenu
                  groups={appMenuGroups}
                  footer={<CXoneLogo />}
                  header={isCompactHeader ? "Agent Next Gen" : undefined}
                />
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        }
        actions={
          <>
            {/* Internal Chat drawer toggle */}
            <button
              type="button"
              aria-label="Internal Chat"
              aria-expanded={chatOpen}
              onClick={() => setChatOpen((v) => !v)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lyra-lg text-lyra-fg-default transition-colors hover:bg-lyra-state-hover active:bg-lyra-state-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus ${chatOpen ? "bg-lyra-state-hover" : ""}`}
            >
              <MessagesSquare className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDarkMode((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lyra-lg text-lyra-fg-default transition-colors hover:bg-lyra-state-hover active:bg-lyra-state-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus"
            >
              {darkMode
                ? <Sun  className="h-5 w-5" strokeWidth={1.5} />
                : <Moon className="h-5 w-5" strokeWidth={1.5} />}
            </button>
            <NotificationsBell
              notifications={notifications}
              open={notifOpen}
              onOpenChange={setNotifOpen}
              renderPanel={false}
            />
            <button
              type="button"
              aria-label="Ask AI"
              aria-expanded={aiPanelOpen}
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lyra-lg text-lyra-fg-default transition-colors hover:bg-lyra-state-hover active:bg-lyra-state-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lyra-border-focus ${aiPanelOpen ? "bg-lyra-state-hover" : ""}`}
            >
              <AiSparkleIcon />
            </button>
            <AgentProfile
              name="John Smith"
              initials="JS"
              status={agentStatus}
              onStatusChange={(status) => { setAgentStatus(status); setElapsedSeconds(0); }}
              timer={formattedTimer}
              className="ml-1"
            />
          </>
        }
      />

      {/* Body: LeftNav + Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        <LeftNav
          items={NAV_ITEMS}
          open={navOpen}
          onToggle={() => setNavOpen((v) => !v)}
          overlay={isNavNarrow}
          pinnedHeader={
            <CreateNew
              title="New Outbound"
              outbound={{
                ...outboundConfig,
                onStartCall: handleStartCall,
                onQuickDial: handleQuickDial,
                launchRequest: outboundLaunchRequest,
                onLaunchRequestHandled,
              }}
              expanded={navOpen}
            />
          }
          header={
            <>
              {interactions.map((interaction) => {
                const mostRecentId = interaction.channels[interaction.channels.length - 1]?.id;
                const currentId = interaction.currentChannelId ?? mostRecentId;
                const channels: InteractionChannel[] = interaction.channels.map((c) => ({
                  id: c.id,
                  type: c.type,
                  elapsed: formatElapsed(clockTick - c.startTick),
                  preview: c.preview,
                  current: c.id === currentId,
                  awaitingResponse: c.awaitingResponse ?? false,
                }));
                const earliestStart = Math.min(...interaction.channels.map((c) => c.startTick));
                return (
                  <InteractionNavItem
                    key={interaction.id}
                    customerName={interaction.customerName}
                    active={activeInteractionId === interaction.id}
                    onClick={() => setActiveInteractionId(interaction.id)}
                    awaitingResponse={channels.some((c) => c.awaitingResponse)}
                    elapsed={formatElapsed(clockTick - earliestStart)}
                    expanded={navOpen}
                    channels={channels}
                    onDismiss={() => handleDismissInteraction(interaction.id)}
                    onDismissChannel={(ch) => handleDismissChannel(interaction.id, ch)}
                    headerAction={getHeaderAction(interaction.id)}
                    currentChannelKey={currentId}
                    onCurrentChannelChange={(key) => handleChannelSelect(interaction.id, key)}
                  />
                );
              })}
            </>
          }
        />

        {/* Content area */}
        <div ref={containerRef} className="relative flex flex-1 min-w-0 overflow-hidden px-3 pb-3">
          <Container className="flex flex-1 overflow-hidden relative">

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {activeInteraction ? (
                // Active interaction detail
                <>
                  <div className="px-6 py-4 border-b border-lyra-border-subtle">
                    <p className="text-sm font-semibold text-lyra-fg-default">
                      {activeInteraction.customerName ?? "Customer"}
                    </p>
                    <p className="text-xs text-lyra-fg-secondary">{activeInteraction.recordId}</p>
                  </div>
                  {activeInteraction.channels.length > 0 && (
                    <TabList className="px-6 bg-lyra-bg-surface-base shrink-0 lyra-channel-tab-list-wrap">
                      {activeInteraction.channels.map((c) => {
                        const key = c.id ?? c.type;
                        return (
                          <ChannelTab
                            key={key}
                            type={c.type}
                            address={c.addressLabel}
                            messageCount={c.messageCount}
                            interactionId={c.interactionId}
                            active={(activeInteraction.currentChannelId ?? activeInteraction.channels[activeInteraction.channels.length - 1]?.id) === key}
                            onClick={() => handleChannelSelect(activeInteraction.id, key)}
                            onDismiss={() => {
                              if (activeInteraction.channels.length > 1) handleDismissChannel(activeInteraction.id, c);
                              else handleDismissInteraction(activeInteraction.id);
                            }}
                          />
                        );
                      })}
                    </TabList>
                  )}
                  <div className="flex-1 overflow-y-auto" />
                </>
              ) : (
                // Empty shell — matches the "Agent Next Gen – Shell" story
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-lyra-fg-secondary">Select a contact to begin</p>
                </div>
              )}
            </div>

          </Container>

          {/* Notifications float */}
          {notifVariant === "float" && notifMounted && (
            <div style={{ ...getFloatStyle(notifFloatLeft, notifFloatTop, notifWidth, topPanel === "notif" ? 10000 : 9999), pointerEvents: "none", visibility: notifState === "closed" ? "hidden" : "visible", opacity: notifState === "open" ? 1 : 0, transform: notifState === "open" ? "translateY(0)" : "translateY(-8px)", transition: notifState === "open" ? "opacity 150ms ease, transform 150ms ease" : "opacity 100ms ease, transform 100ms ease" }}>
              <div style={{ pointerEvents: "auto" }}>{notifPanel}</div>
            </div>
          )}

          {/* AI Panel float */}
          {aiVariant === "float" && aiMounted && (
            <div style={{ ...getFloatStyle(aiFloatLeft, aiFloatTop, aiWidth, topPanel === "ai" ? 10000 : 9999), pointerEvents: "none", visibility: aiState === "closed" ? "hidden" : "visible", opacity: aiState === "open" ? 1 : 0, transform: aiState === "open" ? "translateY(0)" : "translateY(-8px)", transition: aiState === "open" ? "opacity 150ms ease, transform 150ms ease" : "opacity 100ms ease, transform 100ms ease" }}>
              <div style={{ pointerEvents: "auto" }}>{aiPanel}</div>
            </div>
          )}

          {/* Chat Panel float */}
          {chatVariant === "float" && chatMounted && (
            <div style={{ ...getFloatStyle(chatFloatLeft, chatFloatTop, chatWidth, topPanel === "chat" ? 10000 : 9999), pointerEvents: "none", visibility: chatState === "closed" ? "hidden" : "visible", opacity: chatState === "open" ? 1 : 0, transform: chatState === "open" ? "translateY(0)" : "translateY(-8px)", transition: chatState === "open" ? "opacity 150ms ease, transform 150ms ease" : "opacity 100ms ease, transform 100ms ease" }}>
              <div style={{ pointerEvents: "auto" }}>{chatPanel}</div>
            </div>
          )}
        </div>

        {/* Notifications docked */}
        {notifVariant === "docked" && (
          <div className="pb-3" style={{ width: notifState === "open" ? notifWidth : 0, marginRight: notifState === "open" ? 12 : 0, overflow: "hidden", flexShrink: 0, transition: notifIsResizing ? "none" : "width 250ms cubic-bezier(0.4,0,0.2,1)" }}>
            <div className="h-full animate-in fade-in-0 duration-150" style={{ width: notifWidth, display: notifState === "open" ? "block" : "none" }}>{notifPanel}</div>
          </div>
        )}

        {/* AI docked */}
        {aiVariant === "docked" && (
          <div className="pb-3" style={{ width: aiState === "open" ? aiWidth : 0, marginRight: aiState === "open" ? 12 : 0, overflow: "hidden", flexShrink: 0, transition: aiIsResizing ? "none" : "width 250ms cubic-bezier(0.4,0,0.2,1)" }}>
            <div className="h-full animate-in fade-in-0 duration-150" style={{ width: aiWidth, display: aiState === "open" ? "block" : "none" }}>{aiPanel}</div>
          </div>
        )}

        {/* Chat docked */}
        {chatVariant === "docked" && (
          <div className="pb-3" style={{ width: chatState === "open" ? chatWidth : 0, marginRight: chatState === "open" ? 12 : 0, overflow: "hidden", flexShrink: 0, transition: chatIsResizing ? "none" : "width 250ms cubic-bezier(0.4,0,0.2,1)" }}>
            <div className="h-full animate-in fade-in-0 duration-150" style={{ width: chatWidth, display: chatState === "open" ? "block" : "none" }}>{chatPanel}</div>
          </div>
        )}

      </div>
    </div>
  );
}
