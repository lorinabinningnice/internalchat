import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  SearchInput,
  Textarea,
  ActionIconButton,
  StatusBadge,
  Divider,
  Switch,
} from "@nicecxone/lyra-ui";
import {
  Plus,
  SquarePen,
  ChevronDown,
  ChevronUp,
  Bold,
  Underline,
  Italic,
  List,
  Users,
  Check,
  X,
  SlidersHorizontal,
  ArrowLeft,
  Phone,
  Video,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_HEX = [
  "#14b8a6", "#3b82f6", "#8b5cf6", "#f97316",
  "#ec4899", "#6366f1", "#22c55e", "#ef4444", "#0ea5e9", "#a855f7",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return AVATAR_HEX[Math.abs(h) % AVATAR_HEX.length];
}

function initials(name: string): string {
  return name.split(/[\s,]+/).filter(Boolean).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MyStatus = "online" | "offline";
type Status = "online" | "busy" | "offline";
type SidebarView = "list" | "new-dm" | "new-group";

interface SidebarContact {
  id: string;
  name: string;
  status: Status;
  unread?: number;
  isMulti?: boolean;
  multiCount?: number;
}

interface SidebarGroup {
  id: string;
  name: string;
  unread?: number;
  memberCount?: number;
}

interface SidebarDM {
  id: string;
  name: string;
  status: Status;
  unread?: number;
  preview?: string;
  isMulti?: boolean;
  multiCount?: number;
}

interface Message {
  id: string;
  sender: string;
  time: string;
  content: string;
  newGroup?: boolean;
}

interface Conversation {
  id: string;
  name: string;
  type: "group" | "dm";
  memberCount?: number;
  status?: Status;
  messages: Message[];
}

// ── Static data ───────────────────────────────────────────────────────────────

const FAVORITES: SidebarContact[] = [
  { id: "angus",      name: "Angus Lindgren",               status: "online" },
  { id: "leah-group", name: "Leah Young, Mark Johnson, R...", status: "online", isMulti: true, multiCount: 3 },
  { id: "jorge",      name: "Jorge Rodriguez",               status: "online", unread: 1 },
  { id: "thomas",     name: "Thomas Mann",                   status: "online" },
  { id: "beatriz",    name: "Beatriz Montoya",               status: "online" },
  { id: "carlos",     name: "Carlos D'Souza",                status: "online" },
  { id: "gustavo",    name: "Gustavo Pereira",               status: "busy" },
  { id: "hiroshi",    name: "Hiroshi Tanaka",                status: "busy" },
  { id: "isabella",   name: "Isabella Rossi",                status: "online" },
];

const INIT_GROUPS: SidebarGroup[] = [
  { id: "customer-service",  name: "Customer Service",  unread: 1, memberCount: 8 },
  { id: "sandy-design-team", name: "Sandy Design Team", memberCount: 12 },
  { id: "sales",             name: "Sales",             memberCount: 15 },
  { id: "ux-pms",            name: "UX/PMs",            memberCount: 6 },
  { id: "research",          name: "Research",          memberCount: 4 },
];

const INIT_DMS: SidebarDM[] = [
  { id: "natalie", name: "Natalie O'Kon",                 status: "online", unread: 2, preview: "You: message snippet" },
  { id: "leah-dm", name: "Leah Young, Mark Johnson, R...", status: "online", isMulti: true, multiCount: 4 },
  { id: "sophie",  name: "Sophie Cronin",                 status: "online", preview: "You: message snippet" },
  { id: "jana",    name: "Jana Parker",                   status: "busy",   preview: "You: message snippet" },
];

// All individual people available for new DMs / group members
const ALL_PEOPLE: { id: string; name: string; status: Status }[] = [
  { id: "angus",    name: "Angus Lindgren",   status: "online" },
  { id: "jorge",    name: "Jorge Rodriguez",  status: "online" },
  { id: "thomas",   name: "Thomas Mann",      status: "online" },
  { id: "beatriz",  name: "Beatriz Montoya",  status: "online" },
  { id: "carlos",   name: "Carlos D'Souza",   status: "online" },
  { id: "gustavo",  name: "Gustavo Pereira",  status: "busy" },
  { id: "hiroshi",  name: "Hiroshi Tanaka",   status: "busy" },
  { id: "isabella", name: "Isabella Rossi",   status: "online" },
  { id: "natalie",  name: "Natalie O'Kon",    status: "online" },
  { id: "sophie",   name: "Sophie Cronin",    status: "online" },
  { id: "jana",     name: "Jana Parker",      status: "busy" },
];

const INIT_CONVERSATIONS: Record<string, Conversation> = {
  "sandy-design-team": {
    id: "sandy-design-team", name: "Sandy Design Team", type: "group", memberCount: 12,
    messages: [
      { id: "1", sender: "Shaun Murray",  time: "3:32 pm",  content: "Lorem ipsum dolor sit amet consectetur." },
      { id: "2", sender: "Jeff Davis",    time: "3:32 pm",  content: "Lorem ipsum dolor sit amet consectetur. Pretium amet lacus mi nibh. Quisque felis dignissim risus amet aliquet adipiscing. Cras vitae dui augue enim fringilla nec." },
      { id: "3", sender: "Jeff Davis",    time: "3:32 pm",  content: "Lorem ipsum dolor sit amet consectetur. Neque arcu sem nulla quam. Vel sit morbi neque aliquet nulla egestas." },
      { id: "4", sender: "Sara Evans",    time: "10:56 am", content: "Lorem ipsum dolor sit amet consectetur. Mattis nulla feugiat dictumst rutrum nibh." },
      { id: "5", sender: "Norman Nelson", time: "11:04 am", content: "Lorem ipsum dolor sit amet consectetur. Amet tincidunt fringilla dictum nibh pellentesque ipsum neque viverra tincidunt." },
      { id: "6", sender: "Sara Evans",    time: "11:06 am", content: "Lorem ipsum dolor sit amet consectetur amet tincidunt fringilla dictum." },
      { id: "7", sender: "Donna Wilson",  time: "1:24 pm",  content: "Lorem ipsum dolor sit amet consectetur. Turpis non habitasse morbi viverra tortor.", newGroup: true },
      { id: "8", sender: "Harvey Martin", time: "1:24 pm",  content: "Lorem ipsum dolor sit amet consectetur. Ut eleifend pellentesque urna maecenas morbi sagittis mus ut nulla." },
    ],
  },
  "customer-service": { id: "customer-service", name: "Customer Service", type: "group", memberCount: 8,  messages: [] },
  "sales":            { id: "sales",            name: "Sales",            type: "group", memberCount: 15, messages: [] },
  "ux-pms":           { id: "ux-pms",           name: "UX/PMs",           type: "group", memberCount: 6,  messages: [] },
  "research":         { id: "research",         name: "Research",         type: "group", memberCount: 4,  messages: [] },
  "natalie": { id: "natalie",  name: "Natalie O'Kon",                 type: "dm", status: "online", messages: [] },
  "leah-dm": { id: "leah-dm", name: "Leah Young, Mark Johnson, R...", type: "dm", status: "online", messages: [] },
  "sophie":  { id: "sophie",  name: "Sophie Cronin",                 type: "dm", status: "online", messages: [] },
  "jana":    { id: "jana",    name: "Jana Parker",                   type: "dm", status: "busy",   messages: [] },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Status }) {
  if (status === "online")
    return (
      <span className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <Check className="h-2 w-2" strokeWidth={3} />
      </span>
    );
  if (status === "busy")
    return (
      <span className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <X className="h-2 w-2" strokeWidth={3} />
      </span>
    );
  return <span className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full bg-lyra-fg-disabled" />;
}

function MultiCount({ count }: { count: number }) {
  return (
    <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-lyra-fg-secondary/20 text-xs font-bold text-lyra-fg-secondary">
      {count}
    </span>
  );
}

function SidebarSection({
  label, open, onToggle, action, children,
}: {
  label: string; open: boolean; onToggle: () => void; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 py-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-semibold text-lyra-fg-secondary hover:text-lyra-fg-default"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {label}
        </button>
        {action}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

function SidebarRow({
  selected, onClick, left, label, sublabel, right,
}: {
  selected: boolean; onClick: () => void; left: React.ReactNode;
  label: string; sublabel?: string; right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
        selected
          ? "bg-lyra-bg-active-moderate text-lyra-fg-active-strong"
          : "text-lyra-fg-default hover:bg-lyra-state-hover active:bg-lyra-state-pressed",
      ].join(" ")}
    >
      {left}
      <div className="flex-1 min-w-0">
        <div className="truncate">{label}</div>
        {sublabel && <div className="truncate text-xs text-lyra-fg-secondary">{sublabel}</div>}
      </div>
      {right}
    </button>
  );
}

function MessageRow({ message }: { message: Message }) {
  return (
    <>
      {message.newGroup && <Divider className="my-2" />}
      <div className="flex gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: avatarColor(message.sender) }}
        >
          {initials(message.sender)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-lyra-fg-default">{message.sender}</span>
            <span className="text-xs text-lyra-fg-secondary">{message.time}</span>
          </div>
          <p className="text-sm leading-relaxed text-lyra-fg-default">{message.content}</p>
        </div>
      </div>
    </>
  );
}

// ── New DM sidebar panel ──────────────────────────────────────────────────────

function NewDmPanel({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (person: { id: string; name: string; status: Status }) => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = ALL_PEOPLE.filter((p) => p.name.toLowerCase().includes(q));

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-3 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-sm font-semibold text-lyra-fg-default">New Message</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <SearchInput
          placeholder="Search people…"
          value={search}
          onValueChange={setSearch}
          aria-label="Search people"
        />
      </div>

      {/* People list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-lyra-fg-secondary">No people found</p>
        ) : (
          filtered.map((p) => (
            <SidebarRow
              key={p.id}
              selected={false}
              onClick={() => onSelect(p)}
              left={<StatusDot status={p.status} />}
              label={p.name}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── New Group sidebar panel ───────────────────────────────────────────────────

function NewGroupPanel({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (name: string, members: typeof ALL_PEOPLE) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof ALL_PEOPLE>([]);

  const q = search.toLowerCase();
  const filtered = ALL_PEOPLE.filter((p) => p.name.toLowerCase().includes(q));
  const isSelected = (id: string) => selected.some((m) => m.id === id);

  const toggle = (p: typeof ALL_PEOPLE[0]) => {
    setSelected((prev) =>
      isSelected(p.id) ? prev.filter((m) => m.id !== p.id) : [...prev, p]
    );
  };

  const canCreate = groupName.trim().length > 0 && selected.length >= 1;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-3 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-sm font-semibold text-lyra-fg-default">New Group</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {/* Group name */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-lyra-fg-secondary uppercase tracking-wide">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Sprint Team"
            className="w-full rounded-md border border-lyra-border-default bg-lyra-bg-surface-base px-3 py-1.5 text-sm text-lyra-fg-default placeholder:text-lyra-fg-placeholder outline-none focus:border-lyra-border-focus focus:ring-1 focus:ring-lyra-border-focus transition-colors"
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1 rounded-full border border-lyra-border-default px-2 py-0.5 text-xs text-lyra-fg-default"
              >
                {m.name.split(" ")[0]}
                <button onClick={() => toggle(m)} className="flex h-3.5 w-3.5 items-center justify-center">
                  <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Member search */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-lyra-fg-secondary uppercase tracking-wide">
            Add Members
          </label>
          <SearchInput
            placeholder="Search people…"
            value={search}
            onValueChange={setSearch}
            aria-label="Search members"
          />
        </div>

        {/* People list with checkboxes */}
        <div className="-mx-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-lyra-state-hover transition-colors"
            >
              <div
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected(p.id)
                    ? "bg-lyra-bg-active-strong border-lyra-bg-active-strong"
                    : "border-lyra-border-default"
                }`}
              >
                {isSelected(p.id) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />}
              </div>
              <StatusDot status={p.status} />
              <span className="flex-1 min-w-0 truncate text-lyra-fg-default">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Create button */}
      <div className="border-t border-lyra-border-subtle px-3 py-3 flex-shrink-0">
        <button
          disabled={!canCreate}
          onClick={() => onCreate(groupName.trim(), selected)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-lyra-bg-active-strong px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          <Users className="h-4 w-4" strokeWidth={1.5} />
          Create Group
          {selected.length > 0 && <span className="opacity-75">({selected.length})</span>}
        </button>
      </div>
    </div>
  );
}

// ── Preferences sidebar panel ─────────────────────────────────────────────────

function PreferencesPanel({ onBack }: { onBack: () => void }) {
  const [muteNotifications, setMuteNotifications] = useState(true);
  const [showReadyForChat,  setShowReadyForChat]  = useState(true);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-3 py-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="flex-1 text-sm font-semibold text-lyra-fg-default">Preferences</span>
        {/* User avatar */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-lyra-bg-surface-container text-xs font-semibold text-lyra-fg-default">
          L
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col px-3 py-2">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Mute notifications</span>
          <Switch checked={muteNotifications} onCheckedChange={setMuteNotifications} size="sm" />
        </div>
        <Divider />
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Show ready for chat</span>
          <Switch checked={showReadyForChat} onCheckedChange={setShowReadyForChat} size="sm" />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 640;

export function InternalChatPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(9999);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth < MOBILE_BREAKPOINT;

  // ── My status ──────────────────────────────────────────────────────────────
  const [myStatus, setMyStatus] = useState<MyStatus>("online");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (!statusWrapperRef.current?.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropdownOpen]);

  // ── Sidebar view (list / new-dm / new-group) ───────────────────────────────
  const [sidebarView, setSidebarView] = useState<SidebarView>("list");

  // ── Right preferences panel ────────────────────────────────────────────────
  const [showPreferences,  setShowPreferences]  = useState(false);
  const [prefMute,         setPrefMute]         = useState(true);
  const [prefReadyForChat, setPrefReadyForChat] = useState(true);

  // ── Mutable data ───────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<SidebarGroup[]>(INIT_GROUPS);
  const [dms, setDms] = useState<SidebarDM[]>(INIT_DMS);
  const [conversations, setConversations] = useState<Record<string, Conversation>>(INIT_CONVERSATIONS);

  // ── Selection & messages ───────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState("sandy-design-team");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const [favOpen, setFavOpen]         = useState(true);
  const [grpOpen, setGrpOpen]         = useState(true);
  const [dmOpen,  setDmOpen]          = useState(true);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    if (!isMobile) setMobileView("list");
  }, [isMobile]);

  // Resolve any contact id → conversation shape, even if not pre-seeded
  const resolveConversation = (id: string): Conversation | null => {
    if (conversations[id]) return conversations[id];
    // Search FAVORITES
    const fav = FAVORITES.find((f) => f.id === id);
    if (fav) {
      return {
        id,
        name: fav.name,
        type: fav.isMulti ? "group" : "dm",
        status: fav.isMulti ? undefined : (fav.status as Status),
        memberCount: fav.isMulti ? (fav.multiCount ?? undefined) : undefined,
        messages: [],
      };
    }
    // Search groups state
    const grp = groups.find((g) => g.id === id);
    if (grp) return { id, name: grp.name, type: "group", memberCount: grp.memberCount, messages: [] };
    // Search dms state
    const dm = dms.find((d) => d.id === id);
    if (dm) {
      return {
        id,
        name: dm.name,
        type: dm.isMulti ? "group" : "dm",
        status: dm.isMulti ? undefined : (dm.status as Status),
        memberCount: dm.isMulti ? (dm.multiCount ?? undefined) : undefined,
        messages: [],
      };
    }
    return null;
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSidebarView("list");
    if (isMobile) setMobileView("chat");
    // Auto-create conversation entry if it doesn't exist yet (e.g. Favorites contacts)
    if (!conversations[id]) {
      const resolved = resolveConversation(id);
      if (resolved) {
        setConversations((prev) => ({ ...prev, [id]: resolved }));
      }
    }
  };

  const handleBack = () => setMobileView("list");

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: `local-${Date.now()}`,
      sender: "You",
      time: nowTime(),
      content: trimmed,
    };
    setLocalMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), msg],
    }));
    setMessageText("");
  };

  // ── New DM ─────────────────────────────────────────────────────────────────
  const handleNewDmSelect = (person: { id: string; name: string; status: Status }) => {
    // Add to DMs list if not already there
    if (!dms.find((d) => d.id === person.id)) {
      setDms((prev) => [{ id: person.id, name: person.name, status: person.status }, ...prev]);
    }
    // Create conversation if it doesn't exist
    if (!conversations[person.id]) {
      setConversations((prev) => ({
        ...prev,
        [person.id]: { id: person.id, name: person.name, type: "dm", status: person.status, messages: [] },
      }));
    }
    handleSelect(person.id);
  };

  // ── New Group ──────────────────────────────────────────────────────────────
  const handleCreateGroup = (name: string, members: typeof ALL_PEOPLE) => {
    const id = `group-${Date.now()}`;
    const newGroup: SidebarGroup = { id, name, memberCount: members.length };
    setGroups((prev) => [...prev, newGroup]);
    setConversations((prev) => ({
      ...prev,
      [id]: { id, name, type: "group", memberCount: members.length, messages: [] },
    }));
    handleSelect(id);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const baseConversation = conversations[selectedId];
  const allMessages = [
    ...(baseConversation?.messages ?? []),
    ...(localMessages[selectedId] ?? []),
  ];

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarList = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Status + compose */}
      <div className="flex items-center justify-between border-b border-lyra-border-subtle px-2 py-2 flex-shrink-0">
        {/* Status dropdown */}
        <div ref={statusWrapperRef} className="flex flex-col">
          <button
            onClick={() => setStatusDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-lyra-fg-default hover:bg-lyra-state-hover transition-colors"
          >
            {myStatus === "online" ? (
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
            ) : (
              <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-lyra-fg-disabled" />
            )}
            <span className="font-medium capitalize">{myStatus}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-lyra-fg-secondary transition-transform duration-150 ${statusDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {statusDropdownOpen && (
            <div className="mt-0.5 rounded-md border border-lyra-border-default bg-lyra-bg-surface-base shadow-lyra-md overflow-hidden z-50">
              {(["online", "offline"] as MyStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setMyStatus(s); setStatusDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-default hover:bg-lyra-state-hover transition-colors"
                >
                  <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${s === "online" ? "bg-green-500" : "bg-lyra-fg-disabled"}`} />
                  <span className="flex-1 text-left capitalize">{s}</span>
                  {myStatus === s && <Check className="h-3.5 w-3.5 text-lyra-fg-active-strong flex-shrink-0" strokeWidth={2} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compose */}
        <ActionIconButton size="sm" aria-label="New message" onClick={() => setSidebarView("new-dm")}>
          <SquarePen className="h-4 w-4" />
        </ActionIconButton>
      </div>

      {/* Search (mobile only) */}
      {isMobile && (
        <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-3 py-2 flex-shrink-0">
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search"
            aria-label="Search conversations"
          />
        </div>
      )}

      {/* Contact lists */}
      <div className="flex-1 overflow-y-auto">
        <SidebarSection label="Favorites" open={favOpen} onToggle={() => setFavOpen((v) => !v)}>
          {FAVORITES.map((c) => (
            <SidebarRow
              key={c.id}
              selected={!isMobile && selectedId === c.id}
              onClick={() => handleSelect(c.id)}
              left={c.isMulti ? <MultiCount count={c.multiCount!} /> : <StatusDot status={c.status} />}
              label={c.name}
              right={c.unread ? <StatusBadge variant="default" size="sm" count={c.unread} /> : undefined}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          label="Groups"
          open={grpOpen}
          onToggle={() => setGrpOpen((v) => !v)}
          action={
            <ActionIconButton size="sm" aria-label="Add group" onClick={() => setSidebarView("new-group")}>
              <Plus className="h-3.5 w-3.5" />
            </ActionIconButton>
          }
        >
          {groups.map((g) => (
            <SidebarRow
              key={g.id}
              selected={!isMobile && selectedId === g.id}
              onClick={() => handleSelect(g.id)}
              left={<Users className="h-3.5 w-3.5 flex-shrink-0 text-lyra-fg-secondary" />}
              label={g.name}
              right={g.unread ? <StatusBadge variant="default" size="sm" count={g.unread} /> : undefined}
            />
          ))}
        </SidebarSection>

        <SidebarSection label="Direct Messages" open={dmOpen} onToggle={() => setDmOpen((v) => !v)}>
          {dms.map((dm) => (
            <SidebarRow
              key={dm.id}
              selected={!isMobile && selectedId === dm.id}
              onClick={() => handleSelect(dm.id)}
              left={dm.isMulti ? <MultiCount count={dm.multiCount!} /> : <StatusDot status={dm.status} />}
              label={dm.name}
              sublabel={dm.preview}
              right={dm.unread ? <StatusBadge variant="default" size="sm" count={dm.unread} /> : undefined}
            />
          ))}
        </SidebarSection>
      </div>
    </div>
  );

  const sidebar = (
    <aside
      className={[
        "flex flex-col overflow-hidden border-r border-lyra-border-subtle bg-lyra-bg-surface-shell",
        isMobile ? "flex-1" : "w-56 flex-shrink-0",
      ].join(" ")}
    >
      {sidebarView === "list"      && sidebarList}
      {sidebarView === "new-dm"    && <NewDmPanel onBack={() => setSidebarView("list")} onSelect={handleNewDmSelect} />}
      {sidebarView === "new-group" && <NewGroupPanel onBack={() => setSidebarView("list")} onCreate={handleCreateGroup} />}
    </aside>
  );

  // ── Chat panel ─────────────────────────────────────────────────────────────
  const isDm = baseConversation?.type === "dm";

  const chatPanel = (
    <div className="flex flex-1 flex-col min-w-0 bg-lyra-bg-surface-base">

      {/* Mobile: back nav header */}
      {isMobile ? (
        <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-2 py-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {baseConversation && (
            <span className="text-sm font-semibold text-lyra-fg-default truncate">
              {baseConversation.name}
            </span>
          )}
          {baseConversation?.memberCount && (
            <span className="ml-auto text-xs text-lyra-fg-secondary flex-shrink-0">
              {baseConversation.memberCount} Members
            </span>
          )}
        </div>
      ) : (
        /* Desktop: search bar */
        <div className="flex items-center gap-2 border-b border-lyra-border-subtle px-4 py-2">
          <SearchInput
            className="flex-1"
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search for people, groups, or keywords"
            aria-label="Search conversations"
          />
          <ActionIconButton
            size="sm"
            aria-label="Preferences"
            onClick={() => setShowPreferences((v) => !v)}
          >
            <SlidersHorizontal className={`h-4 w-4 ${showPreferences ? "text-lyra-fg-active-strong" : ""}`} />
          </ActionIconButton>
        </div>
      )}

      {/* Desktop: conversation header */}
      {!isMobile && baseConversation && (
        <div className="flex items-center gap-3 border-b border-lyra-border-subtle px-4 py-2.5">
          {isDm ? (
            /* DM header — avatar + name + status */
            <>
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: avatarColor(baseConversation.name) }}
                >
                  {initials(baseConversation.name)}
                </div>
                {baseConversation.status === "online" && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 ring-2 ring-lyra-bg-surface-base">
                    <Check className="h-1.5 w-1.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-lyra-fg-default truncate leading-5">
                  {baseConversation.name}
                </p>
                <p className="text-xs text-lyra-fg-secondary leading-4">
                  {baseConversation.status === "online" ? "Active now" : baseConversation.status === "busy" ? "Busy" : "Offline"}
                </p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <ActionIconButton size="sm" aria-label="Voice call">
                  <Phone className="h-4 w-4" strokeWidth={1.5} />
                </ActionIconButton>
                <ActionIconButton size="sm" aria-label="Video call">
                  <Video className="h-4 w-4" strokeWidth={1.5} />
                </ActionIconButton>
              </div>
            </>
          ) : (
            /* Group header — icon + name + member count */
            <>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyra-bg-surface-container">
                <Users className="h-4 w-4 text-lyra-fg-secondary" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-lyra-fg-default truncate leading-5">
                  {baseConversation.name}
                </p>
                {baseConversation.memberCount && (
                  <p className="text-xs text-lyra-fg-secondary leading-4">
                    {baseConversation.memberCount} members
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {allMessages.length > 0 ? (
            allMessages.map((msg) => <MessageRow key={msg.id} message={msg} />)
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-lyra-fg-secondary">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-lyra-border-subtle p-4 flex flex-col gap-2">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Message ${baseConversation?.name ?? ""}…`}
          rows={isMobile ? 2 : 3}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <Button variant="icon" size="icon" aria-label="Bold"><Bold className="h-4 w-4" /></Button>
            <Button variant="icon" size="icon" aria-label="Underline"><Underline className="h-4 w-4" /></Button>
            <Button variant="icon" size="icon" aria-label="Italic"><Italic className="h-4 w-4" /></Button>
            <Button variant="icon" size="icon" aria-label="List"><List className="h-4 w-4" /></Button>
          </div>
          <Button onClick={handleSend} disabled={!messageText.trim()}>Send</Button>
        </div>
      </div>
    </div>
  );

  // ── Right preferences panel ────────────────────────────────────────────────
  const preferencesPanel = (
    <aside className="flex w-60 flex-shrink-0 flex-col border-l border-lyra-border-subtle bg-lyra-bg-surface-shell overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-lyra-border-subtle px-4 py-3 flex-shrink-0">
        <span className="text-sm font-semibold text-lyra-fg-default">Preferences</span>
        <ActionIconButton
          size="sm"
          aria-label="Close preferences"
          onClick={() => setShowPreferences(false)}
        >
          <SlidersHorizontal className="h-4 w-4 text-lyra-fg-active-strong" />
        </ActionIconButton>
      </div>

      {/* Toggles */}
      <div className="flex flex-col px-4 py-2">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Mute notifications</span>
          <Switch checked={prefMute} onCheckedChange={setPrefMute} size="sm" />
        </div>
        <Divider />
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Show ready for chat</span>
          <Switch checked={prefReadyForChat} onCheckedChange={setPrefReadyForChat} size="sm" />
        </div>
      </div>
    </aside>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {isMobile ? (
        mobileView === "list" ? sidebar : chatPanel
      ) : (
        <>
          {sidebar}
          {chatPanel}
          {showPreferences && preferencesPanel}
        </>
      )}
    </div>
  );
}
