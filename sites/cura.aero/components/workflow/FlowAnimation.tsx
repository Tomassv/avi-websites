"use client";

import { useEffect } from "react";

/**
 * Plays a workflow diagram (by element id) once it scrolls into view. Each kind is a
 * line-for-line port of the inline script from the old static page it came from.
 *
 * - "home":   index.html hero. Spine, then the fork, then the two branch nodes; the last
 *             node stays running.
 * - "linear": evidence pages (runFlow). Nodes fire in sequence, each connector filling as
 *             its node completes.
 * - "branch": workflow.html. Spine, fork, then every column's chain with a stagger.
 * - "stack":  workflow.html phone-only stacked flow.
 */
type Props =
  | { kind: "home"; target: string }
  | { kind: "linear"; target: string; startDelay: number }
  | { kind: "branch"; target: string }
  | { kind: "stack"; target: string };

export function FlowAnimation(props: Props) {
  useEffect(() => {
    const wf = document.getElementById(props.target);
    if (!wf) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    let observer: IntersectionObserver | undefined;
    const startWhenVisible = (play: () => void, threshold: number, delay: number) => {
      observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              later(play, delay);
              obs.disconnect();
            }
          });
        },
        { threshold },
      );
      observer.observe(wf);
    };

    if (props.kind === "home") home(wf, reduce, later, startWhenVisible);
    else if (props.kind === "linear") linear(wf, props.startDelay, reduce, later, startWhenVisible);
    else if (props.kind === "branch") branch(wf, reduce, later, startWhenVisible);
    else stack(wf, reduce, later, startWhenVisible);

    return () => {
      observer?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
    // The diagrams are static; run once per mount.
  }, []);
  return null;
}

type Later = (fn: () => void, ms: number) => void;
type Start = (play: () => void, threshold: number, delay: number) => void;

const children = (el: Element, cls: string) => [...el.children].filter((c) => c.classList.contains(cls));

function home(wf: HTMLElement, reduce: boolean, later: Later, start: Start) {
  const nodes = [...wf.querySelectorAll(".wf-node")];
  const spineConn = wf.querySelector(".wf-conn")!;
  const fork = wf.querySelector(".wf-fork")!;

  const STEP = 1500;
  const WORK = 850;
  const FORK = 850;

  function settle() {
    [0, 1, 2].forEach((i) => {
      nodes[i].classList.add("done");
    });
    nodes[3].classList.add("running");
    spineConn.classList.add("done");
    fork.classList.add("done");
  }

  if (reduce) {
    settle();
    return;
  }

  function run(node: Element, at: number, conn: Element | null, stayRunning?: boolean) {
    later(() => {
      node.classList.add("running");
    }, at);
    if (stayRunning) return;
    later(() => {
      node.classList.remove("running");
      node.classList.add("done");
      if (conn) conn.classList.add("done");
    }, at + WORK);
  }

  function play() {
    let t = 550;
    run(nodes[0], t, spineConn);
    t += STEP;
    run(nodes[1], t, null);
    t += STEP;
    later(() => {
      fork.classList.add("done");
    }, t);
    t += FORK;
    run(nodes[2], t, null);
    t += STEP;
    run(nodes[3], t, null, true);
  }

  start(play, 0.25, 350);
}

function linear(wf: HTMLElement, startDelay: number, reduce: boolean, later: Later, start: Start) {
  const STEP = 1150;
  const WORK = 800;
  const nodes = children(wf, "wf-node");
  const conns = children(wf, "wf-conn");

  function settle() {
    nodes.forEach((n) => {
      n.classList.add("done");
    });
    conns.forEach((c) => {
      c.classList.add("done");
    });
  }

  if (reduce) {
    settle();
    return;
  }

  function play() {
    let t = startDelay;
    nodes.forEach((node, i) => {
      const conn = conns[i] || null;
      later(() => {
        node.classList.add("running");
      }, t);
      later(() => {
        node.classList.remove("running");
        node.classList.add("done");
        if (conn) conn.classList.add("done");
      }, t + WORK);
      t += STEP;
    });
  }

  start(play, 0.15, 300);
}

function branch(wf: HTMLElement, reduce: boolean, later: Later, start: Start) {
  // spine = the top-level nodes above the fork + their connectors
  const spineNodes = children(wf, "wf-node");
  const spineConns = children(wf, "wf-conn");
  const fork = wf.querySelector(".wf6-fork")!;
  const cols = [...wf.querySelectorAll(".wf6-col")];

  const STEP = 1200;
  const WORK = 800;
  const FORK = 750;
  const BRANCH_STAGGER = 220;

  // each column is a chain of nodes (condition → reason check → email)
  // separated by connectors; light them up in sequence
  function markCol(col: Element, at: number) {
    const nodes = children(col, "wf-node");
    const conns = children(col, "wf-conn");
    nodes.forEach((node, i) => {
      const begin = at + i * WORK;
      later(() => {
        node.classList.add("running");
      }, begin);
      later(() => {
        node.classList.remove("running");
        node.classList.add("done");
        if (conns[i]) conns[i].classList.add("done");
      }, begin + WORK);
    });
  }

  function settle() {
    spineNodes.forEach((n) => {
      n.classList.add("done");
    });
    spineConns.forEach((c) => {
      c.classList.add("done");
    });
    fork.classList.add("done");
    cols.forEach((col) => {
      [...col.children].forEach((ch) => {
        if (ch.classList.contains("wf-node")) ch.classList.add("done");
        if (ch.classList.contains("wf-conn")) ch.classList.add("done");
      });
    });
  }

  if (reduce) {
    settle();
    return;
  }

  function runNode(node: Element, at: number, conn: Element | null) {
    later(() => {
      node.classList.add("running");
    }, at);
    later(() => {
      node.classList.remove("running");
      node.classList.add("done");
      if (conn) conn.classList.add("done");
    }, at + WORK);
  }

  function play() {
    const n = spineNodes.length;
    let t = 550;
    spineNodes.forEach((node, i) => {
      runNode(node, t, spineConns[i] || null);
      t += STEP;
    });
    const forkAt = 550 + (n - 1) * STEP + WORK + 150;
    later(() => {
      fork.classList.add("done");
    }, forkAt);
    const branchStart = forkAt + FORK;
    cols.forEach((col, i) => {
      markCol(col, branchStart + i * BRANCH_STAGGER);
    });
  }

  start(play, 0.15, 350);
}

function stack(wf: HTMLElement, reduce: boolean, later: Later, start: Start) {
  const nodes = [...wf.querySelectorAll(".wf-node")];
  const conns = [...wf.querySelectorAll(".wf-conn")];
  const STEP = 1100;
  const WORK = 800;

  function settle() {
    nodes.forEach((n) => {
      n.classList.add("done");
    });
    conns.forEach((c) => {
      c.classList.add("done");
    });
  }

  if (reduce) {
    settle();
    return;
  }

  function play() {
    let t = 450;
    nodes.forEach((node, i) => {
      later(() => {
        node.classList.add("running");
      }, t);
      later(() => {
        node.classList.remove("running");
        node.classList.add("done");
        if (conns[i]) conns[i].classList.add("done");
      }, t + WORK);
      t += STEP;
    });
  }

  start(play, 0.2, 300);
}
