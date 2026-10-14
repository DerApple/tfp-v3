import { Component, computed, effect, inject, signal } from '@angular/core';
import { AgentsView } from './agents';
import { BoardView } from './board';
import { outcome, ActionDialog } from './dialog';
import { TaskDrawer } from './drawer';
import { TaskEditor } from './editor';
import { GraphView } from './graph';
import { SplitDialog } from './split';
import { Job, Store, openAssumptions } from './store';
import { Ui, View } from './ui';
import { AgoPipe, plural } from './util';
import { ActivityView, AssumptionsView, ReposView } from './views';

type Theme = 'system' | 'light' | 'dark';

@Component({
  selector: 'app-root',
  imports: [AgoPipe, BoardView, GraphView, AgentsView, ActivityView, AssumptionsView, ReposView, TaskDrawer, ActionDialog, TaskEditor, SplitDialog],
  template: `
    <header class="hero">
      <div class="hero-in">
        <div class="hero-top">
          <p class="cmd"><span class="prompt">$</span> python tasks.py next</p>
          <div class="hero-tools">
            @if (local(); as l) {
              <span class="where" [title]="l.root">
                <b>{{ l.name }}</b>
                @if (board(); as b) { <span class="mono">{{ b.ref }} @ {{ b.head }}</span> }
              </span>
              <button class="ghost-light" (click)="store.refresh()" [title]="'Fetches every ' + (store.state()?.interval ?? 20) + 's. Click to fetch now.'">
                updated {{ store.state()?.fetched_at || board()?.generated_at | ago: store.now() }}
              </button>
              <button class="ghost-light" (click)="ui.act('act_as', { who: l.acting_as || '' })" title="Who your actions are recorded as">
                you are <b>{{ l.me }}</b>
              </button>
            }
            <button class="ghost-light theme" (click)="cycleTheme()" [title]="'Light or dark: ' + (theme() === 'system' ? 'follows your system' : theme()) + '. Click to change.'">
              {{ theme() === 'system' ? 'auto' : theme() }}
            </button>
          </div>
        </div>

        <h1>{{ headline() }}</h1>

        @if (board()) {
          <div class="hero-next">
            @if (store.mine()[0]; as t) {
              <span class="label">You are on</span>
              <button class="next-task" (click)="ui.open(t.id)"><span class="mono">{{ t.id }}</span> {{ t.title }}</button>
              <button class="btn tone-go" (click)="ui.act('done', { id: t.id })">Mark done</button>
              <button class="btn ghost-on-dark" (click)="ui.act('release', { id: t.id })">Release</button>
            } @else if (board()!.frozen) {
              <span class="label">Board frozen</span>
              <span class="frozen-why">{{ board()!.frozen }}</span>
              <button class="btn tone-go" (click)="ui.act('unfreeze')">Unfreeze</button>
            } @else if (next(); as t) {
              <span class="label">Next up</span>
              <button class="next-task" (click)="ui.open(t.id)"><span class="mono">{{ t.id }}</span> {{ t.title }}</button>
              <button class="btn tone-go" (click)="ui.act('claim', { id: t.id })">Claim it myself</button>
              @if (!running().length) {
                <button class="btn ghost-on-dark" (click)="ui.act('agents_start')">Let agents do it</button>
              }
            } @else if (inProgress().length) {
              <span class="label">Waiting for</span>
              @for (t of inProgress(); track t.id) {
                <button class="next-task" (click)="ui.open(t.id)"><span class="mono">{{ t.id }}</span> {{ t.owner }}</button>
              }
            } @else if (counts().total && counts().done === counts().total) {
              <span class="label">Nothing left</span>
              <button class="btn ghost-on-dark" (click)="ui.act('new')">Add a task</button>
            }
          </div>

          <div class="progress" role="img" [attr.aria-label]="counts().done + ' of ' + counts().total + ' done'">
            <i class="p-done" [style.width.%]="pct(counts().done)"></i>
            <i class="p-work" [style.width.%]="pct(counts().working)"></i>
            <i class="p-bad" [style.width.%]="pct(counts().stale + counts().human)"></i>
          </div>
          <p class="hero-stats">
            <span><b>{{ counts().done }}</b>/{{ counts().total }} done</span>
            <span><b>{{ counts().working }}</b> in progress</span>
            <span><b>{{ counts().ready }}</b> ready</span>
            <span><b>{{ counts().waiting }}</b> waiting</span>
            @if (counts().stale) { <span class="warn"><b>{{ counts().stale }}</b> stale</span> }
            @if (counts().human) { <span class="warn"><b>{{ counts().human }}</b> {{ counts().human === 1 ? 'needs' : 'need' }} a human</span> }
            <span title="The longest chain of unfinished tasks that depend on each other: at least this many rounds to go">longest chain to go: <b>{{ board()!.critical_path }}</b></span>
          </p>
        }
      </div>
    </header>

    <nav class="tabs" aria-label="Views">
      <div class="tabs-in">
        @for (v of views(); track v.key) {
          <button [class.on]="ui.view() === v.key" (click)="ui.go(v.key)" [attr.aria-current]="ui.view() === v.key ? 'page' : null">
            {{ v.label }}@if (v.badge) {<span class="badge" [class.alert]="v.alert">{{ v.badge }}</span>}
          </button>
        }
        <span class="grow"></span>
        <details class="menu">
          <summary>Board actions</summary>
          <div class="menu-list" (click)="closeMenu($event)">
            <button (click)="ui.act('new')"><b>New task</b><span>Add work to the board</span></button>
            @if (board()?.frozen) {
              <button (click)="ui.act('unfreeze')"><b>Unfreeze the board</b><span>Agents claim tasks again</span></button>
            } @else {
              <button (click)="ui.act('freeze')"><b>Freeze the board</b><span>No new claims while you change the plan</span></button>
            }
            <button (click)="ui.act('check')"><b>Check the board</b><span>Unknown dependencies, cycles, broken fields</span></button>
            <button (click)="ui.act('pull')"><b>Pull</b><span>Bring this clone up to date with main</span></button>
            <button (click)="ui.act('claim', {})"><b>Claim the best ready task</b><span>Whatever <code>tasks.py next</code> puts first</span></button>
          </div>
        </details>
      </div>
    </nav>

    <main>
      @if (store.offline(); as o) {
        <div class="banner bad"><b>No connection.</b> {{ o }}</div>
      }
      @if (store.state()?.error; as e) {
        <div class="banner warn"><b>Showing the last known board.</b> {{ e }}</div>
      }
      @if (local(); as l) {
        @if (l.merge_state) {
          <div class="banner bad">
            <b>Your clone is in the middle of a {{ l.merge_state }}</b> with conflicts in {{ l.conflicted.join(', ') || 'no files' }}.
            Resolve them in a terminal (<code>git status</code>), or start over with “Start over from main” on your task.
          </div>
        }
        @if (l.behind && !l.merge_state) {
          <div class="banner">
            Your clone is {{ plural(l.behind, 'commit') }} behind {{ l.upstream }}. Actions pull first anyway.
            <button class="btn small" (click)="ui.act('pull')">Pull now</button>
          </div>
        }
        @if (l.dirty.length && store.mine().length) {
          <div class="banner">
            <b>Uncommitted changes</b> in {{ plural(l.dirty.length, 'file') }}. Commit them before marking your task done.
          </div>
        }
        @if (!l.upstream) {
          <div class="banner warn">
            Branch <b>{{ l.branch }}</b> has no upstream, so this shows your local board and actions don’t push.
            Switch to the shared branch (usually main) to work with the team.
          </div>
        }
      }
      @if (board()?.problems?.length) {
        <div class="banner bad">
          <b>The board has {{ plural(board()!.problems.length, 'problem') }}:</b>
          <ul>@for (p of board()!.problems; track p) {<li>{{ p }}</li>}</ul>
        </div>
      }

      @if (!board() && !store.offline()) {
        <p class="loading">Reading the board…</p>
      } @else {
        @switch (ui.view()) {
          @case ('board') { <tf-board /> }
          @case ('graph') { <tf-graph /> }
          @case ('agents') { <tf-agents /> }
          @case ('activity') { <tf-activity /> }
          @case ('assumptions') { <tf-assumptions /> }
          @case ('repos') { <tf-repos /> }
        }
      }
    </main>

    <tf-drawer />
    <tf-dialog />
    <tf-editor />
    <tf-split />

    <div class="console" [class.open]="ui.console()">
      <button class="console-toggle" (click)="ui.console.set(!ui.console())" [attr.aria-expanded]="ui.console()">
        @if (store.state()?.busy) { <span class="spin" aria-hidden="true"></span> Running… }
        @else { Commands run here@if (store.jobs().length) { <span class="badge">{{ store.jobs().length }}</span> } }
      </button>
      @if (ui.console()) {
        <div class="console-body">
          <p class="muted small">Every action runs the real command in {{ local()?.root }}, one at a time. Newest first.</p>
          @for (j of jobsDesc(); track j.id) {
            <details class="job" [attr.data-s]="j.state" [open]="$first">
              <summary>
                <span class="job-state">{{ j.state === 'ok' ? '✓' : j.state === 'failed' ? '✕' : '…' }}</span>
                <span class="mono">{{ j.display }}</span>
                <span class="muted">{{ j.queued_at | ago: store.now() }}</span>
              </summary>
              <p class="job-out"><b>{{ out(j) }}</b></p>
              @if (j.output.trim() && j.output.trim() !== out(j)) { <pre class="output">{{ j.output }}</pre> }
            </details>
          } @empty {
            <p class="muted">Nothing yet. Whatever you do on this page shows up here with the command it ran.</p>
          }
        </div>
      }
    </div>
  `,
})
export class App {
  store = inject(Store);
  ui = inject(Ui);
  plural = plural;
  readonly board = this.store.board;
  readonly local = this.store.local;
  readonly counts = this.store.counts;
  readonly theme = signal<Theme>(this.loadTheme());
  readonly running = computed(() => (this.local()?.agents ?? []).filter((a) => a.alive));
  readonly next = computed(() => this.store.ranked()[0] ?? null);
  readonly inProgress = computed(() => this.store.tasks().filter((t) => t.status === 'in_progress').slice(0, 4));
  readonly jobsDesc = computed(() => [...this.store.jobs()].reverse());

  readonly headline = computed(() => {
    const b = this.board();
    if (!b) return 'Reading the board…';
    const c = this.counts();
    if (!c.total) return 'The board is empty. Add the first task.';
    if (c.done === c.total) return 'Everything is done.';
    const parts = [
      c.ready ? `${c.ready} ready` : 'Nothing ready',
      c.working ? `${c.working} in progress` : 'nobody working',
    ];
    let s = parts.join(', ') + '.';
    if (c.human) s += ` ${c.human} ${c.human === 1 ? 'needs' : 'need'} a human.`;
    else if (c.stale) s += ` ${c.stale} stale.`;
    return s;
  });

  readonly views = computed(() => {
    const c = this.counts();
    const nAssume = this.store.tasks().reduce((n, t) => n + openAssumptions(t).length, 0);
    const alive = this.running().length;
    const v: { key: View; label: string; badge?: string | number; alert?: boolean }[] = [
      { key: 'board', label: 'Board', badge: c.human || undefined, alert: !!c.human },
      { key: 'graph', label: 'Dependencies' },
      { key: 'agents', label: 'Agents', badge: alive ? `${alive} here` : undefined },
      { key: 'activity', label: 'Activity' },
      { key: 'assumptions', label: 'Assumptions', badge: nAssume || undefined },
    ];
    if (this.local()?.repos || this.board()?.sync) v.push({ key: 'repos', label: 'Repos' });
    return v;
  });

  constructor() {
    effect(() => {
      const t = this.theme();
      if (t === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('tfp-theme', t); } catch {}
    });
    effect(() => {
      const b = this.board();
      const c = this.counts();
      document.title = b ? `${c.human ? '⚠ ' : ''}${c.done}/${c.total} · ${this.local()?.name ?? 'tfp'}` : 'TFP';
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.ui.task() && !document.querySelector('dialog[open]')) this.ui.task.set(null);
    });
  }

  private loadTheme(): Theme {
    try {
      const t = localStorage.getItem('tfp-theme') ?? localStorage.getItem('taskflow-theme');  // before the rename to TFP
      if (t === 'light' || t === 'dark') return t;
    } catch {}
    return 'system';
  }

  cycleTheme() {
    this.theme.update((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  }

  pct(n: number) {
    return (100 * n) / Math.max(this.counts().total, 1);
  }

  out(j: Job) {
    return outcome(j).line;
  }

  closeMenu(e: Event) {
    if ((e.target as HTMLElement).closest('button')) (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
  }
}
