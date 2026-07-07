import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Bot,
  Check,
  Copy,
  Eye,
  KeyRound,
  LogIn,
  Megaphone,
  MessageCircle,
  Play,
  QrCode,
  RefreshCcw,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createGameSocket } from "./socket.js";
import { CatFinderGame } from "./CatFinderGame.jsx";
import { GENERAL_GUIDANCE, JOIN_GUIDANCE, OBSERVER_GUIDANCE, PLAYER_GUIDANCE } from "../shared/roleGuidance.js";
import {
  CUSTOM_MODEL_VALUE,
  DEFAULT_MODEL_ID,
  MODEL_OPTIONS,
  isPresetModel,
} from "../shared/modelOptions.js";
import { resolveTeacherTopicPreview } from "../shared/topicDisplay.js";
import { TOPIC_PRESETS } from "../shared/topicPresets.js";
import { GAME_MODES, GROUP_SIZE_OPTIONS } from "../shared/gameModes.js";

const PARTICIPANT_STORAGE_KEY = "classroom-turing-game-participant";
const VIEW_STORAGE_KEY = "classroom-turing-game-view";
const TEACHER_PASSWORD_STORAGE_KEY = "classroom-turing-game-teacher-password";

const ERROR_MESSAGES = {
  NAME_REQUIRED: "이름을 입력해야 합니다.",
  CLASSROOM_FULL: "참여 인원이 가득 찼습니다.",
  PLAYER_SLOTS_FULL: "플레이어 자리가 가득 찼습니다.",
  ONLY_PLAYERS_CAN_CHAT: "플레이어만 전체 대화에 참여할 수 있습니다.",
  PLAYERS_CANNOT_USE_OBSERVER_CHAT: "플레이어는 참관자 채팅을 볼 수 없습니다.",
  PLAYERS_CANNOT_VOTE: "플레이어는 투표할 수 없습니다.",
  SELECT_EXACT_AI_COUNT: "AI 수와 같은 개수만 선택해야 합니다.",
  INVALID_VOTE_CANDIDATE: "투표 후보가 올바르지 않습니다.",
  ANNOUNCEMENT_REQUIRED: "공지 내용을 입력해야 합니다.",
  GROUP_NOT_FOUND: "그룹을 찾을 수 없습니다.",
  AUTHOR_NOT_IN_GROUP: "내 그룹에서만 대화할 수 있습니다.",
  ONLY_HUMANS_CAN_VOTE: "학생만 투표할 수 있습니다.",
  VOTER_NOT_IN_GROUP: "내 그룹 안에서만 투표할 수 있습니다.",
  USE_GROUP_CHAT: "소수 그룹 모드에서는 내 그룹 대화만 사용할 수 있습니다.",
  INVALID_TEACHER_PASSWORD: "교사 비밀번호가 맞지 않습니다.",
};

export function isCatFinderRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return normalizedPath === "/" || normalizedPath === "/cat-finder";
}

export function App() {
  const isCatFinderPath = isCatFinderRoute(window.location.pathname);

  if (isCatFinderPath) {
    return <CatFinderGame />;
  }

  return <ClassroomApp />;
}

function ClassroomApp() {
  const socketRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || "student");
  const [teacherPassword, setTeacherPassword] = useState(() => readStoredTeacherPassword());
  const [teacherAuthenticated, setTeacherAuthenticated] = useState(() => Boolean(readStoredTeacherPassword()));
  const [participant, setParticipant] = useState(() => readStoredParticipant());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("game:snapshot", setSnapshot);
    socket.on("game:error", (payload) => setNotice(payload.message));

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
    if (view === "teacher" && teacherAuthenticated && socketRef.current?.connected) {
      socketRef.current.timeout(2000).emit("teacher:inspect", { teacherPassword }, (_error, response) => {
        if (response?.ok === false) {
          setTeacherAuthenticated(false);
          setTeacherPassword("");
          sessionStorage.removeItem(TEACHER_PASSWORD_STORAGE_KEY);
          setNotice(ERROR_MESSAGES[response.error] || response.error);
        }
      });
    }
    if (view === "student" && socketRef.current?.connected) {
      socketRef.current
        .timeout(2000)
        .emit("student:inspect", { participantId: participant?.id }, () => {});
    }
  }, [view, connected, participant?.id, teacherAuthenticated, teacherPassword]);

  const emit = (event, payload = {}) =>
    new Promise((resolve, reject) => {
      const protectedPayload = event.startsWith("teacher:")
        ? { teacherPassword, ...payload }
        : payload;
      socketRef.current.timeout(5000).emit(event, protectedPayload, (error, response) => {
        if (error) {
          reject(new Error("서버 응답이 지연되고 있습니다."));
          return;
        }
        if (response?.ok === false) {
          reject(new Error(ERROR_MESSAGES[response.error] || response.error));
          return;
        }
        resolve(response);
      });
    });

  const handleTeacherLogin = async (password) => {
    try {
      const nextPassword = password.trim();
      const response = await emit("teacher:inspect", { teacherPassword: nextPassword });
      setSnapshot(response.game);
      setTeacherPassword(nextPassword);
      setTeacherAuthenticated(true);
      sessionStorage.setItem(TEACHER_PASSWORD_STORAGE_KEY, nextPassword);
      setNotice("");
    } catch (error) {
      setTeacherPassword("");
      setTeacherAuthenticated(false);
      sessionStorage.removeItem(TEACHER_PASSWORD_STORAGE_KEY);
      setNotice(error.message);
    }
  };

  const handleStudentJoin = async (name, preferredRole) => {
    try {
      const response = await emit("student:join", {
        name,
        preferredRole,
        participantId: participant?.id,
      });
      setParticipant(response.participant);
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(response.participant));
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const activeParticipant = participant
    ? snapshot?.participants.find((candidate) => candidate.id === participant.id)
    : null;

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p className="eyebrow">Classroom Turing Game</p>
          <h1>교실 튜링 게임</h1>
        </div>
        <div className="topActions">
          <span className={`connection ${connected ? "online" : "offline"}`}>
            <span />
            {connected ? "연결됨" : "연결 끊김"}
          </span>
          <div className="segmented" aria-label="화면 선택">
            <button className={view === "student" ? "active" : ""} onClick={() => setView("student")}>
              <UsersRound size={16} />
              학생
            </button>
            <button className={view === "teacher" ? "active" : ""} onClick={() => setView("teacher")}>
              <ShieldCheck size={16} />
              교사
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      {view === "teacher" ? (
        teacherAuthenticated ? (
        <TeacherPanel snapshot={snapshot} emit={emit} setNotice={setNotice} />
        ) : (
          <TeacherLogin connected={connected} onLogin={handleTeacherLogin} />
        )
      ) : (
        <StudentPanel
          snapshot={snapshot}
          participant={participant}
          activeParticipant={activeParticipant}
          onJoin={handleStudentJoin}
          emit={emit}
          setNotice={setNotice}
        />
      )}
    </main>
  );
}

function TeacherLogin({ connected, onLogin }) {
  const [password, setPassword] = useState("");

  return (
    <section className="teacherLogin">
      <Panel title="교사 연결" icon={<ShieldCheck size={18} />}>
        <form
          className="teacherLoginForm"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(password);
          }}
        >
          <p>교사 화면은 비밀번호를 입력해야 열립니다.</p>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          <button className="primary" type="submit" disabled={!connected || !password.trim()}>
            <LogIn size={16} />
            교사로 연결
          </button>
        </form>
      </Panel>
    </section>
  );
}

function TeacherPanel({ snapshot, emit, setNotice }) {
  const [settings, setSettings] = useState({
    gameMode: GAME_MODES.full,
    title: "AI 수학 튜링 게임",
    topic: "",
    maxParticipants: 34,
    humanPlayerSlots: 6,
    aiPlayerCount: 2,
    minorityGroupSize: 2,
    minorityAiGroupCount: 4,
    autoAiReplies: true,
    model: DEFAULT_MODEL_ID,
  });
  const [apiKey, setApiKey] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);

  useEffect(() => {
    if (snapshot?.settings) {
      setSettings({
        gameMode: snapshot.settings.gameMode,
        title: snapshot.settings.title,
        topic: snapshot.settings.topic,
        maxParticipants: snapshot.settings.maxParticipants,
        humanPlayerSlots: snapshot.settings.humanPlayerSlots,
        aiPlayerCount: snapshot.settings.aiPlayerCount,
        minorityGroupSize: snapshot.settings.minorityGroupSize,
        minorityAiGroupCount: snapshot.settings.minorityAiGroupCount,
        autoAiReplies: snapshot.settings.autoAiReplies,
        model: snapshot.settings.model,
      });
      setUseCustomModel(!isPresetModel(snapshot.settings.model));
    }
  }, [
    snapshot?.settings?.gameMode,
    snapshot?.settings?.title,
    snapshot?.settings?.topic,
    snapshot?.settings?.maxParticipants,
    snapshot?.settings?.humanPlayerSlots,
    snapshot?.settings?.aiPlayerCount,
    snapshot?.settings?.minorityGroupSize,
    snapshot?.settings?.minorityAiGroupCount,
    snapshot?.settings?.autoAiReplies,
    snapshot?.settings?.model,
  ]);

  useEffect(() => {
    setJoinUrl(window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;
    if (!joinUrl.trim()) {
      setQrDataUrl("");
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(joinUrl.trim(), {
      width: 220,
      margin: 1,
      color: {
        dark: "#17202a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrDataUrl("");
        }
      });

    return () => {
      active = false;
    };
  }, [joinUrl]);

  const saveSettings = async (nextSettings = settings, options = {}) => {
    try {
      const trimmedApiKey = apiKey.trim();
      await emit("teacher:configure", {
        settings: nextSettings,
        ...(trimmedApiKey ? { apiKey: trimmedApiKey } : {}),
      });
      if (!options.silent) {
        setNotice("설정을 저장했습니다.");
      }
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  };

  const sendTeacherCommand = async (event, payload, successMessage) => {
    try {
      await emit(event, payload);
      setNotice(successMessage);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const sendAnnouncement = async () => {
    try {
      await emit("teacher:announce", { text: announcement });
      setAnnouncement("");
      setNotice("공지를 보냈습니다.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const startGameWithCurrentSettings = async () => {
    const saved = await saveSettings(settings, { silent: true });
    if (!saved) {
      return;
    }
    try {
      await emit("teacher:start", {});
      setNotice("게임을 시작했습니다.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const copyJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setNotice("학생 접속 링크를 복사했습니다.");
    } catch {
      setNotice("링크를 직접 선택해서 복사해 주세요.");
    }
  };

  const participants = snapshot?.participants || [];
  const players = snapshot?.players || [];
  const aiPlayers = players.filter((player) => player.kind === "ai");
  const humanPlayers = players.filter((player) => player.kind === "human");
  const isMinorityMode = settings.gameMode === GAME_MODES.minority;
  const isMinoritySnapshot = snapshot?.settings?.gameMode === GAME_MODES.minority;
  const totalPlayers = Number(settings.humanPlayerSlots) + Number(settings.aiPlayerCount);
  const modelSelectValue = useCustomModel || !isPresetModel(settings.model) ? CUSTOM_MODEL_VALUE : settings.model;
  const selectedTopicPresetId = TOPIC_PRESETS.find((preset) => preset.topic === settings.topic)?.id || "";
  const topicPreviewText = resolveTeacherTopicPreview({
    settingsTopic: settings.topic,
    snapshotTopic: snapshot?.settings?.topic,
  });

  return (
    <section className="teacherGrid">
      <Panel title="수업 설정" icon={<Settings size={18} />}>
        <div className="formGrid">
          <label>
            게임 이름
            <input
              value={settings.title}
              onChange={(event) => setSettings({ ...settings, title: event.target.value })}
            />
          </label>
          <label>
            추천 주제
            <select
              value={selectedTopicPresetId}
              onChange={(event) => {
                const preset = TOPIC_PRESETS.find((candidate) => candidate.id === event.target.value);
                if (preset) {
                  const nextSettings = { ...settings, topic: preset.topic };
                  setSettings(nextSettings);
                  void saveSettings(nextSettings);
                }
              }}
            >
              <option value="">직접 입력 유지</option>
              {TOPIC_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            대화 주제
            <input
              value={settings.topic}
              onChange={(event) => setSettings({ ...settings, topic: event.target.value })}
            />
          </label>
          <p className="topicPresetHelp">
            최신 연예인, 밈, 경기 결과처럼 실시간 지식이 필요한 퀴즈보다 판단과 말투가 드러나는 주제를 권장합니다.
          </p>
          <label>
            참여 인원
            <input
              type="number"
              min="1"
              max="34"
              value={settings.maxParticipants}
              onChange={(event) => setSettings({ ...settings, maxParticipants: event.target.value })}
            />
          </label>
          <label>
            게임 방식
            <select
              value={settings.gameMode}
              onChange={(event) => setSettings({ ...settings, gameMode: event.target.value })}
            >
              <option value={GAME_MODES.full}>전체 대화</option>
              <option value={GAME_MODES.minority}>소수 그룹</option>
            </select>
          </label>
          {isMinorityMode ? (
            <>
              <label>
                그룹 인원
                <select
                  value={settings.minorityGroupSize}
                  onChange={(event) => setSettings({ ...settings, minorityGroupSize: event.target.value })}
                >
                  {GROUP_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}명
                    </option>
                  ))}
                </select>
              </label>
              <label>
                AI 포함 그룹
                <input
                  type="number"
                  min="0"
                  max="16"
                  value={settings.minorityAiGroupCount}
                  onChange={(event) => setSettings({ ...settings, minorityAiGroupCount: event.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                학생 플레이어
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.humanPlayerSlots}
                  onChange={(event) => setSettings({ ...settings, humanPlayerSlots: event.target.value })}
                />
              </label>
              <label>
                AI 플레이어
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={settings.aiPlayerCount}
                  onChange={(event) => setSettings({ ...settings, aiPlayerCount: event.target.value })}
                />
              </label>
            </>
          )}
          <label>
            모델
            <select
              value={modelSelectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === CUSTOM_MODEL_VALUE) {
                  setUseCustomModel(true);
                  return;
                }
                setUseCustomModel(false);
                setSettings({
                  ...settings,
                  model: value,
                });
              }}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} - {option.description}
                </option>
              ))}
              <option value={CUSTOM_MODEL_VALUE}>직접 입력</option>
            </select>
          </label>
          {useCustomModel && (
            <label>
              모델 ID
              <input
                value={settings.model}
                onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                placeholder="provider/model-name"
              />
            </label>
          )}
          <label className="wide">
            <span className="labelWithIcon">
              <KeyRound size={16} />
              OpenRouter API key
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-or-..."
              autoComplete="off"
            />
          </label>
        </div>
        <div className="inlineControls">
          <label className="checkRow">
            <input
              type="checkbox"
              checked={settings.autoAiReplies}
              onChange={(event) => setSettings({ ...settings, autoAiReplies: event.target.checked })}
            />
            AI 자동 응답
          </label>
          <StatusPill tone={snapshot?.settings?.apiKeyConfigured ? "ok" : "warn"}>
            {snapshot?.settings?.apiKeyConfigured ? "API key 입력됨" : "API key 없음"}
          </StatusPill>
          {isMinorityMode ? (
            <StatusPill tone="neutral">
              그룹 {settings.minorityGroupSize}명 · AI 그룹 {settings.minorityAiGroupCount}
            </StatusPill>
          ) : (
            <StatusPill tone={totalPlayers <= 10 ? "ok" : "warn"}>
              플레이어 {Math.min(totalPlayers, 10)}/10
            </StatusPill>
          )}
        </div>
        <div className="buttonRow">
          <button className="primary" onClick={() => saveSettings()}>
            <Check size={16} />
            저장
          </button>
          <button onClick={startGameWithCurrentSettings}>
            <Play size={16} />
            시작
          </button>
          <button onClick={() => sendTeacherCommand("teacher:reveal", {}, "결과를 공개했습니다.")}>
            <Eye size={16} />
            공개
          </button>
          <button onClick={() => sendTeacherCommand("teacher:reset", { settings }, "새 게임을 만들었습니다.")}>
            <RefreshCcw size={16} />
            새 게임
          </button>
        </div>
      </Panel>

      <Panel title="학생 접속" icon={<QrCode size={18} />}>
        <div className="joinLinkPanel">
          <label>
            학생에게 줄 링크
            <input value={joinUrl} onChange={(event) => setJoinUrl(event.target.value)} />
          </label>
          <div className="qrBox">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="학생 접속 QR 코드" />
            ) : (
              <EmptyText text="링크를 입력하면 QR 코드가 표시됩니다." />
            )}
          </div>
          <button onClick={copyJoinUrl}>
            <Copy size={16} />
            링크 복사
          </button>
        </div>
      </Panel>

      <Panel title="수업 공지" icon={<Megaphone size={18} />}>
        <div className="announcementComposer">
          <div className="topicPreview">
            <span>현재 대화 주제</span>
            <strong>{topicPreviewText || "아직 정해진 주제가 없습니다."}</strong>
          </div>
          <label>
            학생에게 보낼 공지
            <textarea
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              maxLength={500}
              placeholder="예: 오늘 대화 주제는 확률과 AI 예측입니다."
            />
          </label>
          <button className="primary" onClick={sendAnnouncement}>
            <Megaphone size={16} />
            공지 보내기
          </button>
          <AnnouncementList announcements={snapshot?.announcements || []} />
        </div>
      </Panel>

      <Panel title="참가자" icon={<UsersRound size={18} />}>
        <div className="roster">
          {participants.length === 0 && <EmptyText text="입장한 학생이 없습니다." />}
          {participants.map((participant) => {
            const isPlayer = participant.role === "player";
            return (
              <div className="rosterRow" key={participant.id}>
                <div>
                  <strong>{participant.name}</strong>
                  <span>{isPlayer ? "플레이어" : "참관자"}</span>
                  <span>희망: {participant.preferredRole === "player" ? "플레이어" : "참관"}</span>
                </div>
                <div className="iconButtons">
                  {!isMinoritySnapshot && (
                    <>
                      <button
                        title="플레이어 지정"
                        disabled={isPlayer || humanPlayers.length >= snapshot.settings.humanPlayerSlots}
                        onClick={() =>
                          sendTeacherCommand(
                            "teacher:assign-player",
                            { participantId: participant.id },
                            "플레이어를 지정했습니다.",
                          )
                        }
                      >
                        <UserRound size={16} />
                      </button>
                      <button
                        title="참관자로 변경"
                        disabled={!isPlayer}
                        onClick={() =>
                          sendTeacherCommand(
                            "teacher:unassign-player",
                            { participantId: participant.id },
                            "참관자로 변경했습니다.",
                          )
                        }
                      >
                        <Eye size={16} />
                      </button>
                    </>
                  )}
                  <button
                    title="참가자 제거"
                    onClick={() =>
                      sendTeacherCommand(
                        "teacher:remove-participant",
                        { participantId: participant.id },
                        "참가자를 제거했습니다.",
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {isMinoritySnapshot ? (
        <>
          <Panel title="소수 그룹" icon={<UsersRound size={18} />}>
            <MinorityGroups groups={snapshot?.minorityGroups || []} completion={snapshot?.minorityVoteCompletion || []} />
          </Panel>

          <Panel title="그룹 채팅 기록" icon={<MessageCircle size={18} />}>
            <TeacherMinorityChatLog snapshot={snapshot} />
          </Panel>

          <Panel title="그룹별 결과" icon={<Check size={18} />}>
            <MinorityResults snapshot={snapshot} />
          </Panel>
        </>
      ) : (
        <>
          <Panel title="플레이어" icon={<Bot size={18} />}>
            <div className="playerList">
              {players.map((player) => (
                <div className="playerBadge" key={player.id}>
                  <span className={player.kind === "ai" ? "avatar ai" : "avatar human"}>
                    {player.kind === "ai" ? <Bot size={18} /> : <UserRound size={18} />}
                  </span>
                  <div>
                    <strong>{player.displayName}</strong>
                    <span>{player.kind === "ai" ? "AI" : "학생"}</span>
                  </div>
                  {player.kind === "ai" && (
                    <button
                      title="AI 답변 요청"
                      onClick={() =>
                        sendTeacherCommand(
                          "teacher:request-ai",
                          { playerId: player.id },
                          "AI 답변을 요청했습니다.",
                        )
                      }
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {aiPlayers.length === 0 && <EmptyText text="AI 플레이어가 없습니다." />}
          </Panel>

          <Panel title="투표 결과" icon={<Check size={18} />}>
            <Results snapshot={snapshot} />
          </Panel>

          <Panel title="전체 대화" icon={<MessageCircle size={18} />}>
            <ChatLog messages={snapshot?.mainChat || []} />
          </Panel>

          <Panel title="참관자 채팅" icon={<Eye size={18} />}>
            <ChatLog messages={snapshot?.observerChat || []} />
          </Panel>
        </>
      )}
    </section>
  );
}

function StudentPanel({ snapshot, participant, activeParticipant, onJoin, emit, setNotice }) {
  const [name, setName] = useState(participant?.name || "");
  const [preferredRole, setPreferredRole] = useState(participant?.preferredRole || "observer");
  const role = activeParticipant?.role || "observer";

  if (!snapshot) {
    return <EmptyState title="연결 중" text="서버 상태를 불러오는 중입니다." />;
  }

  if (!activeParticipant) {
    return (
      <section className="joinLayout">
        <Panel title="학생 입장" icon={<LogIn size={18} />}>
          <JoinGuidance />
          <form
            className="joinForm"
            onSubmit={(event) => {
              event.preventDefault();
              onJoin(name, preferredRole);
            }}
          >
            <label>
              이름
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
            </label>
            <div className="roleChoice" aria-label="희망 역할 선택">
              <button
                type="button"
                className={preferredRole === "player" ? "active" : ""}
                onClick={() => setPreferredRole("player")}
              >
                <UserRound size={16} />
                플레이어 희망
              </button>
              <button
                type="button"
                className={preferredRole === "observer" ? "active" : ""}
                onClick={() => setPreferredRole("observer")}
              >
                <Eye size={16} />
                참관 희망
              </button>
            </div>
            <button className="primary" type="submit">
              <LogIn size={16} />
              입장
            </button>
          </form>
        </Panel>
      </section>
    );
  }

  if (snapshot.settings.gameMode === GAME_MODES.minority) {
    return (
      <MinorityStudentView
        snapshot={snapshot}
        activeParticipant={activeParticipant}
        emit={emit}
        setNotice={setNotice}
      />
    );
  }

  return (
    <section className="studentGrid">
      <div className="studentStatus">
        <div>
          <span className="eyebrow">{snapshot.settings.title}</span>
          <h2>{activeParticipant.name}</h2>
        </div>
        <div className="studentPills">
          <StatusPill tone={role === "player" ? "ok" : "neutral"}>
            {role === "player" ? "플레이어" : "참관자"}
          </StatusPill>
          <StatusPill tone="neutral">
            희망 {activeParticipant.preferredRole === "player" ? "플레이어" : "참관"}
          </StatusPill>
        </div>
      </div>

      <StudentAnnouncements snapshot={snapshot} />

      <Panel title="전체 대화" icon={<MessageCircle size={18} />} className="mainChatPanel">
        <ChatLog messages={snapshot.mainChat} />
        {role === "player" ? (
          <MessageForm
            placeholder="전체 대화 입력"
            onSend={async (text) => {
              await emit("player:chat", { text });
            }}
            setNotice={setNotice}
          />
        ) : (
          <EmptyText text="참관자는 전체 대화를 읽고 투표합니다." />
        )}
      </Panel>

      <RoleGuidance role={role} aiPlayerCount={snapshot.settings.aiPlayerCount} />

      {role === "observer" ? (
        <>
          <Panel title="참관자 채팅" icon={<Eye size={18} />}>
            <ChatLog messages={snapshot.observerChat} />
            <MessageForm
              placeholder="참관자 채팅 입력"
              onSend={async (text) => {
                await emit("observer:chat", { text });
              }}
              setNotice={setNotice}
            />
          </Panel>
          <Panel title="AI 투표" icon={<Check size={18} />}>
            <VotePanel snapshot={snapshot} emit={emit} setNotice={setNotice} />
          </Panel>
        </>
      ) : (
        <Panel title="후보" icon={<UsersRound size={18} />}>
          <PlayerCandidates players={snapshot.players} />
        </Panel>
      )}

      {snapshot.phase === "revealed" && (
        <Panel title="결과 공개" icon={<ShieldCheck size={18} />}>
          <Results snapshot={snapshot} />
        </Panel>
      )}
    </section>
  );
}

function JoinGuidance() {
  return (
    <div className="joinGuidance">
      <strong>참여 전 확인</strong>
      <ul>
        {JOIN_GUIDANCE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RoleGuidance({ role, aiPlayerCount }) {
  const isPlayer = role === "player";
  const roleItems = isPlayer ? PLAYER_GUIDANCE : OBSERVER_GUIDANCE;

  return (
    <Panel
      title={isPlayer ? "플레이어 가이드" : "참관자 가이드"}
      icon={isPlayer ? <UserRound size={18} /> : <Eye size={18} />}
      className="guidancePanel"
    >
      <div className="guidanceGrid">
        <section className="guidanceBlock">
          <h3>{isPlayer ? "내 역할" : "추리 방법"}</h3>
          <ul>
            {roleItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="guidanceBlock">
          <h3>공통 주의사항</h3>
          <ul>
            {GENERAL_GUIDANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {!isPlayer && <li>이번 게임에서는 AI를 {aiPlayerCount}명 선택해야 합니다.</li>}
          </ul>
        </section>
      </div>
    </Panel>
  );
}

function MinorityStudentView({ snapshot, activeParticipant, emit, setNotice }) {
  const group = snapshot.minorityGroups.find((candidate) => candidate.id === snapshot.myMinorityGroupId) || null;
  const role = group ? "player" : "observer";

  return (
    <section className="studentGrid">
      <div className="studentStatus">
        <div>
          <span className="eyebrow">{snapshot.settings.title}</span>
          <h2>{activeParticipant.name}</h2>
        </div>
        <div className="studentPills">
          <StatusPill tone={group ? "ok" : "neutral"}>{group ? group.label : "그룹 대기"}</StatusPill>
          <StatusPill tone="neutral">소수 그룹</StatusPill>
        </div>
      </div>

      <StudentAnnouncements snapshot={snapshot} />

      {!group ? (
        <Panel title="그룹 대기" icon={<UsersRound size={18} />}>
          <EmptyText text="게임이 시작되면 내 그룹 대화와 투표가 표시됩니다." />
        </Panel>
      ) : (
        <>
          <Panel title="그룹 대화" icon={<MessageCircle size={18} />} className="mainChatPanel">
            <ChatLog messages={snapshot.minorityChat} />
            {snapshot.phase === "active" ? (
              <MessageForm
                placeholder="내 그룹 대화 입력"
                onSend={async (text) => {
                  await emit("minority:chat", { text });
                }}
                setNotice={setNotice}
              />
            ) : (
              <EmptyText text="공개된 게임에서는 대화를 보관만 합니다." />
            )}
          </Panel>

          <Panel title="내 그룹" icon={<UsersRound size={18} />}>
            <MinorityMemberCandidates group={group} />
          </Panel>

          <Panel title="AI 투표" icon={<Check size={18} />}>
            <MinorityVotePanel snapshot={snapshot} group={group} emit={emit} setNotice={setNotice} />
          </Panel>

          {snapshot.phase === "revealed" && (
            <Panel title="결과 공개" icon={<ShieldCheck size={18} />}>
              <MinorityResults snapshot={snapshot} />
            </Panel>
          )}
        </>
      )}

      <MinorityGuidance hasGroup={Boolean(group)} />
    </section>
  );
}

function MinorityGuidance({ hasGroup }) {
  return (
    <Panel title="소수 그룹 가이드" icon={<UserRound size={18} />} className="guidancePanel">
      <div className="guidanceGrid">
        <section className="guidanceBlock">
          <h3>내 역할</h3>
          <ul>
            <li>내 그룹 안에서 본인이 인간임을 자연스럽게 드러냅니다.</li>
            <li>다른 그룹 대화는 볼 수 없고, 내 그룹 안에서만 대화합니다.</li>
          </ul>
        </section>
        <section className="guidanceBlock">
          <h3>투표</h3>
          <ul>
            <li>{hasGroup ? "대화 후 내 그룹에서 AI로 의심되는 한 명을 선택합니다." : "게임 시작 후 그룹이 배정됩니다."}</li>
            <li>최신 유행 지식보다 말투, 반응 속도, 질문 처리 방식을 살펴봅니다.</li>
          </ul>
        </section>
      </div>
    </Panel>
  );
}

function StudentAnnouncements({ snapshot }) {
  const latestAnnouncements = useMemo(
    () => [...(snapshot.announcements || [])].slice(-3).reverse(),
    [snapshot.announcements],
  );

  return (
    <Panel title="수업 공지" icon={<Megaphone size={18} />} className="announcementPanel">
      <div className="topicPreview">
        <span>대화 주제</span>
        <strong>{snapshot.settings.topic}</strong>
      </div>
      <AnnouncementList announcements={latestAnnouncements} />
    </Panel>
  );
}

function AnnouncementList({ announcements }) {
  if (!announcements.length) {
    return <EmptyText text="아직 교사 공지가 없습니다." />;
  }

  return (
    <div className="announcementList">
      {announcements.map((announcement) => (
        <article className="announcementItem" key={announcement.id}>
          <time>{formatTime(announcement.createdAt)}</time>
          <p>{announcement.text}</p>
        </article>
      ))}
    </div>
  );
}

function VotePanel({ snapshot, emit, setNotice }) {
  const [selected, setSelected] = useState(snapshot.myVote?.selectedPlayerIds || []);
  const requiredCount = snapshot.settings.aiPlayerCount;

  useEffect(() => {
    setSelected(snapshot.myVote?.selectedPlayerIds || []);
  }, [snapshot.myVote]);

  const toggleCandidate = (playerId) => {
    if (selected.includes(playerId)) {
      setSelected(selected.filter((selectedId) => selectedId !== playerId));
      return;
    }
    if (selected.length >= requiredCount) {
      setSelected([...selected.slice(1), playerId]);
      return;
    }
    setSelected([...selected, playerId]);
  };

  const submit = async () => {
    try {
      await emit("observer:vote", { selectedPlayerIds: selected });
      setNotice("투표를 저장했습니다.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="votePanel">
      <div className="voteHeader">
        <strong>{selected.length}/{requiredCount}</strong>
        <span>선택</span>
      </div>
      <div className="candidateGrid">
        {snapshot.players.map((player) => (
          <button
            key={player.id}
            className={selected.includes(player.id) ? "candidate selected" : "candidate"}
            onClick={() => toggleCandidate(player.id)}
          >
            <span>{player.displayName}</span>
            {selected.includes(player.id) && <Check size={16} />}
          </button>
        ))}
      </div>
      <button className="primary fullWidth" onClick={submit} disabled={selected.length !== requiredCount}>
        <Check size={16} />
        투표 저장
      </button>
    </div>
  );
}

function MinorityVotePanel({ snapshot, group, emit, setNotice }) {
  const [selected, setSelected] = useState(snapshot.myMinorityVote?.selectedMemberId || "");
  const candidates = group.members.filter((member) => !member.isMe);

  useEffect(() => {
    setSelected(snapshot.myMinorityVote?.selectedMemberId || "");
  }, [snapshot.myMinorityVote]);

  const submit = async () => {
    try {
      await emit("minority:vote", { selectedMemberId: selected });
      setNotice("투표를 저장했습니다.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  if (snapshot.phase === "revealed") {
    return <MinorityResults snapshot={snapshot} />;
  }

  return (
    <div className="votePanel">
      <div className="voteHeader">
        <strong>{selected ? 1 : 0}/1</strong>
        <span>선택</span>
      </div>
      <div className="candidateGrid">
        {candidates.map((member) => (
          <button
            key={member.id}
            className={selected === member.id ? "candidate selected" : "candidate"}
            onClick={() => setSelected(member.id)}
          >
            <span>{member.displayName}</span>
            {selected === member.id && <Check size={16} />}
          </button>
        ))}
      </div>
      {candidates.length === 0 && <EmptyText text="선택할 그룹원이 없습니다." />}
      <button className="primary fullWidth" onClick={submit} disabled={!selected || snapshot.phase !== "active"}>
        <Check size={16} />
        투표 저장
      </button>
    </div>
  );
}

function Results({ snapshot }) {
  if (!snapshot?.results) {
    return <EmptyText text="아직 공개된 결과가 없습니다." />;
  }
  if (snapshot.results.minorityGroups) {
    return <MinorityResults snapshot={snapshot} />;
  }
  const aiSet = new Set(snapshot.results.aiPlayerIds);
  const players = [...snapshot.players].sort(
    (a, b) => (snapshot.results.voteCounts[b.id] || 0) - (snapshot.results.voteCounts[a.id] || 0),
  );

  return (
    <div className="resultsList">
      {players.map((player) => (
        <div className="resultRow" key={player.id}>
          <div>
            <strong>{player.displayName}</strong>
            <span>{aiSet.has(player.id) ? "AI" : "학생"}</span>
          </div>
          <b>{snapshot.results.voteCounts[player.id] || 0}</b>
        </div>
      ))}
      {snapshot.results.voterAccuracy.length > 0 && (
        <div className="accuracyList">
          {snapshot.results.voterAccuracy.map((item) => (
            <span key={item.voterId}>
              {item.voterName} {item.correctCount}/{item.totalAiCount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MinorityResults({ snapshot }) {
  const results = snapshot?.results;
  if (!results?.minorityGroups) {
    return <EmptyText text="아직 공개된 결과가 없습니다." />;
  }
  const groupById = new Map((snapshot.minorityGroups || []).map((group) => [group.id, group]));

  return (
    <div className="resultsList">
      {results.minorityGroups.map((result) => {
        const group = groupById.get(result.groupId);
        const members = group?.members || [];
        const aiSet = new Set(result.aiMemberIds);

        return (
          <div className="minorityResult" key={result.groupId}>
            <div className="minorityResultHeader">
              <strong>{result.label}</strong>
              <span>AI {result.aiMemberIds.length}명</span>
            </div>
            <div className="resultsList">
              {members.map((member) => (
                <div className="resultRow" key={member.id}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <span>{aiSet.has(member.id) ? "AI" : "학생"}</span>
                  </div>
                  <b>{result.voteCounts[member.id] || 0}</b>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerCandidates({ players }) {
  return (
    <div className="candidateGrid">
      {players.map((player) => (
        <div className="candidate static" key={player.id}>
          <span>{player.displayName}</span>
        </div>
      ))}
    </div>
  );
}

function MinorityGroups({ groups, completion }) {
  if (!groups.length) {
    return <EmptyText text="게임을 시작하면 그룹이 표시됩니다." />;
  }
  const completionByGroupId = new Map(completion.map((item) => [item.groupId, item]));

  return (
    <div className="minorityGroupList">
      {groups.map((group) => {
        const voteState = completionByGroupId.get(group.id);
        return (
          <article className="minorityGroupCard" key={group.id}>
            <div className="minorityGroupHeader">
              <strong>{group.label}</strong>
              {voteState && (
                <span>
                  투표 {voteState.submitted}/{voteState.totalHumanVoters}
                </span>
              )}
            </div>
            <MinorityMemberCandidates group={group} />
          </article>
        );
      })}
    </div>
  );
}

function MinorityMemberCandidates({ group }) {
  return (
    <div className="memberList">
      {group.members.map((member) => (
        <span
          className={`memberPill ${member.kind === "ai" ? "ai" : member.kind === "human" ? "human" : ""}`}
          key={member.id}
        >
          {member.displayName}
          {member.isMe && " · 나"}
          {member.kind === "ai" && " · AI"}
          {member.kind === "human" && !member.isMe && " · 학생"}
        </span>
      ))}
    </div>
  );
}

function TeacherMinorityChatLog({ snapshot }) {
  const groupById = new Map((snapshot?.minorityGroups || []).map((group) => [group.id, group]));
  const messages = snapshot?.minorityChat || [];
  if (!messages.length) {
    return <EmptyText text="아직 그룹 채팅이 없습니다." />;
  }

  return (
    <div className="groupChatList">
      {messages.map((message) => (
        <article className={`chatMessage ${message.authorKind === "ai" ? "aiMessage" : ""}`} key={message.id}>
          <div>
            <strong>
              {groupById.get(message.groupId)?.label || "그룹"} · {message.authorName}
            </strong>
            <time>{formatTime(message.createdAt)}</time>
          </div>
          <p>{message.text}</p>
        </article>
      ))}
    </div>
  );
}

function ChatLog({ messages }) {
  const logRef = useRef(null);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="chatLog" ref={logRef}>
      {messages.length === 0 && <EmptyText text="아직 메시지가 없습니다." />}
      {messages.map((message) => (
        <div className={`chatMessage ${message.authorKind === "ai" ? "aiMessage" : ""}`} key={message.id}>
          <div>
            <strong>{message.authorName}</strong>
            <time>{formatTime(message.createdAt)}</time>
          </div>
          <p>{message.text}</p>
        </div>
      ))}
    </div>
  );
}

function MessageForm({ placeholder, onSend, setNotice }) {
  const [text, setText] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const nextText = text.trim();
    if (!nextText) {
      return;
    }
    try {
      await onSend(nextText);
      setText("");
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <form className="messageForm" onSubmit={submit}>
      <input value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} maxLength={500} />
      <button className="primary iconOnly" title="전송" type="submit">
        <Send size={16} />
      </button>
    </form>
  );
}

function Panel({ title, icon, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <header>
        <div>
          {icon}
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function StatusPill({ tone = "neutral", children }) {
  return <span className={`statusPill ${tone}`}>{children}</span>;
}

function EmptyText({ text }) {
  return <p className="emptyText">{text}</p>;
}

function EmptyState({ title, text }) {
  return (
    <section className="emptyState">
      <Square size={24} />
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function readStoredParticipant() {
  try {
    return JSON.parse(localStorage.getItem(PARTICIPANT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readStoredTeacherPassword() {
  try {
    return sessionStorage.getItem(TEACHER_PASSWORD_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
