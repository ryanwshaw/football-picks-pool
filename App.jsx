import { useState, useEffect, useCallback, useRef } from "react";

/* ─── DATA ──────────────────────────────────────────────── */

const WEEKS = {
  1: {
    label: "Week 1",
    startDate: "2026-09-09",
    games: [
      { id: 1, away: "Patriots", home: "Seahawks", spread: "SEA -3.5", day: "Wed 9/9", time: "8:20 PM", tv: "NBC" },
      { id: 2, away: "49ers", home: "Rams", spread: "LAR -2.5", day: "Thu 9/10", time: "8:35 PM", tv: "Netflix" },
      { id: 3, away: "Bears", home: "Panthers", spread: "CHI -2.5", day: "Sun 9/13", time: "1:00 PM", tv: "FOX" },
      { id: 4, away: "Buccaneers", home: "Bengals", spread: "CIN -3.5", day: "Sun 9/13", time: "1:00 PM", tv: "FOX" },
      { id: 5, away: "Saints", home: "Lions", spread: "DET -6.5", day: "Sun 9/13", time: "1:00 PM", tv: "FOX" },
      { id: 6, away: "Bills", home: "Texans", spread: "BUF -1.5", day: "Sun 9/13", time: "1:00 PM", tv: "CBS" },
      { id: 7, away: "Ravens", home: "Colts", spread: "BAL -3.5", day: "Sun 9/13", time: "1:00 PM", tv: "CBS" },
      { id: 8, away: "Browns", home: "Jaguars", spread: "JAX -7.5", day: "Sun 9/13", time: "1:00 PM", tv: "CBS" },
      { id: 9, away: "Falcons", home: "Steelers", spread: "PIT -2.5", day: "Sun 9/13", time: "1:00 PM", tv: "FOX" },
      { id: 10, away: "Jets", home: "Titans", spread: "TEN -1.5", day: "Sun 9/13", time: "1:00 PM", tv: "CBS" },
      { id: 11, away: "Cardinals", home: "Chargers", spread: "LAC -11.5", day: "Sun 9/13", time: "4:25 PM", tv: "CBS" },
      { id: 12, away: "Dolphins", home: "Raiders", spread: "LVR -3.5", day: "Sun 9/13", time: "4:25 PM", tv: "FOX" },
      { id: 13, away: "Packers", home: "Vikings", spread: "GB -1.5", day: "Sun 9/13", time: "4:25 PM", tv: "CBS" },
      { id: 14, away: "Commanders", home: "Eagles", spread: "PHI -5.5", day: "Sun 9/13", time: "4:25 PM", tv: "FOX" },
      { id: 15, away: "Cowboys", home: "Giants", spread: "DAL -2.5", day: "Sun 9/13", time: "8:20 PM", tv: "NBC" },
      { id: 16, away: "Broncos", home: "Chiefs", spread: "KC -2.5", day: "Mon 9/14", time: "8:15 PM", tv: "ESPN" },
    ],
  },
};

// Generate placeholder weeks 2–18 so the selector is ready.
// Replace each entry with real game data as the season progresses.
for (let w = 2; w <= 18; w++) {
  WEEKS[w] = {
    label: `Week ${w}`,
    startDate: null,
    games: [],
  };
}

const ALL_WEEK_NUMS = Array.from({ length: 18 }, (_, i) => i + 1);
const PLAYERS = ["Ryan", "Catherine"];
const PLAYER_COLORS = { Ryan: "#3b82f6", Catherine: "#e879a0" };
const STORAGE_KEY = "pickem-pool-v3";

/* ─── PERSISTENCE ───────────────────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function defaultWeekState(weekNum) {
  const games = WEEKS[weekNum]?.games || [];
  const picks = {};
  PLAYERS.forEach(p => {
    picks[p] = {};
    games.forEach(g => { picks[p][g.id] = { team: null, confidence: null }; });
  });
  return { picks, winners: {} };
}

/* ─── HELPERS ───────────────────────────────────────────── */

function weekIsComplete(weekState, weekNum) {
  const games = WEEKS[weekNum]?.games || [];
  if (games.length === 0) return false;
  return games.every(g => weekState?.winners?.[g.id]);
}

function weekHasGames(weekNum) {
  return (WEEKS[weekNum]?.games || []).length > 0;
}

function calcWeekScore(player, weekState, weekNum) {
  let s = 0;
  const winners = weekState?.winners || {};
  const picks = weekState?.picks || {};
  Object.entries(winners).forEach(([gid, w]) => {
    const p = picks[player]?.[gid];
    if (p?.team === w && p?.confidence) s += p.confidence;
  });
  return s;
}

function detectCurrentWeek() {
  // Find the latest week with games whose start date is <= today
  const today = new Date().toISOString().slice(0, 10);
  let current = 1;
  ALL_WEEK_NUMS.forEach(w => {
    if (WEEKS[w].startDate && WEEKS[w].startDate <= today) current = w;
  });
  return current;
}

function getInitialState() {
  const saved = load();
  if (saved) return saved;
  return {
    viewingWeek: detectCurrentWeek(),
    weeks: { 1: defaultWeekState(1) },
    activePlayer: null,
  };
}

/* ─── APP ───────────────────────────────────────────────── */

export default function App() {
  const [state, setState] = useState(getInitialState);
  const [tab, setTab] = useState("picks");
  const [expandedConf, setExpandedConf] = useState(null);
  const weekStripRef = useRef(null);

  const persist = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const week = state.viewingWeek;
  const weekData = state.weeks?.[week] || defaultWeekState(week);
  const games = WEEKS[week]?.games || [];
  const numGames = games.length;
  const { picks, winners } = weekData;
  const { activePlayer } = state;
  const currentWeek = detectCurrentWeek();
  const isComplete = weekIsComplete(weekData, week);

  // Scroll current week into view on mount
  useEffect(() => {
    if (weekStripRef.current) {
      const btn = weekStripRef.current.querySelector(`[data-week="${week}"]`);
      if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  /* ─── derived ─── */
  const usedConfidence = (player) => {
    const s = new Set();
    if (!picks[player]) return s;
    Object.values(picks[player]).forEach(p => { if (p.confidence) s.add(p.confidence); });
    return s;
  };

  const weekScore = (player) => calcWeekScore(player, weekData, week);

  const seasonScore = (player) => {
    let total = 0;
    ALL_WEEK_NUMS.forEach(w => {
      if (state.weeks?.[w]) total += calcWeekScore(player, state.weeks[w], w);
    });
    return total;
  };

  const totalAssigned = (player) => {
    let s = 0;
    if (!picks[player]) return s;
    Object.values(picks[player]).forEach(p => { if (p.confidence) s += p.confidence; });
    return s;
  };

  const picksComplete = (player) => {
    if (!picks[player] || games.length === 0) return false;
    return games.every(g => {
      const p = picks[player][g.id];
      return p?.team && p?.confidence;
    });
  };

  const seasonRecord = (player) => {
    let wins = 0, losses = 0;
    ALL_WEEK_NUMS.forEach(w => {
      const wd = state.weeks?.[w];
      if (!wd) return;
      const wGames = WEEKS[w]?.games || [];
      wGames.forEach(g => {
        const winner = wd.winners?.[g.id];
        const pick = wd.picks?.[player]?.[g.id];
        if (winner && pick?.team) {
          if (pick.team === winner) wins++;
          else losses++;
        }
      });
    });
    return { wins, losses };
  };

  /* ─── actions ─── */
  const setViewWeek = (w) => {
    persist(s => ({ ...s, viewingWeek: w }));
    setExpandedConf(null);
  };

  const setPlayer = (p) => persist(s => ({ ...s, activePlayer: p }));

  const pickTeam = (gameId, team) => {
    if (!activePlayer) return;
    persist(s => {
      const wd = s.weeks?.[week] || defaultWeekState(week);
      const ws = { ...wd };
      ws.picks = { ...ws.picks };
      ws.picks[activePlayer] = { ...ws.picks[activePlayer] };
      ws.picks[activePlayer][gameId] = { ...ws.picks[activePlayer][gameId], team };
      return { ...s, weeks: { ...s.weeks, [week]: ws } };
    });
    setExpandedConf(gameId);
  };

  const pickConfidence = (gameId, val) => {
    if (!activePlayer) return;
    persist(s => {
      const wd = s.weeks?.[week] || defaultWeekState(week);
      const ws = { ...wd };
      ws.picks = { ...ws.picks };
      ws.picks[activePlayer] = { ...ws.picks[activePlayer] };
      Object.keys(ws.picks[activePlayer]).forEach(gid => {
        if (ws.picks[activePlayer][gid].confidence === val && String(gid) !== String(gameId)) {
          ws.picks[activePlayer][gid] = { ...ws.picks[activePlayer][gid], confidence: null };
        }
      });
      ws.picks[activePlayer][gameId] = { ...ws.picks[activePlayer][gameId], confidence: val };
      return { ...s, weeks: { ...s.weeks, [week]: ws } };
    });
    setExpandedConf(null);
  };

  const setWinner = (gameId, team) => {
    persist(s => {
      const wd = s.weeks?.[week] || defaultWeekState(week);
      const ws = { ...wd, winners: { ...wd.winners, [gameId]: team } };
      return { ...s, weeks: { ...s.weeks, [week]: ws } };
    });
  };

  const clearWinner = (gameId) => {
    persist(s => {
      const wd = s.weeks?.[week] || defaultWeekState(week);
      const ws = { ...wd, winners: { ...wd.winners } };
      delete ws.winners[gameId];
      return { ...s, weeks: { ...s.weeks, [week]: ws } };
    });
  };

  const resetWeek = () => {
    if (!window.confirm(`Reset ALL picks and results for Week ${week}?`)) return;
    persist(s => ({ ...s, weeks: { ...s.weeks, [week]: defaultWeekState(week) } }));
  };

  /* grouping by day */
  const grouped = [];
  let lastDay = null;
  games.forEach(g => {
    if (g.day !== lastDay) { grouped.push({ type: "day", day: g.day }); lastDay = g.day; }
    grouped.push({ type: "game", game: g });
  });

  const ryanWeek = weekScore("Ryan");
  const cathWeek = weekScore("Catherine");
  const ryanSeason = seasonScore("Ryan");
  const cathSeason = seasonScore("Catherine");
  const gamesDecided = Object.keys(winners).length;
  const usedSet = usedConfidence(activePlayer);

  return (
    <div className="app">
      <style>{componentCSS}</style>

      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-left">
          <span className="logo">🏈</span>
          <div>
            <h1 className="title">Pick'em Pool</h1>
            <p className="season">2026 NFL Season</p>
          </div>
        </div>
        <div className="season-scores">
          <div className="season-pill">
            <span className="sp-name">Ryan</span>
            <span className="sp-num" style={{ color: PLAYER_COLORS.Ryan }}>{ryanSeason}</span>
          </div>
          <span className="sp-dash">–</span>
          <div className="season-pill">
            <span className="sp-name">Catherine</span>
            <span className="sp-num" style={{ color: PLAYER_COLORS.Catherine }}>{cathSeason}</span>
          </div>
        </div>
      </header>

      {/* ── WEEK SELECTOR ── */}
      <div className="week-strip-wrap">
        <div className="week-strip" ref={weekStripRef}>
          {ALL_WEEK_NUMS.map(w => {
            const hasGames = weekHasGames(w);
            const wd = state.weeks?.[w];
            const done = wd && weekIsComplete(wd, w);
            const isCurrent = w === currentWeek;
            const isViewing = w === week;
            return (
              <button
                key={w}
                data-week={w}
                className={[
                  "week-chip",
                  isViewing ? "viewing" : "",
                  isCurrent && !isViewing ? "current" : "",
                  done ? "done" : "",
                  !hasGames ? "empty" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setViewWeek(w)}
              >
                <span className="wc-num">{w}</span>
                {done && <span className="wc-check">✓</span>}
                {isCurrent && !done && <span className="wc-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── WEEK HEADER BAR ── */}
      <div className="week-header-bar">
        <div className="whb-left">
          <span className="whb-label">{WEEKS[week].label}</span>
          {isComplete && <span className="whb-badge complete">Final</span>}
          {!isComplete && numGames > 0 && <span className="whb-badge live">{gamesDecided}/{numGames} scored</span>}
          {numGames === 0 && <span className="whb-badge upcoming">No games yet</span>}
        </div>
        {numGames > 0 && (
          <div className="whb-week-scores">
            <span style={{ color: PLAYER_COLORS.Ryan, fontWeight: 800 }}>{ryanWeek}</span>
            <span className="whb-sep">–</span>
            <span style={{ color: PLAYER_COLORS.Catherine, fontWeight: 800 }}>{cathWeek}</span>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <nav className="tabs">
        {[["picks","Make Picks"],["results","Standings"],["admin","Score Games"]].map(([k,l]) => (
          <button key={k} className={`tab ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* ── NO GAMES STATE ── */}
      {numGames === 0 && tab !== "results" && (
        <div className="empty">
          <p className="empty-icon">📅</p>
          <p>No games loaded for {WEEKS[week].label} yet.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Add game data to the WEEKS object in App.jsx.</p>
        </div>
      )}

      {/* ───────────── PICKS TAB ───────────── */}
      {tab === "picks" && numGames > 0 && (
        <div className="pane">
          <div className="player-bar">
            <span className="player-bar-label">Picking as:</span>
            <div className="player-btns">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  className={`player-btn ${activePlayer === p ? "selected" : ""}`}
                  style={activePlayer === p ? { background: PLAYER_COLORS[p], borderColor: PLAYER_COLORS[p] } : {}}
                  onClick={() => setPlayer(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            {activePlayer && (
              <span className={`completion ${picksComplete(activePlayer) ? "done" : ""}`}>
                {picksComplete(activePlayer) ? "✓ All picks in" : `${usedSet.size}/${numGames} assigned`}
              </span>
            )}
          </div>

          {!activePlayer && (
            <div className="empty">
              <p className="empty-icon">👆</p>
              <p>Select your name above to start picking.</p>
            </div>
          )}

          {activePlayer && (
            <div className="games-list">
              {grouped.map((item, i) => {
                if (item.type === "day") return <div key={item.day} className="day-header">{item.day}</div>;
                const g = item.game;
                const pick = picks[activePlayer]?.[g.id] || {};
                const showConf = expandedConf === g.id && pick.team;
                const winner = winners[g.id];
                const locked = !!winner;
                return (
                  <div key={g.id} className={`game-card ${locked ? "locked" : ""}`}>
                    <div className="game-meta">
                      <span className="game-time">{g.time} · {g.tv}</span>
                      <span className="spread-badge">{g.spread}</span>
                    </div>
                    <div className="matchup-row">
                      <button
                        className={`team-btn ${pick.team === g.away ? "picked" : ""} ${locked && winner === g.away ? "winner" : ""} ${locked && winner !== g.away && pick.team === g.away ? "lost" : ""}`}
                        onClick={() => !locked && pickTeam(g.id, g.away)}
                        disabled={locked}
                      >{g.away}</button>
                      <span className="at-sign">@</span>
                      <button
                        className={`team-btn ${pick.team === g.home ? "picked" : ""} ${locked && winner === g.home ? "winner" : ""} ${locked && winner !== g.home && pick.team === g.home ? "lost" : ""}`}
                        onClick={() => !locked && pickTeam(g.id, g.home)}
                        disabled={locked}
                      >{g.home}</button>
                    </div>
                    {pick.confidence && !showConf && (
                      <div className="conf-display">
                        <span className="conf-number">{pick.confidence}</span>
                        <span className="conf-pts">pts</span>
                        {!locked && <button className="edit-link" onClick={() => setExpandedConf(g.id)}>change</button>}
                      </div>
                    )}
                    {showConf && (
                      <div className="conf-picker">
                        <p className="conf-picker-label">Assign confidence (1–{numGames})</p>
                        <div className="conf-grid">
                          {Array.from({ length: numGames }, (_, i) => i + 1).map(v => {
                            const isUsed = usedSet.has(v) && pick.confidence !== v;
                            const isCurrent = pick.confidence === v;
                            return (
                              <button key={v} disabled={isUsed}
                                className={`conf-btn ${isUsed ? "used" : ""} ${isCurrent ? "current" : ""}`}
                                onClick={() => pickConfidence(g.id, v)}
                              >{v}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!pick.team && !showConf && <p className="pick-prompt">Tap a team to pick</p>}
                    {pick.team && !pick.confidence && !showConf && (
                      <button className="assign-btn" onClick={() => setExpandedConf(g.id)}>Assign confidence points →</button>
                    )}
                  </div>
                );
              })}
              <div style={{ height: 40 }} />
            </div>
          )}
        </div>
      )}

      {/* ───────────── RESULTS TAB ───────────── */}
      {tab === "results" && (
        <div className="pane">
          {/* Season overview */}
          <div className="season-overview">
            <h3 className="so-title">Season Totals</h3>
            <div className="big-scores">
              {PLAYERS.map(p => {
                const ss = seasonScore(p);
                const rec = seasonRecord(p);
                const leading = p === "Ryan" ? ryanSeason > cathSeason : cathSeason > ryanSeason;
                return (
                  <div key={p} className={`big-card ${leading ? "leading" : ""}`} style={{ borderColor: PLAYER_COLORS[p] }}>
                    <p className="big-name">{p}</p>
                    <p className="big-num" style={{ color: PLAYER_COLORS[p] }}>{ss}</p>
                    <p className="big-record">{rec.wins}–{rec.losses}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week-by-week breakdown */}
          <div className="week-breakdown">
            <h3 className="wb-title">Week-by-Week</h3>
            <div className="wb-table">
              <div className="wb-head">
                <span className="wb-col-wk">Week</span>
                <span className="wb-col-pl">Ryan</span>
                <span className="wb-col-pl">Catherine</span>
                <span className="wb-col-st">Status</span>
              </div>
              {ALL_WEEK_NUMS.map(w => {
                if (!weekHasGames(w)) return null;
                const wd = state.weeks?.[w] || defaultWeekState(w);
                const r = calcWeekScore("Ryan", wd, w);
                const c = calcWeekScore("Catherine", wd, w);
                const done = weekIsComplete(wd, w);
                const wWinners = Object.keys(wd.winners || {}).length;
                const wGames = WEEKS[w].games.length;
                const isViewing = w === week;
                return (
                  <div key={w} className={`wb-row ${isViewing ? "wb-viewing" : ""}`} onClick={() => { setViewWeek(w); setTab("picks"); }}>
                    <span className="wb-col-wk">{w}</span>
                    <span className="wb-col-pl" style={{ color: r >= c && (r > 0 || c > 0) ? PLAYER_COLORS.Ryan : "#5a6b80", fontWeight: r > c ? 800 : 400 }}>{r}</span>
                    <span className="wb-col-pl" style={{ color: c >= r && (r > 0 || c > 0) ? PLAYER_COLORS.Catherine : "#5a6b80", fontWeight: c > r ? 800 : 400 }}>{c}</span>
                    <span className={`wb-col-st ${done ? "st-done" : ""}`}>
                      {done ? "✓ Final" : `${wWinners}/${wGames}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current week detail */}
          {numGames > 0 && (
            <>
              <h3 className="detail-title">{WEEKS[week].label} Detail</h3>
              <div className="results-table">
                <div className="results-head">
                  <span className="col-game">Matchup</span>
                  <span className="col-player">Ryan</span>
                  <span className="col-player">Catherine</span>
                  <span className="col-result">Winner</span>
                </div>
                {games.map(g => {
                  const rp = picks["Ryan"]?.[g.id] || {};
                  const cp = picks["Catherine"]?.[g.id] || {};
                  const w = winners[g.id];
                  const rOk = w && rp.team === w;
                  const cOk = w && cp.team === w;
                  return (
                    <div key={g.id} className="results-row">
                      <span className="col-game">{g.away} @ {g.home}</span>
                      <span className={`col-player ${w ? (rOk ? "correct" : "wrong") : ""}`}>
                        {rp.team ? `${rp.team} (${rp.confidence || "?"})` : "—"}
                      </span>
                      <span className={`col-player ${w ? (cOk ? "correct" : "wrong") : ""}`}>
                        {cp.team ? `${cp.team} (${cp.confidence || "?"})` : "—"}
                      </span>
                      <span className={`col-result ${w ? "decided" : ""}`}>{w || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────────── ADMIN TAB ───────────── */}
      {tab === "admin" && numGames > 0 && (
        <div className="pane">
          <p className="admin-hint">
            Tap the winning team for each completed game. {isComplete ? "All games scored — week is final." : ""}
          </p>
          <div className="games-list">
            {grouped.map((item, i) => {
              if (item.type === "day") return <div key={item.day} className="day-header">{item.day}</div>;
              const g = item.game;
              const w = winners[g.id];
              return (
                <div key={g.id} className="game-card admin-card">
                  <div className="game-meta">
                    <span className="game-time">{g.day} · {g.time}</span>
                    <span className="spread-badge">{g.spread}</span>
                  </div>
                  <div className="matchup-row">
                    <button className={`team-btn admin-btn ${w === g.away ? "admin-winner" : ""}`}
                      onClick={() => setWinner(g.id, g.away)}>{w === g.away && "✓ "}{g.away}</button>
                    <span className="at-sign">@</span>
                    <button className={`team-btn admin-btn ${w === g.home ? "admin-winner" : ""}`}
                      onClick={() => setWinner(g.id, g.home)}>{w === g.home && "✓ "}{g.home}</button>
                    {w && <button className="clear-btn" onClick={() => clearWinner(g.id)}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="admin-footer">
            <button className="reset-btn" onClick={resetWeek}>Reset Week {week}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── STYLES ────────────────────────────────────────────── */

const componentCSS = `
  .app {
    max-width: 640px;
    margin: 0 auto;
    min-height: 100vh;
    background: #0f1623;
  }

  /* Header */
  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 18px 14px;
    background: linear-gradient(135deg, #162032 0%, #0f1623 100%);
    border-bottom: 1px solid #1c2840;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo { font-size: 30px; }
  .title { font-size: 19px; font-weight: 900; color: #f0f4f8; letter-spacing: -0.03em; line-height: 1.1; }
  .season { font-size: 12px; color: #5a6b80; font-weight: 500; margin-top: 2px; }
  .season-scores { display: flex; align-items: center; gap: 8px; }
  .season-pill { text-align: center; }
  .sp-name { display: block; font-size: 10px; color: #5a6b80; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .sp-num { display: block; font-size: 22px; font-weight: 900; line-height: 1.1; }
  .sp-dash { font-size: 12px; color: #3a4658; font-weight: 700; }

  /* Week strip */
  .week-strip-wrap {
    background: #121b2b;
    border-bottom: 1px solid #1c2840;
    position: relative;
  }
  .week-strip-wrap::after {
    content: '';
    position: absolute; right: 0; top: 0; bottom: 0; width: 32px;
    background: linear-gradient(90deg, transparent, #121b2b);
    pointer-events: none; z-index: 1;
  }
  .week-strip {
    display: flex; gap: 4px; padding: 10px 12px;
    overflow-x: auto; scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .week-strip::-webkit-scrollbar { display: none; }
  .week-chip {
    flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; position: relative;
    width: 42px; height: 42px; border-radius: 10px;
    border: 1.5px solid #1f3050; background: #172035;
    color: #5a6b80; font-size: 12px; font-weight: 600;
    transition: all 0.15s;
  }
  .week-chip:hover { border-color: #2d4a6a; }
  .week-chip.viewing {
    background: #3b82f6; color: #fff;
    border-color: #3b82f6; font-weight: 800;
    box-shadow: 0 0 12px rgba(59,130,246,0.3);
  }
  .week-chip.current {
    border-color: #f59e0b;
  }
  .week-chip.done {
    border-color: #166534;
  }
  .week-chip.done:not(.viewing) {
    background: rgba(34,197,94,0.08);
  }
  .week-chip.empty:not(.viewing) {
    opacity: 0.35;
  }
  .wc-num { line-height: 1; }
  .wc-check {
    font-size: 8px; color: #22c55e; line-height: 1;
    margin-top: 1px;
  }
  .week-chip.viewing .wc-check { color: #bbf7d0; }
  .wc-dot {
    width: 4px; height: 4px; border-radius: 50%;
    background: #f59e0b; margin-top: 2px;
  }

  /* Week header bar */
  .week-header-bar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 18px;
    background: #0f1623;
    border-bottom: 1px solid #1c2840;
  }
  .whb-left { display: flex; align-items: center; gap: 8px; }
  .whb-label { font-size: 15px; font-weight: 800; color: #f0f4f8; }
  .whb-badge {
    font-size: 10px; font-weight: 700; padding: 2px 8px;
    border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em;
  }
  .whb-badge.complete { background: rgba(34,197,94,0.12); color: #22c55e; }
  .whb-badge.live { background: rgba(59,130,246,0.1); color: #60a5fa; }
  .whb-badge.upcoming { background: rgba(90,107,128,0.15); color: #5a6b80; }
  .whb-week-scores { display: flex; align-items: center; gap: 6px; font-size: 18px; }
  .whb-sep { color: #3a4658; font-size: 14px; font-weight: 500; }

  /* Tabs */
  .tabs { display: flex; background: #121b2b; border-bottom: 1px solid #1c2840; }
  .tab {
    flex: 1; padding: 11px 0; text-align: center;
    background: none; border: none;
    font-size: 13px; font-weight: 600; color: #5a6b80;
    border-bottom: 2.5px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: #8b97a8; }
  .tab.active { color: #f0f4f8; border-bottom-color: #3b82f6; }

  /* Player bar */
  .player-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-bottom: 1px solid #1c2840; flex-wrap: wrap;
  }
  .player-bar-label { font-size: 12px; color: #5a6b80; font-weight: 500; }
  .player-btns { display: flex; gap: 6px; }
  .player-btn {
    padding: 8px 20px; border-radius: 8px;
    border: 1.5px solid #2a3548; background: #172035;
    color: #8b97a8; font-size: 14px; font-weight: 700; transition: all 0.15s;
  }
  .player-btn.selected { color: #fff; }
  .player-btn:not(.selected):hover { border-color: #3b5068; }
  .completion { margin-left: auto; font-size: 11px; font-weight: 600; color: #5a6b80; }
  .completion.done { color: #22c55e; }

  .empty { text-align: center; padding: 64px 24px; color: #4a5568; font-size: 14px; }
  .empty-icon { font-size: 42px; margin-bottom: 8px; }

  .games-list { padding: 0 12px 20px; }
  .day-header {
    padding: 16px 4px 6px; font-size: 11px; font-weight: 700;
    color: #5a6b80; text-transform: uppercase; letter-spacing: 0.05em;
  }

  .game-card {
    background: #172035; border-radius: 12px; padding: 14px 16px;
    margin-bottom: 8px; border: 1px solid #1f3050;
    animation: fadeIn 0.2s ease; transition: opacity 0.2s;
  }
  .game-card.locked { opacity: 0.6; }
  .game-meta { display: flex; justify-content: space-between; margin-bottom: 10px; }
  .game-time { font-size: 11px; color: #4a5e74; font-weight: 500; }
  .spread-badge {
    font-size: 11px; font-weight: 700; color: #f59e0b;
    background: rgba(245,158,11,0.1); padding: 2px 8px; border-radius: 4px;
  }

  .matchup-row { display: flex; align-items: center; gap: 8px; }
  .at-sign { font-size: 12px; color: #3a4658; font-weight: 600; }
  .team-btn {
    flex: 1; padding: 11px 8px; border-radius: 8px;
    border: 1.5px solid #253350; background: #0f1a2e;
    color: #7e8fa3; font-size: 14px; font-weight: 600; transition: all 0.15s;
  }
  .team-btn:not(:disabled):hover { border-color: #3b82f6; color: #b0bfd0; }
  .team-btn.picked { background: #22c55e; color: #071a0d; border-color: #22c55e; font-weight: 800; }
  .team-btn.winner { background: #22c55e; color: #071a0d; border-color: #22c55e; font-weight: 800; }
  .team-btn.lost { background: #7f1d1d; color: #fca5a5; border-color: #991b1b; }

  .conf-display {
    display: flex; align-items: center; gap: 6px;
    margin-top: 10px; padding: 6px 12px;
    background: rgba(59,130,246,0.08); border-radius: 8px;
  }
  .conf-number { font-size: 22px; font-weight: 900; color: #3b82f6; }
  .conf-pts { font-size: 12px; color: #5a6b80; }
  .edit-link {
    margin-left: auto; background: none; border: none;
    color: #4a5e74; font-size: 11px; text-decoration: underline;
  }
  .edit-link:hover { color: #8b97a8; }

  .conf-picker {
    margin-top: 10px; padding: 12px;
    background: #0f1a2e; border-radius: 10px;
    animation: slideUp 0.15s ease;
  }
  .conf-picker-label { font-size: 11px; color: #5a6b80; font-weight: 500; margin-bottom: 8px; }
  .conf-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; }
  .conf-btn {
    padding: 9px 0; border-radius: 6px;
    border: 1.5px solid #253350; background: #172035;
    color: #c5d0de; font-size: 13px; font-weight: 700; transition: all 0.12s;
  }
  .conf-btn:not(:disabled):hover { background: #1e3050; border-color: #3b82f6; }
  .conf-btn.used { opacity: 0.2; background: #0a0f1a; color: #3a4658; }
  .conf-btn.current { background: #3b82f6; color: #fff; border-color: #3b82f6; }

  .pick-prompt { margin-top: 8px; font-size: 12px; color: #3a4658; text-align: center; }
  .assign-btn {
    margin-top: 8px; width: 100%; padding: 9px 0; border-radius: 8px;
    border: 1.5px solid rgba(59,130,246,0.3); background: rgba(59,130,246,0.08);
    color: #60a5fa; font-size: 12px; font-weight: 600; transition: background 0.15s;
  }
  .assign-btn:hover { background: rgba(59,130,246,0.15); }

  /* Results - season overview */
  .season-overview { padding: 16px 16px 8px; }
  .so-title { font-size: 13px; font-weight: 700; color: #5a6b80; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .big-scores { display: flex; gap: 12px; }
  .big-card {
    flex: 1; text-align: center; padding: 20px 14px 16px;
    background: #172035; border-radius: 14px;
    border: 2px solid; transition: box-shadow 0.2s;
  }
  .big-card.leading { box-shadow: 0 0 24px -4px rgba(59,130,246,0.2); }
  .big-name { font-size: 14px; font-weight: 700; color: #8b97a8; }
  .big-num { font-size: 44px; font-weight: 900; margin: 4px 0; line-height: 1; }
  .big-record { font-size: 13px; color: #5a6b80; font-weight: 600; margin-top: 4px; }

  /* Week breakdown table */
  .week-breakdown { padding: 12px 16px; }
  .wb-title { font-size: 13px; font-weight: 700; color: #5a6b80; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .wb-table { border-radius: 10px; overflow: hidden; border: 1px solid #1f3050; }
  .wb-head {
    display: flex; padding: 8px 14px;
    background: #172035; font-size: 10px; font-weight: 700;
    color: #5a6b80; text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid #1f3050;
  }
  .wb-row {
    display: flex; align-items: center; padding: 9px 14px;
    border-bottom: 1px solid #131d2f; background: #121b2b;
    cursor: pointer; transition: background 0.12s;
  }
  .wb-row:hover { background: #182740; }
  .wb-row:last-child { border-bottom: none; }
  .wb-row.wb-viewing { background: rgba(59,130,246,0.08); border-left: 3px solid #3b82f6; }
  .wb-col-wk { flex: 0.6; font-size: 13px; font-weight: 700; color: #8b97a8; }
  .wb-col-pl { flex: 1; text-align: center; font-size: 14px; }
  .wb-col-st { flex: 1; text-align: right; font-size: 11px; color: #5a6b80; font-weight: 600; }
  .wb-col-st.st-done { color: #22c55e; }

  /* Detail */
  .detail-title { padding: 16px 16px 8px; font-size: 13px; font-weight: 700; color: #5a6b80; text-transform: uppercase; letter-spacing: 0.04em; }
  .results-table { margin: 0 12px 24px; border-radius: 12px; overflow: hidden; border: 1px solid #1f3050; }
  .results-head {
    display: flex; padding: 10px 14px;
    background: #172035; font-size: 10px; font-weight: 700;
    color: #5a6b80; text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid #1f3050;
  }
  .results-row {
    display: flex; align-items: center; padding: 10px 14px;
    border-bottom: 1px solid #131d2f; background: #121b2b;
  }
  .results-row:last-child { border-bottom: none; }
  .col-game { flex: 2.2; font-size: 12px; color: #8b97a8; }
  .col-player { flex: 1.2; text-align: center; font-size: 11px; color: #5a6b80; }
  .col-player.correct { color: #22c55e; font-weight: 700; }
  .col-player.wrong { color: #ef4444; }
  .col-result { flex: 1; text-align: center; font-size: 12px; color: #4a5e74; }
  .col-result.decided { color: #f0f4f8; font-weight: 700; }

  .admin-hint { padding: 18px 16px 8px; font-size: 13px; color: #5a6b80; }
  .admin-winner {
    background: #16a34a !important; color: #fff !important;
    border-color: #16a34a !important; font-weight: 800 !important;
  }
  .clear-btn {
    background: none; border: none; color: #ef4444;
    font-size: 18px; padding: 4px 10px; transition: color 0.15s; flex-shrink: 0;
  }
  .clear-btn:hover { color: #f87171; }
  .admin-footer { padding: 24px; text-align: center; }
  .reset-btn {
    padding: 10px 28px; border-radius: 8px;
    border: 1.5px solid #dc2626; background: rgba(220,38,38,0.08);
    color: #ef4444; font-size: 13px; font-weight: 600; transition: background 0.15s;
  }
  .reset-btn:hover { background: rgba(220,38,38,0.18); }

  .pane { padding-bottom: 20px; }

  @media (max-width: 480px) {
    .conf-grid { grid-template-columns: repeat(4, 1fr); }
    .header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .season-scores { align-self: flex-end; }
    .col-player { font-size: 10px; }
    .week-chip { width: 38px; height: 38px; font-size: 11px; }
  }
`;
