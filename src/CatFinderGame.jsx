import { Heart, RefreshCcw, Search, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import puzzleImage from "../assets/hidden-cats-puppies-dense.webp";
import {
  CAT_TARGETS,
  INITIAL_LIVES,
  createInitialCatFinderState,
  resolveCatFinderClick,
} from "./catFinderGame.js";

const STATUS_TEXT = {
  playing: "고양이를 찾는 중",
  won: "성공! 고양이 4마리를 모두 찾았습니다.",
  lost: "게임 오버. 다시 도전해 보세요.",
};

export function CatFinderGame() {
  const [game, setGame] = useState(() => createInitialCatFinderState());
  const foundCount = game.foundTargetIds.length;
  const resultTone = game.status === "won" ? "won" : game.status === "lost" ? "lost" : "playing";
  const lifeSlots = useMemo(() => Array.from({ length: INITIAL_LIVES }, (_, index) => index), []);

  const handleImageClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };

    setGame((current) => resolveCatFinderClick(current, point));
  };

  const resetGame = () => {
    setGame(createInitialCatFinderState());
  };

  return (
    <main className="catFinderPage">
      <header className="catFinderHeader">
        <div className="catFinderTitle">
          <span className="catFinderEyebrow">
            <Search size={16} />
            숨은 고양이 찾기
          </span>
          <h1>강아지들 사이의 고양이 4마리</h1>
        </div>
        <div className="catFinderStats" aria-label="게임 상태">
          <span className="catFinderStat">
            <Trophy size={17} />
            {foundCount}/{CAT_TARGETS.length}
          </span>
          <span className="catFinderLives" aria-label={`생명력 ${game.lives}`}>
            {lifeSlots.map((slot) => (
              <Heart
                key={slot}
                className={slot < game.lives ? "lifeIcon" : "lifeIcon empty"}
                size={18}
                fill="currentColor"
              />
            ))}
          </span>
          <button type="button" onClick={resetGame}>
            <RefreshCcw size={16} />
            다시 시작
          </button>
        </div>
      </header>

      <section className="catFinderStage" aria-label="고양이 찾기 게임">
        <button
          type="button"
          className={`catFinderCanvas ${game.status !== "playing" ? "locked" : ""}`}
          onClick={handleImageClick}
          aria-label="고양이 찾기 그림"
        >
          <img src={puzzleImage} alt="수많은 강아지들 사이에 고양이 네 마리가 숨어 있는 그림" draggable="false" />
          {game.markers.map((marker) => (
            <span
              className={`catFinderMarker ${marker.kind}`}
              key={marker.id}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              aria-hidden="true"
            >
              {marker.kind === "hit" ? "O" : "X"}
            </span>
          ))}
        </button>

        <div className={`catFinderResult ${resultTone}`} role="status">
          {STATUS_TEXT[game.status]}
        </div>
      </section>
    </main>
  );
}
