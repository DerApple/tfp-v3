import { Component, computed, inject } from '@angular/core';
import { Store, Task } from './store';
import { Ui } from './ui';

const W = 200, H = 58, GX = 56, GY = 16;
const ORDER: Record<string, number> = { in_progress: 0, stale: 0, hold: 1, todo: 2, done: 3, dropped: 4 };

/** The dependency graph: one column per layer, arrows point to what a task unblocks. */
@Component({
  selector: 'tf-graph',
  template: `
    <p class="lede">Each column can start once the columns to its left are done. Arrows point from a task to what it unblocks;
      a thick outline means many tasks wait on it. Click a task for details.</p>
    <div class="legend">
      @for (l of legend; track l[0]) {<span><i [attr.data-state]="l[0]"></i>{{ l[1] }}</span>}
    </div>
    <div class="graph panel">
      <svg [attr.width]="layout().width" [attr.height]="layout().height" role="img" aria-label="Dependency graph">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0L10 5L0 10z" class="arrowhead" />
          </marker>
        </defs>
        @for (e of layout().edges; track e.key) {
          <path class="edge" [class.hot]="e.hot" [attr.d]="e.d" marker-end="url(#arrow)" />
        }
        @for (n of layout().nodes; track n.t.id) {
          <g class="node" [attr.data-state]="n.t.state" [class.ready]="n.t.ready && n.t.status === 'todo'" [class.mine]="n.t.owner === store.me() && n.t.status === 'in_progress'"
             [attr.transform]="'translate(' + n.x + ',' + n.y + ')'" (click)="ui.open(n.t.id)" (keydown.enter)="ui.open(n.t.id)" tabindex="0" role="button" [attr.aria-label]="n.t.id + ': ' + n.t.title">
            <title>{{ n.t.id }}: {{ n.t.title }}</title>
            <rect [attr.width]="W" [attr.height]="H" rx="10" [attr.stroke-width]="1 + Math.min(n.t.dependents, 5) * 0.5" />
            @if (n.t.health) { <rect class="stripe" [attr.data-h]="n.t.health" width="5" [attr.height]="H" rx="2" /> }
            <text x="14" y="23" class="t1">{{ clip(n.t.title, 25) }}</text>
            <text x="14" y="43" class="t2">{{ clip(sub(n.t), 30) }}</text>
          </g>
        }
      </svg>
    </div>
  `,
})
export class GraphView {
  store = inject(Store);
  ui = inject(Ui);
  W = W;
  H = H;
  Math = Math;
  legend = [
    ['todo', 'waiting'],
    ['ready', 'ready'],
    ['in_progress', 'in progress'],
    ['hold', 'needs a human / stale'],
    ['done', 'done'],
  ];

  readonly layout = computed(() => {
    const ts = this.store.tasks();
    const cols = new Map<number, Task[]>();
    for (const t of ts) cols.set(t.level, [...(cols.get(t.level) ?? []), t]);
    const pos = new Map<string, { x: number; y: number }>();
    let rows = 1;
    for (const [lv, items] of cols) {
      items.sort((a, b) => (ORDER[a.state] ?? 3) - (ORDER[b.state] ?? 3) || b.dependents - a.dependents || a.id.localeCompare(b.id));
      items.forEach((t, r) => pos.set(t.id, { x: 12 + lv * (W + GX), y: 12 + r * (H + GY) }));
      rows = Math.max(rows, items.length);
    }
    const nodes = ts.map((t) => ({ t, ...pos.get(t.id)! }));
    const edges = ts.flatMap((t) =>
      t.deps
        .filter((d) => pos.has(d))
        .map((d) => {
          const a = pos.get(d)!, b = pos.get(t.id)!;
          const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x - 2, y2 = b.y + H / 2;
          return {
            key: d + '>' + t.id,
            hot: this.store.byId().get(d)?.status !== 'done' && t.status !== 'done',
            d: `M${x1} ${y1} C${x1 + GX / 2} ${y1} ${x2 - GX / 2} ${y2} ${x2} ${y2}`,
          };
        }),
    );
    const width = 24 + (Math.max(0, ...cols.keys()) + 1) * (W + GX) - GX;
    return { nodes, edges, width, height: 24 + rows * (H + GY) - GY };
  });

  clip(s: string, n: number) {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
  }

  sub(t: Task) {
    if (t.state === 'hold') return 'needs a human';
    if (t.state === 'stale') return `stale · ${t.owner}`;
    if (t.status === 'in_progress') return t.owner;
    if (t.status === 'done') return `done · ${t.owner}`;
    if (t.status === 'dropped') return 'dropped';
    if (t.ready) return 'ready';
    const by = this.store.byId();
    return 'waits for ' + t.deps.filter((d) => by.get(d)?.status !== 'done').join(', ');
  }
}
