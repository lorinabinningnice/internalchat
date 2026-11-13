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
  Panel,
  CustomerInformationPanel,
  PanelPinButton,
  PageHeader,
  Button,
  Input,
  LeftNav,
  CreateNew,
  useOutboundAddButton,
  InteractionNavItem,
  TabList,
  ChannelTab,
  Overlay,
  AgentWelcomeMessage,
  type NavItem,
  type CreateNewOutboundConfig,
  type CreateNewOutboundContact,
  type InteractionChannel,
  type ChannelType,
  type AgentStatus,
  type AppMenuGroup,
  type AgentNotification,
  type DraggableVariant,
} from "@nicecxone/lyra-ui";
import appIcon from "@/assets/app-icon.svg";
import { InternalChatPage } from "@/components/InternalChatPage";
import { InternalChatDrawer } from "@/components/InternalChatDrawer";
import {
  Home,
  Users,
  BookUser,
  CalendarDays,
  Settings,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  User,
  Sun,
  Moon,
} from "lucide-react";


/* ── Left nav items ──
   Matches lyra-ui's AgentNextGenTemplate.stories.tsx "Agent Next Gen Left Nav"
   icon rail exactly — no item marked active (the rail doesn't track a current
   page here, same as that story). */

const NAV_ITEMS: NavItem[] = [
  {
    icon: <Home className="h-4 w-4" strokeWidth={1.5} />,
    label: "Home",
  },
  {
    icon: <Users className="h-4 w-4" strokeWidth={1.5} />,
    label: "Contacts",
  },
  {
    icon: <BookUser className="h-4 w-4" strokeWidth={1.5} />,
    label: "Directory",
  },
  {
    icon: <CalendarDays className="h-4 w-4" strokeWidth={1.5} />,
    label: "Schedule",
  },
  {
    icon: <Settings className="h-4 w-4" strokeWidth={1.5} />,
    label: "Settings",
  },
];

/* ── Outbound config ──
   Structural shell only — no agent/customer contact records.
   Add real contact groups here when the prototype needs them. */

const OUTBOUND_CONFIG: CreateNewOutboundConfig = {
  outboundTitle: "New Outbound",
  groups: [
    { id: "favorites", label: "Favorites", kind: "favorites", emptyMessage: "No favorites yet" },
    { id: "agents",    label: "Agents",    searchPlaceholder: "Search Agents",    contacts: [] },
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

/* ── Left nav interaction tracking ──
   Mirrors lyra-ui's AgentNextGenTemplate.stories.tsx — starting/quick-dialing
   from CreateNew above surfaces a real InteractionNavItem card here instead of
   leaving the rail static. */

interface TrackedChannel {
  id: string;
  type: ChannelType;
  startTick: number;
  preview?: string;
  value?: string;
  /** Human-readable version of `value` for display on this channel's
   *  ChannelTab (e.g. "(456) 383-3329" vs. value's raw "+14563833329").
   *  See agent-next-gen-v1's own copy of this field for the full rationale. */
  addressLabel?: string;
  awaitingResponse?: boolean;
  /** Synthesized message count/conversation id shown on this channel's
   *  ChannelTab tooltip. See agent-next-gen-v1's own copy for the full rationale. */
  messageCount?: number;
  interactionId?: string;
}

interface ActiveInteraction {
  id: string;
  customerName?: string;
  /** Contact/record id shown under the name on the interaction detail page header. */
  recordId: string;
  channels: TrackedChannel[];
  /** Which open channel is "current" — shared between the InteractionNavItem
   *  card and the ChannelTab bar. */
  currentChannelId?: string;
}

function generateCaseId(): string {
  return `CS-${Math.floor(1000000 + Math.random() * 9000000)}`;
}

function generateInteractionId(): string {
  return String(Math.floor(100000000000 + Math.random() * 900000000000));
}

function formatElapsedTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/* ── AgentNextGenPage ── */

const AI_PANEL_DEFAULT_WIDTH = 360;

export function AgentNextGenPage({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const [navOpen, setNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    return () => root.removeAttribute("data-theme");
  }, [darkMode]);
  const [interactions, setInteractions] = useState<ActiveInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) ?? null;

  // Shared clock powering every open channel's live "MM:SS since it started"
  // elapsed display — independent of elapsedSeconds below, which is the
  // agent's own status timer and resets on status change.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  // No initial notifications — add real ones here when the prototype needs them.
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("available");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  // Welcome modal — shown once on mount. Remove this state (and the <Overlay>
  // below) if you don't want the welcome modal for this prototype.
  const [showWelcome, setShowWelcome] = useState(true);

  /* Panel animation state machine
   * "closed"  → visibility:hidden + data-state="closed" (preserves Draggable offset, no display:none flash)
   * "open"    → visibility:visible + data-state="open"  (enter animation plays)
   * "closing" → visibility:visible + data-state="closed" (exit animation plays)
   *
   * Using visibility:hidden instead of display:none avoids a GPU compositor race where
   * one frame of the enter animation's fill-mode (opacity:0) can appear before display:none
   * propagates to the compositor — the root cause of the close flicker.
   */
  type PanelState = "closed" | "open" | "closing";

  /* AI panel state */
  const [aiPanelOpen,   setAiPanelOpen]   = useState(false);
  const [aiMounted,     setAiMounted]     = useState(false);
  const [aiState,       setAiState]       = useState<PanelState>("closed");
  const [aiVariant,     setAiVariant]     = useState<DraggableVariant>("float");
  const [aiWidth,       setAiWidth]       = useState(AI_PANEL_DEFAULT_WIDTH);
  const [aiHeight,      setAiHeight]      = useState(860);
  const [aiIsResizing,  setAiIsResizing]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiFloatLeft  = useRef<number | null>(null);
  const aiFloatTop   = useRef<number | null>(null);
  const aiPanelRef   = useRef<HTMLDivElement>(null);
  const aiAnimTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Notifications panel state */
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

  /* Chat panel state */
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

  /* Interior panel (right) */
  const [interiorPanelOpen, setInteriorPanelOpen] = useState(false);

  /* Side panel */
  const [sidePanelOpen,     setSidePanelOpen]     = useState(false);
  const [sidePanelPinned,   setSidePanelPinned]   = useState(false);
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  const [sidePanelWidth,    setSidePanelWidth]    = useState(256);
  const [containerWidth,    setContainerWidth]    = useState(9999);
  const sidePanelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track container width to force unpinned below 768px
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrowContainer = containerWidth < 768;
  const effectivePinned = isNarrowContainer ? false : sidePanelPinned;

  // Close and fully unpin the side panel when container drops below 768px.
  useEffect(() => {
    if (isNarrowContainer) {
      setSidePanelOpen(false);
      setSidePanelPinned(false);
    }
  }, [isNarrowContainer]);

  // The side panel belongs to the interaction it was opened from — close it
  // when the interaction ends.
  useEffect(() => {
    if (!activeInteractionId) {
      setSidePanelOpen(false);
      setSidePanelPinned(false);
    }
  }, [activeInteractionId]);

  // Track window width for nav overlay breakpoint
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isNavNarrow = windowWidth < 1280;
  const isCompactHeader = windowWidth < 760;

  // Auto-collapse the expanded nav when viewport drops below 1280px
  useEffect(() => {
    if (isNavNarrow && navOpen) setNavOpen(false);
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close and undock any docked panels when viewport drops below 1280px
  useEffect(() => {
    if (isNavNarrow) {
      if (aiVariant === "docked") {
        setAiVariant("float");
        setAiPanelOpen(false);
      }
      if (notifVariant === "docked") {
        setNotifVariant("float");
        setNotifOpen(false);
      }
      if (chatVariant === "docked") {
        setChatVariant("float");
        setChatOpen(false);
      }
    }
  }, [isNavNarrow]); // eslint-disable-line react-hooks/exhaustive-deps

  // No hidden gating — see AgentNextGenTemplate.stories.tsx for the full
  // rationale on hover-vs-pin behavior.
  const onSidePanelHoverStart = () => {
    clearTimeout(sidePanelTimer.current);
    setSidePanelOpen(true);
  };
  const onSidePanelHoverEnd = () => {
    if (sidePanelPinned) return;
    sidePanelTimer.current = setTimeout(() => setSidePanelOpen(false), 300);
  };
  const handleSidePanelPinToggle = () => {
    setSidePanelPinned((v) => !v);
    setSidePanelOpen(true);
  };
  const handleSidePanelIconToggle = () => {
    clearTimeout(sidePanelTimer.current);
    const nextPinned = !sidePanelPinned;
    setSidePanelPinned(nextPinned);
    setSidePanelOpen(nextPinned);
  };

  const MAX_PANEL_HEIGHT = 860;
  const BOTTOM_PADDING   = 8;

  const computePanelHeight = () => {
    if (!containerRef.current) return MAX_PANEL_HEIGHT;
    const top = containerRef.current.getBoundingClientRect().top;
    return Math.min(window.innerHeight - top - BOTTOM_PADDING, MAX_PANEL_HEIGHT);
  };

  /* Status timer */
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;
  const formattedTimer = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const handleStatusChange = (status: AgentStatus) => {
    setAgentStatus(status);
    setElapsedSeconds(0);
  };

  /* ── Launching interactions from CreateNew ──
     Overrides OUTBOUND_CONFIG's default no-op handlers so starting/quick-
     dialing from CreateNew actually surfaces InteractionNavItem cards in the
     left nav. Mirrors lyra-ui's AgentNextGenTemplate.stories.tsx exactly —
     see that story for the full rationale on each piece. */
  const handleStartCall = (selection: {
    contact: CreateNewOutboundContact;
    channel: ChannelType;
    phone: string;
    skillId: string;
  }) => {
    const skillLabel = OUTBOUND_CONFIG.skillOptions.find((o) => o.value === selection.skillId)?.label;
    const addressLabel = OUTBOUND_CONFIG.phoneOptions.find((o) => o.value === selection.phone)?.label ?? selection.phone;
    const newChannel: TrackedChannel = {
      id: `${selection.channel}:${selection.phone}`,
      type: selection.channel,
      startTick: clockTick,
      preview: skillLabel,
      value: selection.phone,
      addressLabel,
      messageCount: selection.channel === "voice" ? undefined : 0,
      interactionId: generateInteractionId(),
    };

    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === selection.contact.id);
      if (idx === -1) {
        return [...prev, {
          id: selection.contact.id,
          customerName: selection.contact.name,
          recordId: selection.contact.subtitle ?? generateCaseId(),
          channels: [newChannel],
          currentChannelId: newChannel.id,
        }];
      }
      return prev.map((interaction, i) => {
        if (i !== idx) return interaction;
        const chIdx = interaction.channels.findIndex((c) => c.id === newChannel.id);
        const channels = chIdx === -1
          ? [...interaction.channels, newChannel]
          : interaction.channels.map((c, j) => (j === chIdx ? newChannel : c));
        return { ...interaction, channels, currentChannelId: newChannel.id };
      });
    });
    setActiveInteractionId(selection.contact.id);
    setNavOpen(true);
  };

  const handleQuickDial = (phoneNumber: string) => {
    const id = `quickdial:${phoneNumber}`;
    const newChannel: TrackedChannel = {
      id: "voice",
      type: "voice",
      startTick: clockTick,
      value: phoneNumber,
      addressLabel: phoneNumber,
      interactionId: generateInteractionId(),
    };
    setInteractions((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return [...prev, { id, recordId: generateCaseId(), channels: [newChannel], currentChannelId: newChannel.id }];
      return prev.map((interaction, i) => (i === idx ? { ...interaction, channels: [newChannel], currentChannelId: newChannel.id } : interaction));
    });
    setActiveInteractionId(id);
    setNavOpen(true);
  };

  const handleDismissInteraction = (id: string) => {
    setInteractions((prev) => prev.filter((interaction) => interaction.id !== id));
    setActiveInteractionId((current) => (current === id ? null : current));
  };

  const handleDismissChannel = (id: string, channel: Pick<InteractionChannel, "id" | "type">) => {
    const dismissedKey = channel.id ?? channel.type;
    setInteractions((prev) =>
      prev.map((interaction) => {
        if (interaction.id !== id) return interaction;
        const channels = interaction.channels.filter((c) => (c.id ?? c.type) !== dismissedKey);
        const currentChannelId = interaction.currentChannelId === dismissedKey
          ? channels[channels.length - 1]?.id
          : interaction.currentChannelId;
        return { ...interaction, channels, currentChannelId };
      })
    );
  };

  const handleChannelSelect = (interactionId: string, channelKey: string) => {
    setInteractions((prev) =>
      prev.map((interaction) =>
        interaction.id === interactionId ? { ...interaction, currentChannelId: channelKey } : interaction
      )
    );
  };

  /* ── Preventing duplicate channels from the CreateNew picker ──
     See lyra-ui's AgentNextGenTemplate.stories.tsx outboundConfig useMemo
     for the full rationale — kept identical here. */
  const outboundConfig = useMemo<CreateNewOutboundConfig>(() => {
    const openAddressesByContactId = new Map<string, Partial<Record<ChannelType, string[]>>>(
      interactions.map((interaction) => {
        const byType: Partial<Record<ChannelType, string[]>> = {};
        for (const c of interaction.channels) {
          if (!c.value) continue;
          (byType[c.type] ??= []).push(c.value);
        }
        return [interaction.id, byType];
      })
    );
    return {
      ...OUTBOUND_CONFIG,
      groups: OUTBOUND_CONFIG.groups.map((group) => {
        if (!group.contacts) return group;
        return {
          ...group,
          contacts: group.contacts.map((contact) => {
            const openChannelAddresses = openAddressesByContactId.get(contact.id);
            if (!openChannelAddresses || Object.keys(openChannelAddresses).length === 0) return contact;
            return { ...contact, openChannelAddresses };
          }),
        };
      }),
    };
  }, [interactions]);

  const { launchRequest: outboundLaunchRequest, onLaunchRequestHandled, getHeaderAction } = useOutboundAddButton(outboundConfig);

  /* AI panel show/hide */
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
  }, [aiPanelOpen]);

  useEffect(() => {
    if (!aiPanelOpen) return;
    const onResize = () => setAiHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aiPanelOpen]);

  /* Notifications panel show/hide — same state machine as AI panel */
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
  }, [notifOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const onResize = () => setNotifHeight(computePanelHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [notifOpen]);

  /* Chat panel show/hide */
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
    if (v === "docked" && notifPanelRef.current) {
      const r = notifPanelRef.current.getBoundingClientRect();
      notifFloatLeft.current = r.left;
      notifFloatTop.current  = r.top;
    }
    if (v === "docked" && aiVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      aiFloatTop.current  = null;
      setAiVariant("float");
    }
    if (v === "docked" && chatVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      chatFloatLeft.current = r.left + containerRef.current.offsetWidth - chatWidth - 16;
      chatFloatTop.current  = null;
      setChatVariant("float");
    }
    setNotifVariant(v);
  };

  const getNotifFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = notifFloatLeft.current !== null
      ? notifFloatLeft.current
      : containerRef.current
        ? (rect?.left ?? 0) + containerRef.current.offsetWidth - notifWidth - 16
        : 0;
    const top = notifFloatTop.current !== null
      ? notifFloatTop.current
      : (rect?.top ?? 0);
    return {
      position: "fixed",
      top,
      left,
      zIndex: topPanel === "notif" ? 10000 : 9999,
    };
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
      onNotificationClick={(n) =>
        setNotifications((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))
      }
      onClose={() => setNotifOpen(false)}
      defaultWidth={notifWidth}
      height={notifHeight}
    />
  ) : null;

  const handleAiVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && aiPanelRef.current) {
      const r = aiPanelRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left;
      aiFloatTop.current  = r.top;
    }
    if (v === "docked" && notifVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16;
      notifFloatTop.current  = null;
      setNotifVariant("float");
    }
    if (v === "docked" && chatVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      chatFloatLeft.current = r.left + containerRef.current.offsetWidth - chatWidth - 16;
      chatFloatTop.current  = null;
      setChatVariant("float");
    }
    setAiVariant(v);
  };

  const handleChatVariantChange = (v: DraggableVariant) => {
    if (v === "docked" && chatPanelRef.current) {
      const r = chatPanelRef.current.getBoundingClientRect();
      chatFloatLeft.current = r.left;
      chatFloatTop.current  = r.top;
    }
    if (v === "docked" && aiVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      aiFloatLeft.current = r.left + containerRef.current.offsetWidth - aiWidth - 16;
      aiFloatTop.current  = null;
      setAiVariant("float");
    }
    if (v === "docked" && notifVariant === "docked" && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      notifFloatLeft.current = r.left + containerRef.current.offsetWidth - notifWidth - 16;
      notifFloatTop.current  = null;
      setNotifVariant("float");
    }
    setChatVariant(v);
  };

  const getChatFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = chatFloatLeft.current !== null
      ? chatFloatLeft.current
      : containerRef.current
        ? (rect?.left ?? 0) + containerRef.current.offsetWidth - chatWidth - 16
        : 0;
    const top = chatFloatTop.current !== null
      ? chatFloatTop.current
      : (rect?.top ?? 0);
    return {
      position: "fixed",
      top,
      left,
      zIndex: topPanel === "chat" ? 10000 : 9999,
    };
  };

  const getAiFloatStyle = (): React.CSSProperties => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = aiFloatLeft.current !== null
      ? aiFloatLeft.current
      : containerRef.current
        ? (rect?.left ?? 0) + containerRef.current.offsetWidth - aiWidth - 16
        : 0;
    const top = aiFloatTop.current !== null
      ? aiFloatTop.current
      : (rect?.top ?? 0);
    return {
      position: "fixed",
      top,
      left,
      zIndex: topPanel === "ai" ? 10000 : 9999,
    };
  };

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

  return (
    <div className="flex flex-col h-screen bg-lyra-bg-surface-shell overflow-hidden animate-in fade-in-0 duration-500">

      {/* ── Welcome modal — shown once on load ──
          Remove showWelcome state + this block if you don't want it. */}
      <Overlay open={showWelcome} onClose={() => setShowWelcome(false)} closeOnBackdropClick>
        <AgentWelcomeMessage
          title="Good morning, John Smith"
          lastLogin="Today at 8:42 AM"
          onPrimaryClick={() => setShowWelcome(false)}
          onSecondaryClick={() => setShowWelcome(false)}
        >
          <p className="lyra-body-md text-lyra-fg-default">
            Your current skills are Outbound Collections, English and Escalations.
            8 teammates are currently online.
          </p>
        </AgentWelcomeMessage>
      </Overlay>

      {/* ── App Header ── */}
      <AppHeader
        appName={
          <PopoverPrimitive.Root open={appMenuOpen} onOpenChange={setAppMenuOpen}>
            <PopoverPrimitive.Trigger asChild>
              <AppName
                icon={<img src={appIcon} alt="Internal Chat" className="h-6 w-6" />}
                name="Internal Chat"
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
                  groups={[
                    {
                      items: [
                        { label: "Admin" },
                        { label: "Supervisor" },
                        {
                          label: "Agent",
                          onClick: () => {
                            setAppMenuOpen(false);
                            onNavigate?.("agent-shell");
                          },
                        },
                        { label: "Cognigy AI" },
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
                  ]}
                  footer={<CXoneLogo />}
                  header={isCompactHeader ? "Internal Chat" : undefined}
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
              {darkMode ? <Sun className="h-5 w-5" strokeWidth={1.5} /> : <Moon className="h-5 w-5" strokeWidth={1.5} />}
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
              onStatusChange={handleStatusChange}
              timer={formattedTimer}
              className="ml-1"
            />
          </>
        }
      />

      {/* ── Body: LeftNav + Content ── */}
      {/* overflow-hidden ensures docked panels never push layout past the viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden">


        {/* Content area — flex-1 shrinks to give space to docked panels.
            ref used to position float panels. */}
        <div ref={containerRef} className="relative flex flex-1 min-w-0 overflow-hidden px-3 pb-3">

          {/* Main Container — flex row so pinned Panel sits left of PageHeader + content.
              relative so unpinned Panel can overlay the full surface. */}
          <Container className="flex flex-1 overflow-hidden relative">

            {/* Customer Information Panel — one instance whose `pinned` prop
                just flips Panel's own internal inline-vs-overlay branch,
                matching Panel.stories.tsx's "Side Panel" story (a single
                element, props toggle) so the width transition animates
                correctly. Gated on `activeInteraction` — its only trigger
                is the record icon on the interaction PageHeader below, which
                doesn't exist on the Home page. */}
            {activeInteraction && (
              <CustomerInformationPanel
                side="left"
                open={sidePanelOpen}
                pinned={effectivePinned}
                person={{ name: activeInteraction.customerName ?? "Customer", id: activeInteraction.recordId }}
                onPinToggle={isNarrowContainer ? undefined : handleSidePanelPinToggle}
                width={sidePanelWidth}
                onWidthChange={setSidePanelWidth}
                onResizeStateChange={setSidePanelResizing}
                onMouseEnter={onSidePanelHoverStart}
                onMouseLeave={sidePanelResizing ? undefined : onSidePanelHoverEnd}
              />
            )}

            {/* Content column: PageHeader + page body */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {activeInteraction ? (
                // ── Active interaction detail page ──
                // Replaces "Home" the moment an assignment is started/quick-
                // dialed. Reverts automatically once the interaction is dismissed.
                <>
                  <PageHeader
                    icon={
                      <span
                        onMouseEnter={onSidePanelHoverStart}
                        onMouseLeave={sidePanelResizing ? undefined : onSidePanelHoverEnd}
                      >
                        <PanelPinButton
                          pinned={sidePanelPinned}
                          onToggle={handleSidePanelIconToggle}
                          icon={<User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                          pinnedLabel="Toggle Overview"
                          unpinnedLabel="Toggle Overview"
                        />
                      </span>
                    }
                    iconAriaHidden={false}
                    title={activeInteraction.customerName ?? "Customer"}
                    subtitle={activeInteraction.recordId}
                  />
                  {/* One tab per open channel — kept in sync with the same
                      interaction's InteractionNavItem card via
                      currentChannelId/handleChannelSelect. Shown even with
                      just one channel open. */}
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
                // ── Home page: Internal Chat ──
                <InternalChatPage />
              )}
            </div>

          </Container>

          {/* Notifications — float
           * Uses CSS transitions (not keyframe animations) to avoid the GPU compositor
           * fill-mode flash. Transitions interpolate between explicit values with no
           * animation lifecycle; visibility:hidden keeps the element in the render tree
           * so the close transition always completes before the element is hidden. */}
          {notifVariant === "float" && notifMounted && (
            <div
              style={{
                ...getNotifFloatStyle(),
                pointerEvents: "none",
                visibility: notifState === "closed" ? "hidden" : "visible",
                opacity: notifState === "open" ? 1 : 0,
                transform: notifState === "open" ? "translateY(0)" : "translateY(-8px)",
                transition: notifState === "open"
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <div style={{ pointerEvents: "auto" }}>{notifPanel}</div>
            </div>
          )}

          {/* AI Panel — float (same CSS transition pattern as Notifications) */}
          {aiVariant === "float" && aiMounted && (
            <div
              style={{
                ...getAiFloatStyle(),
                pointerEvents: "none",
                visibility: aiState === "closed" ? "hidden" : "visible",
                opacity: aiState === "open" ? 1 : 0,
                transform: aiState === "open" ? "translateY(0)" : "translateY(-8px)",
                transition: aiState === "open"
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <div style={{ pointerEvents: "auto" }}>{aiPanel}</div>
            </div>
          )}

          {/* Chat Panel — float */}
          {chatVariant === "float" && chatMounted && (
            <div
              style={{
                ...getChatFloatStyle(),
                pointerEvents: "none",
                visibility: chatState === "closed" ? "hidden" : "visible",
                opacity: chatState === "open" ? 1 : 0,
                transform: chatState === "open" ? "translateY(0)" : "translateY(-8px)",
                transition: chatState === "open"
                  ? "opacity 150ms ease, transform 150ms ease"
                  : "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <div style={{ pointerEvents: "auto" }}>{chatPanel}</div>
            </div>
          )}

        </div>

        {/* Notifications — docked (sibling of containerRef so flex layout keeps it in-bounds) */}
        {notifVariant === "docked" && (
          <div className="pb-3" style={{
            width: notifState === "open" ? notifWidth : 0,
            marginRight: notifState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: notifIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="h-full animate-in fade-in-0 duration-150"
              style={{
                width: notifWidth,
                display: notifState === "open" ? "block" : "none",
              }}
            >
              {notifPanel}
            </div>
          </div>
        )}

        {/* AI Panel — docked (sibling of containerRef so flex layout keeps it in-bounds) */}
        {aiVariant === "docked" && (
          <div className="pb-3" style={{
            width: aiState === "open" ? aiWidth : 0,
            marginRight: aiState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: aiIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="h-full animate-in fade-in-0 duration-150"
              style={{
                width: aiWidth,
                display: aiState === "open" ? "block" : "none",
              }}
            >
              {aiPanel}
            </div>
          </div>
        )}

        {/* Chat Panel — docked (sibling of containerRef so flex layout keeps it in-bounds) */}
        {chatVariant === "docked" && (
          <div className="pb-3" style={{
            width: chatState === "open" ? chatWidth : 0,
            marginRight: chatState === "open" ? 12 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: chatIsResizing ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div
              className="h-full animate-in fade-in-0 duration-150"
              style={{
                width: chatWidth,
                display: chatState === "open" ? "block" : "none",
              }}
            >
              {chatPanel}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
