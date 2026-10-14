import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LiveAgent, Store, Task, openAssumptions } from './store';
import { Ui } from './ui';
import { AgoPipe, dur, plural } from './util';

@Component({
  selector: 'tf-card',
  imports: [AgoPipe],
  template: `
    @let t = task();
    <button class="card" [attr.data-state]="t.state" [attr.data-h]="t.health" [class.next]="next()" [class.mine]="t.owner === store.me() && t.status === 'in_progress'" (click)="ui.open(t.id)">
      <span class="card-top">
        <span class="mono id">{{ t.id }}</span>
        @if (next()) { <span class="tag next">next up</span> }
        @if (t.owner === store.me() && t.status === 'in_progress') { <span class="tag mine">yours</span> }
        @if (t.stale) { <span class="tag bad">stale</span> }
      </span>
      <span class="card-title">{{ t.title }}</span>
      @switch (t.state) {
        @case ('in_progress') {
          <span class="card-who">{{ t.owner }}</span>
          @if (live()?.doing; as d) { <span class="doing mono">{{ d }}</span> }
        }
        @case ('stale') { <span class="card-who">{{ t.owner }} went quiet {{ t.seen_at | ago: store.now() }}</span> }
        @case ('hold') { <span class="card-why">{{ t.hold || 'depends on dropped ' + t.orphaned.join(', ') }}</span> }
        @case ('todo') {
          @if (!t.ready) { <span class="card-why">waits for {{ waitsFor() }}</span> }
        }
      }
      <span class="card-meta">
        @if (t.dependents) { <span title="Open tasks that wait on this one">unblocks {{ t.dependents }}</span> }
        @if (t.prio !== 2) { <span>prio {{ t.prio }}</span> }
        @if (time()) { <span>{{ time() }}</span> }
        @if (t.attempts > 1) { <span>attempt {{ t.attempts }}</span> }
        @if (open(t); as n) { <span title="Assumptions waiting for a human to confirm or reject">{{ n }} assumed</span> }
      </span>
    </button>
  `,
})
export class TaskCard {
  readonly open = (t: Task) => openAssumptions(t).length;
  store = inject(Store);
  ui = inject(Ui);
  task = input.required<Task>();
  next = input(false);
  live = input<LiveAgent | undefined>();
  waitsFor = computed(() => {
    const by = this.store.byId();
    return this.task().deps.filter((d) => by.get(d)?.status !== 'done').join(', ');
  });
  time = computed(() => {
    const t = this.task();
    if (t.status === 'done' && t.claimed_at && t.done_at) return dur(t.done_at - t.claimed_at);
    if (t.status === 'in_progress' && t.claimed_at) return dur(this.store.now() - t.claimed_at);
    return '';
  });
}

interface Column { key: string; title: string; help: string; empty: string; tasks: Task[] }

@Component({
  selector: 'tf-board',
  imports: [TaskCard, FormsModule],
  template: `
    <div class="toolbar">
      <input class="search" type="search" placeholder="Filter by id, title or owner" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Filter tasks" />
      <label class="toggle"><input type="checkbox" [ngModel]="onlyMine()" (ngModelChange)="onlyMine.set($event)" /> Only mine</label>
      <span class="grow"></span>
      <button class="btn" (click)="ui.act('new')">New task</button>
    </div>
    <div class="columns">
      @for (c of columns(); track c.key) {
        <section class="col" [attr.data-col]="c.key">
          <header>
            <h3>{{ c.title }} <span class="count">{{ c.tasks.length }}</span></h3>
            <p>{{ c.help }}</p>
          </header>
          <div class="col-body">
            @for (t of c.tasks; track t.id) {
              <tf-card [task]="t" [next]="c.key === 'ready' && $first && !store.board()?.frozen" [live]="live().get(t.id)" />
            } @empty {
              <p class="empty">{{ c.empty }}</p>
            }
          </div>
        </section>
      }
    </div>
    @if (dropped().length) {
      <details class="dropped">
        <summary>{{ dropped().length }} dropped {{ dropped().length === 1 ? 'task' : 'tasks' }} (no longer part of the plan)</summary>
        <div class="dropped-list">
          @for (t of dropped(); track t.id) {
            <button class="chip" data-state="dropped" (click)="ui.open(t.id)">{{ t.id }} · {{ t.title }}</button>
          }
        </div>
      </details>
    }
  `,
})
export class BoardView {
  store = inject(Store);
  ui = inject(Ui);
  readonly q = signal('');
  readonly onlyMine = signal(false);

  readonly live = computed(() => {
    const m = new Map<string, LiveAgent>();
    for (const a of this.store.board()?.agents ?? []) if (a.task) m.set(a.task, a);
    return m;
  });

  private filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const me = this.store.me();
    return this.store.tasks().filter(
      (t) =>
        (!q || `${t.id} ${t.title} ${t.owner}`.toLowerCase().includes(q)) &&
        (!this.onlyMine() || t.owner === me),
    );
  });

  readonly dropped = computed(() => this.filtered().filter((t) => t.state === 'dropped'));

  readonly columns = computed<Column[]>(() => {
    const ts = this.filtered();
    const ids = new Set(ts.map((t) => t.id));
    const by = (f: (t: Task) => boolean) => ts.filter(f);
    const human = by((t) => t.state === 'hold');
    const cols: Column[] = [];
    if (human.length)
      cols.push({ key: 'human', title: 'Needs a human', help: 'Agents leave these alone until someone decides.', empty: '', tasks: human });
    const waiting = by((t) => t.state === 'todo' && !t.ready);
    cols.push(
      {
        key: 'ready',
        title: 'Ready',
        help: 'Nothing blocks them. Agents take the top one first.',
        empty: waiting.length ? 'Nothing ready: everything open waits for work in progress.' : 'Nothing ready.',
        tasks: this.store.ranked().filter((t) => ids.has(t.id) && !t.stale),
      },
      {
        key: 'progress',
        title: 'In progress',
        help: 'Claimed. A stale one lost its owner and can be taken over.',
        empty: 'Nobody is working on anything.',
        tasks: by((t) => t.state === 'in_progress' || t.state === 'stale').sort((a, b) => +b.stale - +a.stale || (a.claimed_at ?? 0) - (b.claimed_at ?? 0)),
      },
      {
        key: 'waiting',
        title: 'Waiting',
        help: 'Become ready when their dependencies are done.',
        empty: 'No task waits for another.',
        tasks: waiting.sort((a, b) => a.level - b.level || b.dependents - a.dependents),
      },
      {
        key: 'done',
        title: 'Done',
        help: 'On main. Change them with a follow-up task.',
        empty: 'Nothing finished yet.',
        tasks: by((t) => t.state === 'done').sort((a, b) => (b.done_at ?? 0) - (a.done_at ?? 0)),
      },
    );
    return cols;
  });

  plural = plural;
}
