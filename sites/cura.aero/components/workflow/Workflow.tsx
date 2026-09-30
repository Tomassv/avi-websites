import type { Workflow as WorkflowData, WorkflowNode } from "@/lib/content-types";
import { safeIconName } from "@/lib/safe-url";
import { Rich } from "@/components/shared/Rich";

type Props = {
  data: WorkflowData;
  id?: string;
  className?: string;
  /** Extra class for particular nodes, by spine index (e.g. the wide drafting node). */
  nodeClass?: Record<number, string>;
};

/**
 * The animated workflow diagram: spine nodes joined by connectors, optionally followed by a
 * fork. A 2-column fork uses the .wf-branch markup (home hero); wider forks use .wf6-*.
 * Animation is attached separately (FlowAnimation) by the element id.
 */
export function Workflow({ data, id, className, nodeClass = {} }: Props) {
  const items: React.ReactNode[] = [];
  data.nodes.forEach((node, i) => {
    if (i > 0) items.push(<Conn key={`c${i}`} />);
    items.push(<Node key={`n${i}`} node={node} extraClass={nodeClass[i]} />);
  });
  if (data.branch) {
    items.push(
      data.branch.length === 2 ? <PairBranch key="b" cols={data.branch} /> : <MultiBranch key="b" cols={data.branch} />,
    );
  }
  return (
    <div className={["wf", className].filter(Boolean).join(" ")} id={id}>
      {items}
    </div>
  );
}

function Conn() {
  return (
    <div className="wf-conn">
      <span className="wf-conn-fill"></span>
    </div>
  );
}

function Chain({ nodes }: { nodes: WorkflowNode[] }) {
  return nodes.flatMap((node, i) => [
    ...(i > 0 ? [<Conn key={`c${i}`} />] : []),
    <Node key={`n${i}`} node={node} />,
  ]);
}

function PairBranch({ cols }: { cols: WorkflowNode[][] }) {
  return (
    <div className="wf-branch">
      <div className="wf-fork">
        <span className="wf-fork-stem"></span>
        <span className="wf-fork-bar-l"></span>
        <span className="wf-fork-bar-r"></span>
        <span className="wf-fork-drop-l"></span>
        <span className="wf-fork-drop-r"></span>
      </div>
      <div className="wf-row">
        {cols.map((col, i) => (
          <div className="wf-col" key={i}>
            <Chain nodes={col} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiBranch({ cols }: { cols: WorkflowNode[][] }) {
  const cellClass = (i: number) => (i === 0 ? "first" : i === cols.length - 1 ? "last" : "mid");
  return (
    <div className="wf6-branch">
      <div className="wf6-fork">
        <span className="wf6-stem"></span>
        {cols.map((_, i) => (
          <span className={`wf6-cell ${cellClass(i)}`} key={i}>
            <span className="wf6-bar"></span>
            <span className="wf6-drop"></span>
          </span>
        ))}
      </div>
      <div className="wf6-row">
        {cols.map((col, i) => (
          <div className="wf6-col" key={i}>
            <Chain nodes={col} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({ node, extraClass }: { node: WorkflowNode; extraClass?: string }) {
  const icon = safeIconName(node.icon);
  const nodeClass = ["wf-node", extraClass, node.cond && "wf-cond"].filter(Boolean).join(" ");
  const hasBody = !node.headOnly && (node.body !== undefined || node.list !== undefined);
  return (
    <div className={nodeClass}>
      {node.badges && (
        <div className="wf-badges">
          <span className="wf-badge wf-badge--done">
            <span className="material-icons-round">check</span>
            {node.badges.done}
          </span>
          <span className="wf-badge wf-badge--prog">
            <span className="material-icons-round">cached</span>
            {node.badges.prog}
          </span>
        </div>
      )}
      <div className={node.headOnly ? "wf-card wf-card--head-only" : "wf-card"}>
        <div className="wf-card-head">
          <span className={node.cond ? "wf-chip wf-chip--cond" : "wf-chip"}>
            {icon && <span className="material-icons-round">{icon}</span>}
          </span>
          <span className="wf-card-title">
            <Rich text={node.title} />
          </span>
          {node.actor !== undefined && (
            <span className={node.actorCura ? "wf-actor wf-actor--cura" : "wf-actor"}>
              {node.actor}
              {node.actorHandoff && (
                <>
                  {" "}
                  <span className="wf-actor--cura">{node.actorHandoff}</span>
                </>
              )}
            </span>
          )}
        </div>
        {hasBody && <div className="wf-card-divider"></div>}
        {hasBody && node.list && (
          <ul className="wf-src-list">
            {node.list.map((item, i) => (
              <li key={i}>
                <Rich text={item} />
              </li>
            ))}
          </ul>
        )}
        {hasBody && !node.list && (
          <div className="wf-card-body">
            <Rich text={node.body} />
          </div>
        )}
      </div>
      <span className="wf-port"></span>
    </div>
  );
}
