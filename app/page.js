"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Trophy, RotateCcw, Shuffle, Trash2, Undo2 } from "lucide-react";
import { motion } from "framer-motion";

const SIZES = [8, 16, 32, 64];

function makeEmptyEntrants(size) {
  return Array.from({ length: size }, (_, i) => "");
}

function makeInitialRounds(entrants) {
  const firstRound = [];

  for (let i = 0; i < entrants.length; i += 2) {
    firstRound.push({
      a: entrants[i],
      b: entrants[i + 1],
      winner: null,
    });
  }

  const rounds = [firstRound];
  let matchCount = firstRound.length / 2;

  while (matchCount >= 1) {
    rounds.push(
      Array.from({ length: matchCount }, () => ({
        a: null,
        b: null,
        winner: null,
      }))
    );

    matchCount = matchCount / 2;
  }

  return rounds;
}

function roundName(index, totalRounds) {
  const remaining = totalRounds - index;

  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semi-Finals";
  if (remaining === 3) return "Quarter-Finals";

  return `Round ${index + 1}`;
}

function findCurrentMatch(rounds) {
  for (let r = 0; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].length; m++) {
      const match = rounds[r][m];

      if (match.a && match.b && !match.winner) {
        return {
          roundIndex: r,
          matchIndex: m,
          match,
        };
      }
    }
  }

  return null;
}

function rebuildDownstream(rounds) {
  const updated = rounds.map((round) =>
    round.map((match) => ({ ...match }))
  );

  for (let r = 0; r < updated.length - 1; r++) {
    for (let m = 0; m < updated[r].length; m++) {
      const nextMatchIndex = Math.floor(m / 2);
      const slot = m % 2 === 0 ? "a" : "b";

      updated[r + 1][nextMatchIndex][slot] =
        updated[r][m].winner;
    }
  }

  return updated;
}

export default function GreatBritishBracket() {
  const [screen, setScreen] = useState("setup");
  const [size, setSize] = useState(16);

  const [subtitle, setSubtitle] = useState("Best...");

  const [entrants, setEntrants] = useState(
    makeEmptyEntrants(16)
  );

  const [rounds, setRounds] = useState(() =>
    makeInitialRounds(makeEmptyEntrants(16))
  );

  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(
      "great-british-bracket-state"
    );

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setScreen(parsed.screen || "setup");
        setSize(parsed.size || 16);
        setSubtitle(parsed.subtitle || "Best...");
        setEntrants(parsed.entrants || makeEmptyEntrants(16));
        setRounds(
          parsed.rounds ||
            makeInitialRounds(makeEmptyEntrants(16))
        );

        setHistory(parsed.history || []);
      } catch {
        // Ignore invalid saved data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "great-british-bracket-state",
      JSON.stringify({
        screen,
        size,
        subtitle,
        entrants,
        rounds,
        history,
      })
    );
  }, [screen, size, subtitle, entrants, rounds, history]);

  const champion = useMemo(() => {
    return rounds[rounds.length - 1]?.[0]?.winner || null;
  }, [rounds]);

  const currentMatch = useMemo(() => {
    return findCurrentMatch(rounds);
  }, [rounds]);

  function changeSize(newSize) {
    setSize(newSize);

    const nextEntrants = makeEmptyEntrants(newSize);

    setEntrants(nextEntrants);
    setRounds(makeInitialRounds(nextEntrants));
    setHistory([]);
  }

  function updateEntrant(index, value) {
    const updated = [...entrants];
    updated[index] = value;
    setEntrants(updated);
  }

  function shuffleEntrants() {
    const shuffled = [...entrants].sort(
      () => Math.random() - 0.5
    );

    setEntrants(shuffled);
  }

  function clearEntrants() {
    setEntrants(makeEmptyEntrants(size));
  }

  function generateBracket() {
    const cleaned = entrants.map(
      (name, i) => name.trim() || `Entrant ${i + 1}`
    );

    setEntrants(cleaned);
    setRounds(makeInitialRounds(cleaned));
    setHistory([]);
    setScreen("bracket");
  }

  function resetBracketKeepEntrants() {
    setRounds(makeInitialRounds(entrants));
    setHistory([]);
  }

  function pickGuidedWinner(winner) {
    if (!currentMatch) return;

    setRounds((current) => {
      setHistory((previous) => [...previous, current]);

      const updated = current.map((round) =>
        round.map((match) => ({ ...match }))
      );

      const { roundIndex, matchIndex } = currentMatch;

      updated[roundIndex][matchIndex].winner = winner;

      return rebuildDownstream(updated);
    });
  }

  function undoLastPick() {
    setHistory((previous) => {
      if (previous.length === 0) return previous;

      const lastState =
        previous[previous.length - 1];

      setRounds(lastState);

      return previous.slice(0, -1);
    });
  }

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8">

        <header className="mb-10 text-center">

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 shadow-sm"
          >
            <Trophy size={16} />
            What's All This Then?
          </motion.div>

          <h1 className="mt-6 text-5xl font-black tracking-tight text-zinc-900 sm:text-7xl">
            The Great British Bracket
          </h1>

        </header>

        {screen === "setup" ? (

          <main className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">

            <div className="mb-8">

              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500">
                Bracket Size
              </p>

              <div className="flex flex-wrap gap-2">

                {SIZES.map((option) => (
                  <button
                    key={option}
                    onClick={() => changeSize(option)}
                    className={`rounded-2xl px-5 py-3 font-bold transition ${
                      size === option
                        ? "bg-red-500 text-white"
                        : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}

              </div>
            </div>

            <div className="mb-8">

              <label className="block">

                <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-500">
                  Bracket Theme
                </span>

                <input
                  value={subtitle}
                  onChange={(e) =>
                    setSubtitle(e.target.value)
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-stone-50 px-4 py-4 text-xl font-bold text-zinc-900 outline-none focus:border-red-300"
                />

              </label>

            </div>

            <div className="mb-6 flex flex-wrap gap-2">

              <button
                onClick={shuffleEntrants}
                className="rounded-2xl bg-zinc-100 px-4 py-3 font-semibold hover:bg-zinc-200"
              >
                <Shuffle className="mr-2 inline-block" size={16} />
                Shuffle
              </button>

              <button
                onClick={clearEntrants}
                className="rounded-2xl bg-zinc-100 px-4 py-3 font-semibold hover:bg-zinc-200"
              >
                <Trash2 className="mr-2 inline-block" size={16} />
                Clear
              </button>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              {entrants.map((entrant, index) => (
                <input
                  key={index}
                  value={entrant}
                  onChange={(e) =>
                    updateEntrant(index, e.target.value)
                  }
                  placeholder={`Entrant ${index + 1}`}
                  className="rounded-2xl border border-zinc-200 bg-stone-50 px-4 py-4 text-zinc-900 outline-none focus:border-red-300"
                />
              ))}

            </div>

            <button
              onClick={generateBracket}
              className="mt-8 w-full rounded-2xl bg-red-500 px-6 py-5 text-xl font-black text-white transition hover:bg-red-400"
            >
              Generate Bracket
            </button>

          </main>

        ) : (

          <main>

            <div className="mb-8 text-center">

              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Current Debate
              </p>

              <h2 className="mt-2 text-4xl font-black text-zinc-900">
                {subtitle}
              </h2>

            </div>

            <div className="mb-5 flex flex-wrap justify-center gap-2">

              <button
                onClick={() => setScreen("setup")}
                className="rounded-2xl bg-white px-4 py-3 font-semibold shadow"
              >
                Edit entrants
              </button>

              <button
                onClick={undoLastPick}
                disabled={history.length === 0}
                className="rounded-2xl bg-white px-4 py-3 font-semibold shadow disabled:opacity-40"
              >
                <Undo2 className="mr-2 inline-block" size={16} />
                Undo
              </button>

              <button
                onClick={resetBracketKeepEntrants}
                className="rounded-2xl bg-white px-4 py-3 font-semibold shadow"
              >
                <RotateCcw className="mr-2 inline-block" size={16} />
                Reset
              </button>

            </div>

            <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-xl">

              <div className="overflow-x-auto pb-4">

                <div
                  className="grid min-w-max gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${rounds.length}, minmax(200px, 1fr))`,
                  }}
                >

                  {rounds.map((round, roundIndex) => (

                    <section
                      key={roundIndex}
                      className="flex flex-col gap-4"
                    >

                      <h2 className="text-center text-xs font-black uppercase tracking-widest text-zinc-500">
                        {roundName(
                          roundIndex,
                          rounds.length
                        )}
                      </h2>

                      <div className="flex flex-1 flex-col justify-around gap-3">

                        {round.map((match, matchIndex) => {

                          const isCurrent =
                            currentMatch &&
                            currentMatch.roundIndex ===
                              roundIndex &&
                            currentMatch.matchIndex ===
                              matchIndex;

                          return (

                            <div
                              key={matchIndex}
                              className={`rounded-2xl border p-2 ${
                                isCurrent
                                  ? "border-red-300 bg-red-50"
                                  : "border-zinc-200 bg-stone-50"
                              }`}
                            >

                              {["a", "b"].map((slot) => {

                                const name = match[slot];

                                const isWinner =
                                  match.winner === name &&
                                  name;

                                return (

                                  <div
                                    key={slot}
                                    className={`mb-1 rounded-xl px-3 py-3 text-sm font-bold last:mb-0 ${
                                      !name
                                        ? "bg-zinc-100 text-zinc-400"
                                        : isWinner
                                        ? "bg-red-500 text-white"
                                        : "bg-white text-zinc-900"
                                    }`}
                                  >
                                    {name || "TBD"}
                                  </div>

                                );
                              })}

                            </div>

                          );
                        })}

                      </div>

                    </section>

                  ))}

                </div>

              </div>

            </section>

            <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">

              {champion ? (

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >

                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                    Champion
                  </p>

                  <p className="mt-3 text-5xl font-black text-zinc-900">
                    {champion}
                  </p>

                  <p className="mt-3 text-zinc-500">
                    Settled, then.
                  </p>

                </motion.div>

              ) : currentMatch ? (

                <>

                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">

                    {roundName(
                      currentMatch.roundIndex,
                      rounds.length
                    )}

                    {" · "}

                    Match {currentMatch.matchIndex + 1}

                  </p>

                  <h2 className="mt-3 text-3xl font-black text-zinc-900">
                    Choose the winner
                  </h2>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">

                    <button
                      onClick={() =>
                        pickGuidedWinner(
                          currentMatch.match.a
                        )
                      }
                      className="rounded-3xl border border-zinc-200 bg-stone-50 px-5 py-10 text-2xl font-black text-zinc-900 transition hover:bg-red-500 hover:text-white"
                    >
                      {currentMatch.match.a}
                    </button>

                    <button
                      onClick={() =>
                        pickGuidedWinner(
                          currentMatch.match.b
                        )
                      }
                      className="rounded-3xl border border-zinc-200 bg-stone-50 px-5 py-10 text-2xl font-black text-zinc-900 transition hover:bg-red-500 hover:text-white"
                    >
                      {currentMatch.match.b}
                    </button>

                  </div>

                </>

              ) : (

                <p>No available matchup.</p>

              )}

            </section>

          </main>

        )}

      </div>
    </div>
  );
}