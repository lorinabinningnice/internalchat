import React, { useState, useRef, useEffect } from "react";
import { SearchInput, Divider, StatusBadge, DraggablePanel, Switch } from "@nicecxone/lyra-ui";
import type { DraggableVariant } from "@nicecxone/lyra-ui";
import {
  ChevronUp,
  ChevronDown,
  Users,
  SquarePen,
  Check,
  X,
  SlidersHorizontal,
  Plus,
  ArrowLeft,
  Send,
  Phone,
  Video,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactStatus = "online" | "offline";
type View = "list" | "chat" | "new-dm" | "new-group" | "preferences";

interface ChatContact {
  id: string;
  name: string;
  status?: ContactStatus;
  isGroup?: boolean;
  memberCount?: number;
  preview?: string;
  unread?: number;
}

interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INIT_FAVORITES: ChatContact[] = [
  { id: "f1", name: "Angus Lindgren",                  status: "online" },
  { id: "f2", name: "Leah Young, Mark Johnson, R...",  isGroup: true, memberCount: 3 },
  { id: "f3", name: "Jorge Rodriguez",                 status: "online", unread: 1 },
  { id: "f4", name: "Thomas Mann",                     status: "offline" },
  { id: "f5", name: "Beatriz Montoya",                 status: "online" },
  { id: "f6", name: "Carlos D'Souza",                  status: "online" },
  { id: "f7", name: "Gustavo Pereira",                 status: "offline" },
  { id: "f8", name: "Hiroshi Tanaka",                  status: "offline" },
  { id: "f9", name: "Isabella Rossi",                  status: "online" },
];

const INIT_GROUPS: ChatContact[] = [
  { id: "g1", name: "Customer Service",  isGroup: true, unread: 1 },
  { id: "g2", name: "Sandy Design Team", isGroup: true },
  { id: "g3", name: "Sales",             isGroup: true },
  { id: "g4", name: "UX/PMs",            isGroup: true },
  { id: "g5", name: "Research",          isGroup: true },
];

const INIT_DIRECT_MESSAGES: ChatContact[] = [
  { id: "d1", name: "Natalie O'Kon",                  status: "online", preview: "You: message snippet", unread: 2 },
  { id: "d2", name: "Leah Young, Mark Johnson, R...", isGroup: true, memberCount: 4 },
  { id: "d3", name: "Sophie Cronin",                  status: "online" },
];

// All individual contacts for new-DM search
const ALL_PEOPLE: ChatContact[] = [
  { id: "f1", name: "Angus Lindgren",   status: "online" },
  { id: "f3", name: "Jorge Rodriguez",  status: "online" },
  { id: "f4", name: "Thomas Mann",      status: "offline" },
  { id: "f5", name: "Beatriz Montoya",  status: "online" },
  { id: "f6", name: "Carlos D'Souza",   status: "online" },
  { id: "f7", name: "Gustavo Pereira",  status: "offline" },
  { id: "f8", name: "Hiroshi Tanaka",   status: "offline" },
  { id: "f9", name: "Isabella Rossi",   status: "online" },
  { id: "d1", name: "Natalie O'Kon",    status: "online" },
  { id: "d3", name: "Sophie Cronin",    status: "online" },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  f3: [
    { id: "1", from: "them", text: "Hey, did you see the latest ticket update?", time: "10:14 AM" },
    { id: "2", from: "me",   text: "Just checking it now — looks good!", time: "10:15 AM" },
    { id: "3", from: "them", text: "Great. Can you approve it when you get a chance?", time: "10:16 AM" },
  ],
  d1: [
    { id: "1", from: "them", text: "Quick heads up — the report is ready.", time: "9:42 AM" },
    { id: "2", from: "me",   text: "Thanks, I'll review it before the standup.", time: "9:43 AM" },
    { id: "3", from: "them", text: "Perfect. Let me know if you have questions.", time: "9:43 AM" },
    { id: "4", from: "me",   text: "Will do!", time: "9:44 AM" },
  ],
  g1: [
    { id: "1", from: "them", text: "Team — we have a priority escalation coming in.", time: "11:00 AM" },
    { id: "2", from: "me",   text: "On it. Assigning to queue now.", time: "11:01 AM" },
    { id: "3", from: "them", text: "Thanks everyone, great response time!", time: "11:05 AM" },
  ],
};

function getSeedMessages(contactId: string): ChatMessage[] {
  return SEED_MESSAGES[contactId] ?? [
    { id: "1", from: "them", text: "Hey there! 👋", time: "Just now" },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({
  status,
  isGroup,
  memberCount,
}: {
  status?: ContactStatus;
  isGroup?: boolean;
  memberCount?: number;
}) {
  if (isGroup && memberCount !== undefined) {
    return (
      <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-lyra-bg-surface-container text-[10px] font-semibold text-lyra-fg-secondary">
        {memberCount}
      </div>
    );
  }
  if (status === "online") {
    return (
      <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[#1a8a3c]">
        <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-2 border-lyra-border-default bg-transparent">
      <X className="h-2.5 w-2.5 text-lyra-fg-disabled" strokeWidth={2.5} />
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  label,
  children,
  action,
  defaultExpanded = true,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-lyra-state-hover rounded-lyra-md transition-colors"
      >
        {open
          ? <ChevronUp   className="h-4 w-4 text-lyra-fg-secondary flex-shrink-0" strokeWidth={1.5} />
          : <ChevronDown className="h-4 w-4 text-lyra-fg-secondary flex-shrink-0" strokeWidth={1.5} />}
        <span className="flex-1 text-sm font-semibold text-lyra-fg-default">{label}</span>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
      </button>

      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

// ── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onClick,
  trailing,
}: {
  contact: ChatContact;
  onClick: (c: ChatContact) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(contact)}
      className="flex w-full items-center gap-3 px-4 py-2 hover:bg-lyra-state-hover active:bg-lyra-state-pressed rounded-lyra-md transition-colors text-left"
    >
      <div className="flex-shrink-0 flex items-center justify-center">
        {contact.isGroup && contact.memberCount === undefined ? (
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-lyra-bg-surface-container">
            <Users className="h-3 w-3 text-lyra-fg-secondary" strokeWidth={1.5} />
          </div>
        ) : (
          <StatusDot status={contact.status} isGroup={contact.isGroup} memberCount={contact.memberCount} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-5 truncate ${contact.unread ? "font-semibold text-lyra-fg-default" : "font-normal text-lyra-fg-default"}`}>
          {contact.name}
        </p>
        {contact.preview && (
          <p className="text-xs leading-4 truncate text-lyra-fg-secondary">{contact.preview}</p>
        )}
      </div>

      {trailing}

      {contact.unread !== undefined && contact.unread > 0 && !trailing && (
        <div className="flex-shrink-0">
          <StatusBadge count={contact.unread} />
        </div>
      )}
    </button>
  );
}

// ── Chat view ─────────────────────────────────────────────────────────────────

function ChatView({
  contact,
  onBack,
}: {
  contact: ChatContact;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getSeedMessages(contact.id));
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), from: "me", text, time: now() },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isGroup = !!contact.isGroup;

  return (
    <div className="flex flex-col h-full">

      {/* ── Chat header ── */}
      <div className="flex items-center gap-2 px-2 py-2 flex-shrink-0">
        <button
          type="button"
          aria-label="Back to contacts"
          onClick={onBack}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lyra-md text-lyra-fg-default hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Avatar */}
        {isGroup ? (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lyra-bg-surface-container">
            <Users className="h-[18px] w-[18px] text-lyra-fg-secondary" strokeWidth={1.5} />
          </div>
        ) : (
          <div className="relative flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lyra-bg-active-strong text-sm font-semibold text-white">
              {getInitials(contact.name)[0] ?? "?"}
            </div>
            {contact.status === "online" && (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#1a8a3c] ring-2 ring-lyra-bg-surface-base">
                <Check className="h-1.5 w-1.5 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        )}

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-lyra-fg-default truncate leading-5">{contact.name}</p>
          <p className="text-xs text-lyra-fg-secondary leading-4">
            {isGroup
              ? `${contact.memberCount ?? "Group"} members`
              : contact.status === "online" ? "Active now" : "Offline"}
          </p>
        </div>

        {/* Actions — phone + video for DMs only */}
        {!isGroup && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              aria-label="Voice call"
              className="flex h-8 w-8 items-center justify-center rounded-lyra-md text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
            >
              <Phone className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Video call"
              className="flex h-8 w-8 items-center justify-center rounded-lyra-md text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
            >
              <Video className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 flex flex-col gap-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-0.5 ${msg.from === "me" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                msg.from === "me"
                  ? "bg-lyra-bg-active-strong text-white rounded-br-sm"
                  : "bg-lyra-bg-surface-container text-lyra-fg-default rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-lyra-fg-secondary px-1">{msg.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <Divider />

      {/* ── Input ── */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="flex-1 min-w-0 rounded-lyra-lg border border-lyra-border-default bg-lyra-bg-surface-base px-3 py-2 text-sm text-lyra-fg-default placeholder:text-lyra-fg-placeholder outline-none focus:border-lyra-border-focus focus:ring-1 focus:ring-lyra-border-focus transition-colors"
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={sendMessage}
          disabled={!draft.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lyra-lg bg-lyra-bg-active-strong text-white transition-opacity disabled:opacity-40 hover:opacity-90 active:opacity-80"
        >
          <Send className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

    </div>
  );
}

// ── New DM view ───────────────────────────────────────────────────────────────

function NewDmView({
  onBack,
  onSelectContact,
}: {
  onBack: () => void;
  onSelectContact: (c: ChatContact) => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = ALL_PEOPLE.filter((c) => c.name.toLowerCase().includes(q));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 flex-shrink-0">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lyra-md text-lyra-fg-default hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-sm font-semibold text-lyra-fg-default">New Message</span>
      </div>

      <Divider />

      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <SearchInput
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-1 py-1">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-lyra-fg-secondary">No people found</p>
        ) : (
          filtered.map((c) => (
            <ContactRow key={c.id} contact={c} onClick={onSelectContact} />
          ))
        )}
      </div>
    </div>
  );
}

// ── New Group view ────────────────────────────────────────────────────────────

function NewGroupView({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (name: string, members: ChatContact[]) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<ChatContact[]>([]);

  const q = memberSearch.toLowerCase();
  const filtered = ALL_PEOPLE.filter((c) => c.name.toLowerCase().includes(q));

  const isMemberSelected = (id: string) => selectedMembers.some((m) => m.id === id);

  const toggleMember = (c: ChatContact) => {
    setSelectedMembers((prev) =>
      isMemberSelected(c.id) ? prev.filter((m) => m.id !== c.id) : [...prev, c]
    );
  };

  const canCreate = groupName.trim().length > 0 && selectedMembers.length >= 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 flex-shrink-0">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lyra-md text-lyra-fg-default hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-sm font-semibold text-lyra-fg-default">New Group</span>
      </div>

      <Divider />

      {/* Form */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Group name */}
        <div className="px-3 pt-3 pb-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-lyra-fg-secondary">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Design Sprint Team"
            className="w-full rounded-lyra-lg border border-lyra-border-default bg-lyra-bg-surface-base px-3 py-2 text-sm text-lyra-fg-default placeholder:text-lyra-fg-placeholder outline-none focus:border-lyra-border-focus focus:ring-1 focus:ring-lyra-border-focus transition-colors"
          />
        </div>

        {/* Selected member chips */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {selectedMembers.map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-1 rounded-full bg-lyra-bg-active-strong/10 border border-lyra-border-default px-2 py-0.5 text-xs text-lyra-fg-default"
              >
                {m.name.split(" ")[0]}
                <button
                  type="button"
                  onClick={() => toggleMember(m)}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-lyra-fg-secondary hover:text-lyra-fg-default"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Member search */}
        <div className="px-3 pb-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-lyra-fg-secondary">
            Add Members
          </label>
          <SearchInput
            placeholder="Search people…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
        </div>

        {/* People list with checkboxes */}
        <div className="px-1 pb-2">
          {filtered.map((c) => {
            const selected = isMemberSelected(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleMember(c)}
                className="flex w-full items-center gap-3 px-4 py-2 hover:bg-lyra-state-hover active:bg-lyra-state-pressed rounded-lyra-md transition-colors text-left"
              >
                {/* Checkbox */}
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "bg-lyra-bg-active-strong border-lyra-bg-active-strong"
                      : "border-lyra-border-default bg-transparent"
                  }`}
                >
                  {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />}
                </div>
                <StatusDot status={c.status} />
                <span className="flex-1 min-w-0 text-sm text-lyra-fg-default truncate">{c.name}</span>
                <span className={`text-xs ${c.status === "online" ? "text-[#1a8a3c]" : "text-lyra-fg-disabled"}`}>
                  {c.status === "online" ? "Online" : "Offline"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Create button */}
      <div className="px-3 py-3 flex-shrink-0">
        <button
          type="button"
          disabled={!canCreate}
          onClick={() => onCreate(groupName.trim(), selectedMembers)}
          className="flex w-full items-center justify-center gap-2 rounded-lyra-lg bg-lyra-bg-active-strong px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 hover:opacity-90 active:opacity-80"
        >
          <Users className="h-4 w-4" strokeWidth={1.5} />
          Create Group
          {selectedMembers.length > 0 && (
            <span className="opacity-80">({selectedMembers.length} {selectedMembers.length === 1 ? "member" : "members"})</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Preferences view ──────────────────────────────────────────────────────────

function PreferencesView({ onBack }: { onBack: () => void }) {
  const [muteNotifications, setMuteNotifications] = useState(true);
  const [showReadyForChat,  setShowReadyForChat]  = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 flex-shrink-0">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lyra-md text-lyra-fg-default hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="flex-1 text-sm font-semibold text-lyra-fg-default">Preferences</span>
      </div>

      <Divider />

      {/* Toggles */}
      <div className="flex flex-col gap-1 px-4 py-4">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Mute notifications</span>
          <Switch
            checked={muteNotifications}
            onCheckedChange={setMuteNotifications}
            size="sm"
          />
        </div>
        <Divider />
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-lyra-fg-default">Show ready for chat</span>
          <Switch
            checked={showReadyForChat}
            onCheckedChange={setShowReadyForChat}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

// ── InternalChatDrawer ────────────────────────────────────────────────────────

export interface InternalChatDrawerProps {
  draggableVariant?: DraggableVariant;
  onVariantChange?: (variant: DraggableVariant) => void;
  onWidthChange?: (width: number) => void;
  onResizeStateChange?: (isResizing: boolean) => void;
  onInteract?: () => void;
  onClose?: () => void;
  defaultDraggableWidth?: number;
  height?: number;
  className?: string;
}

export const InternalChatDrawer = React.forwardRef<HTMLDivElement, InternalChatDrawerProps>(
  function InternalChatDrawer(
    {
      draggableVariant,
      onVariantChange,
      onWidthChange,
      onResizeStateChange,
      onInteract,
      onClose,
      defaultDraggableWidth = 360,
      height,
      className,
    },
    ref
  ) {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<View>("list");
    const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);

    // Mutable contact lists so new groups can be added
    const [groupContacts, setGroupContacts] = useState<ChatContact[]>(INIT_GROUPS);

    // My status + dropdown
    const [myStatus, setMyStatus] = useState<ContactStatus>("online");
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusWrapperRef = useRef<HTMLDivElement>(null);

    // Close status dropdown on outside click
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

    // ── Navigation ─────────────────────────────────────────────────────────────

    const handleSelectContact = (contact: ChatContact) => {
      setSelectedContact(contact);
      // One-frame delay so the chat panel is painted off-screen before transition fires
      setTimeout(() => setView("chat"), 16);
    };

    const handleBack = () => {
      const prev = view;
      setView("list");
      if (prev === "chat") {
        setTimeout(() => setSelectedContact(null), 360);
      }
    };

    const handleOpenNewDm = () => {
      setSelectedContact(null);
      setView("new-dm");
    };

    const handleOpenNewGroup = () => {
      setView("new-group");
    };

    const handleCreateGroup = (name: string, members: ChatContact[]) => {
      const newGroup: ChatContact = {
        id: `g-${Date.now()}`,
        name,
        isGroup: true,
        memberCount: members.length,
      };
      setGroupContacts((prev) => [...prev, newGroup]);
      setView("list");
    };

    // ── Search filter ──────────────────────────────────────────────────────────

    const q = search.toLowerCase();
    const filterContacts = (list: ChatContact[]) =>
      q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;

    const inRight = view !== "list";

    return (
      <DraggablePanel
        ref={ref}
        title="Internal Chat"
        draggableVariant={draggableVariant}
        onVariantChange={onVariantChange}
        onWidthChange={onWidthChange}
        onResizeStateChange={onResizeStateChange}
        onInteract={onInteract}
        onClose={onClose}
        defaultWidth={defaultDraggableWidth}
        height={height}
        className={className}
      >
        {/* Negate DraggablePanel's p-4 and enable the slide transition */}
        <div className="-m-4 flex flex-col flex-1 overflow-hidden relative">

          {/* ── List panel — slides left when a right-panel view is active ── */}
          <div
            className="absolute inset-0 flex flex-col transition-transform duration-[360ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ transform: inRight ? "translateX(-100%)" : "translateX(0)", willChange: "transform" }}
          >
            {/* Search + filter */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
              <div className="flex-1">
                <SearchInput
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                aria-label="Preferences"
                onClick={() => setView("preferences")}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lyra-md text-lyra-fg-secondary hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <Divider />

            {/* Status + compose */}
            <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">

              {/* Status dropdown wrapper — inline so it doesn't get clipped */}
              <div ref={statusWrapperRef} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lyra-lg border border-lyra-border-default px-3 py-1.5 text-sm text-lyra-fg-default hover:bg-lyra-state-hover transition-colors"
                >
                  {myStatus === "online" ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1a8a3c]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-lyra-border-default bg-transparent">
                      <X className="h-2 w-2 text-lyra-fg-disabled" strokeWidth={2.5} />
                    </div>
                  )}
                  <span className="font-medium">{myStatus === "online" ? "Online" : "Offline"}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-lyra-fg-secondary transition-transform duration-150 ${statusDropdownOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.5}
                  />
                </button>

                {/* Inline dropdown — renders in-flow so overflow-hidden doesn't clip it */}
                {statusDropdownOpen && (
                  <div className="mt-1 rounded-lyra-lg border border-lyra-border-default bg-lyra-bg-surface-base shadow-lyra-md overflow-hidden z-50">
                    {(["online", "offline"] as ContactStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setMyStatus(s); setStatusDropdownOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lyra-fg-default hover:bg-lyra-state-hover transition-colors"
                      >
                        {s === "online" ? (
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#1a8a3c]">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 border-lyra-border-default bg-transparent">
                            <X className="h-2 w-2 text-lyra-fg-disabled" strokeWidth={2.5} />
                          </div>
                        )}
                        <span className="flex-1 text-left capitalize">{s}</span>
                        {myStatus === s && (
                          <Check className="h-3.5 w-3.5 text-lyra-fg-active-strong flex-shrink-0" strokeWidth={2} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Compose new DM */}
              <button
                type="button"
                aria-label="New message"
                onClick={handleOpenNewDm}
                className="flex h-9 w-9 items-center justify-center rounded-lyra-md text-lyra-fg-secondary hover:bg-lyra-state-hover active:bg-lyra-state-pressed transition-colors"
              >
                <SquarePen className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <Divider />

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-1 py-1">
              <Section label="Favorites">
                {filterContacts(INIT_FAVORITES).map((c) => (
                  <ContactRow key={c.id} contact={c} onClick={handleSelectContact} />
                ))}
              </Section>

              <Divider className="my-1" />

              <Section
                label="Groups"
                action={
                  <button
                    type="button"
                    aria-label="New group"
                    onClick={handleOpenNewGroup}
                    className="flex h-6 w-6 items-center justify-center rounded-lyra-sm text-lyra-fg-secondary hover:bg-lyra-state-hover transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                }
              >
                {filterContacts(groupContacts).map((c) => (
                  <ContactRow key={c.id} contact={c} onClick={handleSelectContact} />
                ))}
              </Section>

              <Divider className="my-1" />

              <Section label="Direct Messages">
                {filterContacts(INIT_DIRECT_MESSAGES).map((c) => (
                  <ContactRow key={c.id} contact={c} onClick={handleSelectContact} />
                ))}
              </Section>
            </div>
          </div>

          {/* ── Right panel (chat / new-dm / new-group) — always in DOM ── */}
          <div
            className="absolute inset-0 flex flex-col transition-transform duration-[360ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ transform: inRight ? "translateX(0)" : "translateX(100%)", willChange: "transform" }}
          >
            {view === "chat" && selectedContact && (
              <ChatView contact={selectedContact} onBack={handleBack} />
            )}
            {view === "new-dm" && (
              <NewDmView onBack={handleBack} onSelectContact={handleSelectContact} />
            )}
            {view === "new-group" && (
              <NewGroupView onBack={handleBack} onCreate={handleCreateGroup} />
            )}
            {view === "preferences" && (
              <PreferencesView onBack={handleBack} />
            )}
          </div>

        </div>
      </DraggablePanel>
    );
  }
);
