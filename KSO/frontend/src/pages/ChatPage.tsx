import clsx from "clsx";
import {
  ArrowLeft,
  MessageCircle,
  MoreVertical,
  Paperclip,
  PlusCircle,
  Search,
  Send,
  Smile,
  Trash2,
  Video
} from "lucide-react";
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chatApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { createChatSocket } from "../lib/socket";
import { ChatEmoji, DiscussionGroup, DiscussionMessage } from "../types/models";

const supervisorRoles = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "COLLEGE_ADMIN",
  "HIGH_SCHOOL_ADMIN",
  "UNIVERSITY_ADMIN",
  "TEACHER"
] as const;

const studentRoles = ["STUDENT", "UNIVERSITY_STUDENT"] as const;

const levelOptions = [
  "SECONDE",
  "PREMIERE",
  "TERMINALE",
  "LOWER_SIXTH",
  "UPPER_SIXTH",
  "LICENCE_1",
  "LICENCE_2",
  "LICENCE_3",
  "MASTER_1",
  "MASTER_2",
  "AUTRE"
] as const;

const streamOptions = ["SCIENTIFIQUE", "LITTERAIRE", "ECONOMIQUE", "TECHNIQUE", "AUTRE"] as const;

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type SocketAck<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function currentAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

function sortGroups(groups: DiscussionGroup[]) {
  return [...groups].sort((a, b) => {
    const aDate = a.messages[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
    const bDate = b.messages[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
    return bDate - aDate;
  });
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function avatarFromName(value: string) {
  return value
    .split(" ")
    .map((chunk) => chunk[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function streamBadgeClass(stream: string) {
  if (stream === "SCIENTIFIQUE") {
    return "bg-cyan-100 text-cyan-800";
  }

  if (stream === "LITTERAIRE") {
    return "bg-pink-100 text-pink-800";
  }

  if (stream === "ECONOMIQUE") {
    return "bg-amber-100 text-amber-800";
  }

  if (stream === "TECHNIQUE") {
    return "bg-indigo-100 text-indigo-800";
  }

  return "bg-slate-100 text-slate-700";
}

function connectionHint(status: ConnectionStatus) {
  if (status === "connected") {
    return {
      label: "En ligne",
      className: "bg-emerald-100 text-emerald-800"
    };
  }

  if (status === "connecting") {
    return {
      label: "Connexion...",
      className: "bg-amber-100 text-amber-800"
    };
  }

  return {
    label: "Mode API",
    className: "bg-rose-100 text-rose-800"
  };
}

function parseAttachment(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const url = lines[lines.length - 1];
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }

  const name = lines.slice(0, -1).join(" ").replace(/^📎\s*/u, "").trim() || "Piece jointe";
  return { name, url };
}

export function ChatPage() {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);
  const selectedGroupIdRef = useRef("");
  const joinedGroupIdRef = useRef("");
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const previousConnectionRef = useRef<ConnectionStatus>("connecting");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [groups, setGroups] = useState<DiscussionGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingEmojis, setLoadingEmojis] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiCatalog, setEmojiCatalog] = useState<ChatEmoji[]>([]);
  const [groupPage, setGroupPage] = useState(1);

  const [groupForm, setGroupForm] = useState({
    profileType: "ELEVE" as "ELEVE" | "ETUDIANT",
    level: "SECONDE" as (typeof levelOptions)[number],
    stream: "SCIENTIFIQUE" as (typeof streamOptions)[number],
    academicYear: currentAcademicYear(),
    name: ""
  });

  const canCreateGroup = useMemo(
    () => supervisorRoles.includes((user?.role || "") as (typeof supervisorRoles)[number]),
    [user?.role]
  );

  const isLearner = useMemo(
    () => studentRoles.includes((user?.role || "") as (typeof studentRoles)[number]),
    [user?.role]
  );

  const isReadOnly = user?.role === "PARENT";

  const visibleGroups = useMemo(() => {
    const term = groupSearch.trim().toLowerCase();
    if (!term) {
      return groups;
    }

    return groups.filter((group) => {
      const text = `${group.name} ${group.level} ${group.stream} ${group.academicYear}`.toLowerCase();
      return text.includes(term);
    });
  }, [groupSearch, groups]);
  const groupPageSize = 10;
  const paginatedVisibleGroups = useMemo(() => {
    const start = (groupPage - 1) * groupPageSize;
    return visibleGroups.slice(start, start + groupPageSize);
  }, [groupPage, visibleGroups]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const status = connectionHint(connectionStatus);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(() => {
    setGroupPage(1);
  }, [groupSearch, groups.length]);

  useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const refreshGroups = useCallback(
    async (preferredGroupId?: string) => {
      if (!user) {
        return;
      }

      setLoadingGroups(true);
      setError(null);

      try {
        let data = await chatApi.listGroups();

        if (data.length === 0 && isLearner) {
          await chatApi.autoJoin();
          data = await chatApi.listGroups();
        }

        const ordered = sortGroups(data);
        setGroups(ordered);

        setSelectedGroupId((current) => {
          if (preferredGroupId && ordered.some((group) => group.id === preferredGroupId)) {
            return preferredGroupId;
          }

          if (current && ordered.some((group) => group.id === current)) {
            return current;
          }

          return "";
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger les groupes";
        setError(message);
        toastError("Erreur chargement groupes", message);
      } finally {
        setLoadingGroups(false);
      }
    },
    [isLearner, toastError, user]
  );

  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  useEffect(() => {
    let cancelled = false;

    async function loadEmojis() {
      setLoadingEmojis(true);
      try {
        const data = await chatApi.listEmojis();
        if (!cancelled) {
          setEmojiCatalog(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Impossible de charger les emojis";
          toastError("Emojis indisponibles", message);
          setEmojiCatalog([
            { shortcode: ":smile:", emoji: "😄", label: "Sourire" },
            { shortcode: ":heart:", emoji: "❤️", label: "Coeur" },
            { shortcode: ":thumbsup:", emoji: "👍", label: "Pouce en l air" },
            { shortcode: ":rocket:", emoji: "🚀", label: "Fusee" },
            { shortcode: ":book:", emoji: "📚", label: "Etudes" }
          ]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEmojis(false);
        }
      }
    }

    void loadEmojis();
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  useEffect(() => {
    const socket = createChatSocket();
    socketRef.current = socket;

    setConnectionStatus("connecting");

    socket.on("connect", () => {
      setConnectionStatus("connected");
      const currentGroupId = selectedGroupIdRef.current;
      if (currentGroupId) {
        socket.emit("chat:join", { groupId: currentGroupId });
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("chat:message:new", (message: DiscussionMessage & { groupId?: string }) => {
      if (!message.groupId) {
        return;
      }

      setGroups((current) =>
        sortGroups(
          current.map((group) =>
            group.id === message.groupId
              ? {
                  ...group,
                  messages: [message],
                  _count: {
                    messages: (group._count?.messages || 0) + 1
                  }
                }
              : group
          )
        )
      );

      if (message.groupId === selectedGroupIdRef.current) {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
    });

    socket.on("chat:message:deleted", (payload: { messageId?: string; groupId?: string }) => {
      if (!payload.groupId || !payload.messageId) {
        return;
      }

      setGroups((current) =>
        current.map((group) => {
          if (group.id !== payload.groupId) {
            return group;
          }

          return {
            ...group,
            messages: group.messages.filter((message) => message.id !== payload.messageId).slice(0, 1),
            _count: {
              messages: Math.max((group._count?.messages || 0) - 1, 0)
            }
          };
        })
      );

      if (payload.groupId === selectedGroupIdRef.current) {
        setMessages((current) => current.filter((message) => message.id !== payload.messageId));
      }
    });

    socket.connect();

    return () => {
      if (joinedGroupIdRef.current && socket.connected) {
        socket.emit("chat:leave", { groupId: joinedGroupIdRef.current });
      }

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previous = previousConnectionRef.current;

    if (previous !== connectionStatus) {
      if (previous === "disconnected" && connectionStatus === "connected") {
        success("Connexion retablie", "Le chat temps reel est de nouveau actif.");
      }

      if (connectionStatus === "disconnected") {
        info("Connexion instable", "Bascule temporaire sur le mode API.");
      }
    }

    previousConnectionRef.current = connectionStatus;
  }, [connectionStatus, info, success]);

  const joinRealtimeGroup = useCallback(
    (groupId: string) => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        return Promise.resolve(false);
      }

      if (joinedGroupIdRef.current && joinedGroupIdRef.current !== groupId) {
        socket.emit("chat:leave", { groupId: joinedGroupIdRef.current });
      }

      return new Promise<boolean>((resolve) => {
        socket.emit("chat:join", { groupId }, (ack: SocketAck<{ messages?: DiscussionMessage[] }>) => {
          if (!ack?.ok) {
            const message = ack?.error || "Impossible de rejoindre le groupe";
            setError(message);
            toastError("Connexion groupe impossible", message);
            resolve(false);
            return;
          }

          joinedGroupIdRef.current = groupId;
          setMessages(Array.isArray(ack.data?.messages) ? ack.data.messages : []);
          resolve(true);
        });
      });
    },
    [toastError]
  );

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      setError(null);

      try {
        const joined = await joinRealtimeGroup(selectedGroupId);
        if (cancelled) {
          return;
        }

        if (!joined) {
          const data = await chatApi.listMessages(selectedGroupId, 120);
          if (!cancelled) {
            setMessages(data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Impossible de charger les messages";
          setError(message);
          toastError("Erreur chargement messages", message);
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, connectionStatus, joinRealtimeGroup, toastError]);

  async function onCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateGroup) {
      return;
    }

    setCreatingGroup(true);
    setError(null);

    try {
      await chatApi.createGroup({
        profileType: groupForm.profileType,
        level: groupForm.level,
        stream: groupForm.stream,
        academicYear: groupForm.academicYear,
        name: groupForm.name.trim() || undefined
      });

      setGroupForm((current) => ({ ...current, name: "" }));
      setShowGroupBuilder(false);
      success("Groupe cree", "Le groupe est disponible dans la liste.");
      await refreshGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Creation du groupe impossible";
      setError(message);
      toastError("Creation groupe impossible", message);
    } finally {
      setCreatingGroup(false);
    }
  }

  async function sendMessageContent(content: string) {
    if (!selectedGroupId || !content.trim() || isReadOnly) {
      return;
    }

    setSending(true);
    setError(null);
    const normalizedContent = content.trim();

    try {
      const socket = socketRef.current;

      if (socket && socket.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "chat:message:send",
            { groupId: selectedGroupId, content: normalizedContent },
            (ack: SocketAck<{ message?: DiscussionMessage }>) => {
              if (!ack?.ok) {
                reject(new Error(ack?.error || "Envoi impossible"));
                return;
              }

              if (ack.data?.message) {
                const messageFromAck = ack.data.message;
                setMessages((current) =>
                  current.some((item) => item.id === messageFromAck.id) ? current : [...current, messageFromAck]
                );
                setGroups((current) =>
                  sortGroups(
                    current.map((group) =>
                      group.id === selectedGroupId
                        ? {
                            ...group,
                            messages: [messageFromAck],
                            _count: {
                              messages: group._count?.messages || 0
                            }
                          }
                        : group
                    )
                  )
                );
              }

              resolve();
            }
          );
        });
      } else {
        const created = await chatApi.postMessage(selectedGroupId, normalizedContent);
        setMessages((current) => [...current, created]);

        setGroups((current) =>
          sortGroups(
            current.map((group) =>
              group.id === selectedGroupId
                ? {
                    ...group,
                    messages: [created],
                    _count: {
                      messages: (group._count?.messages || 0) + 1
                    }
                  }
                : group
            )
          )
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Envoi du message impossible";
      setError(message);
      toastError("Envoi du message impossible", message);
    } finally {
      setSending(false);
    }
  }

  async function onSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = draft.trim();
    if (!payload) {
      return;
    }

    await sendMessageContent(payload);
    setDraft("");
    setShowEmojiPicker(false);
  }

  async function onDeleteMessage(messageId: string) {
    if (!selectedGroupId) {
      return;
    }

    setError(null);

    try {
      const socket = socketRef.current;

      if (socket && socket.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.emit("chat:message:delete", { messageId }, (ack: SocketAck) => {
            if (!ack?.ok) {
              reject(new Error(ack?.error || "Suppression impossible"));
              return;
            }

            resolve();
          });
        });
      } else {
        await chatApi.deleteMessage(messageId);
        setMessages((current) => current.filter((message) => message.id !== messageId));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Suppression impossible";
      setError(message);
      toastError("Suppression impossible", message);
    }
  }

  function onSelectEmoji(emoji: ChatEmoji) {
    setDraft((current) => `${current}${emoji.emoji}`);
    setShowEmojiPicker(false);
  }

  function onPickAttachment() {
    if (!selectedGroupId || isReadOnly || uploading) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function onAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedGroupId) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const upload = await chatApi.uploadAttachment(selectedGroupId, file);
      await sendMessageContent(upload.messageTemplate);
      success("Fichier envoye", `${upload.originalName} a ete partage avec le groupe.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload impossible";
      setError(message);
      toastError("Upload impossible", message);
    } finally {
      setUploading(false);
    }
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending) {
        const payload = draft.trim();
        if (payload) {
          void sendMessageContent(payload).then(() => {
            setDraft("");
            setShowEmojiPicker(false);
          });
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</div> : null}

      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <div className="grid min-h-[72vh] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={clsx(
              "min-h-0 flex-col border-r border-slate-200 bg-slate-100",
              selectedGroupId ? "hidden lg:flex" : "flex"
            )}
          >
            <header className="border-b border-slate-200 bg-slate-100 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-slate-900">Discussions</h2>
                <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", status.className)}>{status.label}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Rechercher une conversation"
                    className="w-full bg-white pl-9"
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-10 rounded-full px-0"
                  onClick={() => void refreshGroups()}
                  aria-label="Actualiser"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>

              {canCreateGroup ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowGroupBuilder((current) => !current)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    {showGroupBuilder ? "Fermer creation" : "Nouveau groupe"}
                  </Button>

                  {showGroupBuilder ? (
                    <form onSubmit={onCreateGroup} className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={groupForm.profileType}
                          onChange={(event) =>
                            setGroupForm((current) => ({
                              ...current,
                              profileType: event.target.value as "ELEVE" | "ETUDIANT",
                              level: event.target.value === "ETUDIANT" ? "LICENCE_1" : "SECONDE"
                            }))
                          }
                        >
                          <option value="ELEVE">Eleves</option>
                          <option value="ETUDIANT">Etudiants</option>
                        </select>

                        <select
                          value={groupForm.level}
                          onChange={(event) =>
                            setGroupForm((current) => ({ ...current, level: event.target.value as (typeof levelOptions)[number] }))
                          }
                        >
                          {levelOptions.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>

                        <select
                          value={groupForm.stream}
                          onChange={(event) =>
                            setGroupForm((current) => ({ ...current, stream: event.target.value as (typeof streamOptions)[number] }))
                          }
                        >
                          {streamOptions.map((stream) => (
                            <option key={stream} value={stream}>
                              {stream}
                            </option>
                          ))}
                        </select>

                        <input
                          value={groupForm.academicYear}
                          onChange={(event) => setGroupForm((current) => ({ ...current, academicYear: event.target.value }))}
                          placeholder="Annee academique"
                          required
                        />
                      </div>

                      <input
                        value={groupForm.name}
                        onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Nom personnalise (optionnel)"
                      />

                      <Button type="submit" disabled={creatingGroup}>
                        {creatingGroup ? "Creation..." : "Creer"}
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingGroups ? (
                <div className="px-4 py-4 text-sm text-slate-600">Chargement des conversations...</div>
              ) : visibleGroups.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">Aucune conversation disponible.</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {paginatedVisibleGroups.map((group, index) => {
                    const isActive = group.id === selectedGroupId;
                    const latest = group.messages[0];
                    const attachmentPreview = latest ? parseAttachment(latest.content) : null;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        style={{ animationDelay: `${index * 20}ms` }}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={clsx(
                          "animate-[chat-pop_180ms_ease] w-full px-4 py-3 text-left transition",
                          isActive ? "bg-emerald-100/70" : "hover:bg-white"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className={clsx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", streamBadgeClass(group.stream))}>
                            {avatarFromName(group.name)}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{group.name}</p>
                              {latest ? <span className="text-[11px] text-slate-500">{formatMessageTime(latest.createdAt)}</span> : null}
                            </div>

                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className="line-clamp-1 text-xs text-slate-600">
                                {latest
                                  ? `${latest.senderUser.fullName}: ${
                                      attachmentPreview ? `📎 ${attachmentPreview.name}` : latest.content
                                    }`
                                  : "Aucun message"}
                              </p>
                              {group._count.messages > 0 ? (
                                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                                  {group._count.messages}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-[11px] text-slate-500">
                              {group.level} | {group.stream} | {group.academicYear}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {visibleGroups.length > groupPageSize ? (
              <div className="border-t border-slate-200 bg-slate-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    disabled={groupPage <= 1}
                    onClick={() => setGroupPage((current) => Math.max(1, current - 1))}
                  >
                    Precedent
                  </button>
                  <span className="text-xs text-slate-600">
                    Page {groupPage} / {Math.max(1, Math.ceil(visibleGroups.length / groupPageSize))}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    disabled={groupPage >= Math.max(1, Math.ceil(visibleGroups.length / groupPageSize))}
                    onClick={() =>
                      setGroupPage((current) => Math.min(Math.ceil(visibleGroups.length / groupPageSize), current + 1))
                    }
                  >
                    Suivant
                  </button>
                </div>
              </div>
            ) : null}
          </aside>

          <section className={clsx("min-h-0 flex-col bg-slate-200", selectedGroupId ? "flex" : "hidden lg:flex")}>
            {!selectedGroup ? (
              <div className="flex h-full min-h-[520px] items-center justify-center px-6 text-center">
                <div>
                  <h3 className="font-display text-2xl font-bold text-slate-900">Selectionnez une conversation</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Choisissez un groupe a gauche pour commencer a discuter entre classes de differents etablissements.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 lg:hidden"
                      onClick={() => setSelectedGroupId("")}
                      aria-label="Retour aux discussions"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className={clsx("inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold", streamBadgeClass(selectedGroup.stream))}>
                      {avatarFromName(selectedGroup.name)}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedGroup.name}</p>
                      <p className="text-xs text-slate-600">
                        {selectedGroup.level} | {selectedGroup.stream} | {selectedGroup.academicYear}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <button type="button" className="rounded-full p-2 hover:bg-slate-200" aria-label="Visio">
                      <Video className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full p-2 hover:bg-slate-200" aria-label="Options">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <div className="whatsapp-chat-bg min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <p className="text-sm text-slate-600">Chargement des messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600">
                      Aucun message pour le moment. Soyez le premier a lancer la conversation.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((message) => {
                        const isMine = message.senderUser.id === user?.id;
                        const canDelete =
                          isMine ||
                          supervisorRoles.includes((user?.role || "") as (typeof supervisorRoles)[number]);
                        const attachment = parseAttachment(message.content);

                        return (
                          <article key={message.id} className={clsx("flex", isMine ? "justify-end" : "justify-start")}>
                            <div
                              className={clsx(
                                "animate-[chat-pop_180ms_ease] relative max-w-[82%] rounded-xl px-3 py-2 shadow-sm",
                                isMine ? "bg-emerald-100 text-slate-900" : "border border-slate-200 bg-white text-slate-800"
                              )}
                            >
                              <span
                                className={clsx(
                                  "absolute top-2 h-3 w-3 rotate-45",
                                  isMine ? "-right-1 bg-emerald-100" : "-left-1 bg-white"
                                )}
                              />

                              {!isMine ? <p className="text-[11px] font-semibold text-slate-800">{message.senderUser.fullName}</p> : null}

                              {attachment ? (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-xl border border-slate-200 bg-white/75 px-3 py-2 text-sm font-medium text-slate-900 underline decoration-dotted underline-offset-2"
                                >
                                  📎 {attachment.name}
                                </a>
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                              )}

                              <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-slate-500">
                                <span>{message.senderUser.school?.code || "Etablissement"}</span>
                                <span>{formatMessageDate(message.createdAt)}</span>
                                {canDelete ? (
                                  <button
                                    type="button"
                                    className="rounded-full px-2 py-0.5 font-semibold hover:bg-black/8"
                                    onClick={() => void onDeleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                      <div ref={messageBottomRef} />
                    </div>
                  )}
                </div>

                {isReadOnly ? (
                  <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Compte parent en mode lecture. Vous pouvez suivre les echanges sans envoyer de message.
                  </div>
                ) : (
                  <form onSubmit={onSendMessage} className="border-t border-slate-200 bg-slate-100 px-3 py-3">
                    {showEmojiPicker ? (
                      <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                        {loadingEmojis ? (
                          <p className="px-2 py-1 text-xs text-slate-500">Chargement des emojis...</p>
                        ) : (
                          <div className="grid max-h-36 grid-cols-8 gap-1 overflow-y-auto">
                            {emojiCatalog.map((emoji) => (
                              <button
                                key={emoji.shortcode}
                                type="button"
                                title={`${emoji.label} (${emoji.shortcode})`}
                                className="rounded-lg px-1 py-1 text-lg hover:bg-slate-100"
                                onClick={() => onSelectEmoji(emoji)}
                              >
                                {emoji.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        className={clsx(
                          "rounded-full p-2 text-slate-600 hover:bg-slate-200",
                          showEmojiPicker ? "bg-slate-200" : ""
                        )}
                        aria-label="Emoji"
                        onClick={() => setShowEmojiPicker((current) => !current)}
                      >
                        <Smile className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        className={clsx(
                          "rounded-full p-2 text-slate-600 hover:bg-slate-200",
                          uploading ? "animate-pulse" : ""
                        )}
                        aria-label="Piece jointe"
                        onClick={onPickAttachment}
                        disabled={uploading}
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={onAttachmentChange}
                      />

                      <div className="flex-1 rounded-2xl bg-white px-3 py-2 shadow-sm">
                        <textarea
                          value={draft}
                          rows={1}
                          maxLength={1500}
                          placeholder="Tapez un message"
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={onDraftKeyDown}
                          className="max-h-36 min-h-[30px] w-full resize-y border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sending || uploading || !draft.trim() || !selectedGroupId}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Envoyer"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 px-1 text-[11px] text-slate-500">
                      `Enter` pour envoyer, `Shift+Enter` pour une nouvelle ligne. {uploading ? "Upload en cours..." : ""}
                    </p>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
