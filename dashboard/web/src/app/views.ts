import { Component, computed, inject, signal } from '@angular/core';
import { Assumption, FeedEvent, Store } from './store';
import { Ui } from './ui';
import { AgoPipe, stamp } from './util';

const VERBS: Record<string, string> = {
  claim: 'claimed', takeover: 'took over', done: 'finished', release: 'released', redo: 'restarted',
  hold: 'put on hold', unhold: 'took off hold', split: 'split', extend: 'extended', drop: 'dropped',
  undrop: 'brought back', assume: 'recorded an assumption on', confirm: 'confirmed an assumption on',
  reject: 'rejected an assumption on', freeze: 'froze the board', unfreeze: 'unfroze the board',
};

const FILTERS: [string, string, (e: FeedEvent) => boolean][] = [
  ['all', 'Everything', () => true],
  ['flow', 'Claims and finishes', (e) => ['claim', 'done', 'takeover'].includes(e.kind)],
  ['trouble', 'Trouble', (e) => ['takeover', 'release', 'redo', 'hold', 'drop'].includes(e.kind)],
  ['plan', 'Plan changes', (e) => ['hold', 'unhold', 'split', 'drop', 'undrop', 'freeze', 'unfreeze', 'assume', 'confirm', 'reject', 'extend'].includes(e.kind) || /^(new|edit) task:/.test(e.text)],
  ['code', 'Code commits', (e) => e.kind === 'commit'],
];

@Component({
  selector: 'tf-activity',
  imports: [AgoPipe],
  template: `
    <p class="cmd"><span class="prompt">$</span> git log --first-parent {{ store.board()?.ref }}</p>
    <h2>Activity</h2>
    <div class="seg filters" role="tablist">
      @for (f of filters; track f[0]) {
        <button [class.on]="filter() === f[0]" (click)="filter.set(f[0])">{{ f[1] }}</button>
      }
    </div>
    <ol class="feed panel">
      @for (e of events(); track $index) {
        <li [attr.data-k]="e.kind">
          <span class="when" [title]="stamp(e.at)">{{ e.at | ago: store.now() }}</span>
          @if (e.kind === 'commit') {
            <span class="who">{{ e.who }}</span><span class="muted"> committed </span>{{ e.text }}
          } @else {
            <span class="who">{{ e.who }}</span> {{ verb(e.kind) }}&nbsp;@if (e.task) {<button class="link mono" (click)="ui.open(e.task)">{{ e.task }}</button>}
            @if (e.prev) { <span class="muted"> from {{ e.prev }}</span> }
            @if (e.attempt) { <span class="muted"> (attempt {{ e.attempt }})</span> }
          }
        </li>
      } @empty {
        <li class="muted">Nothing here yet.</li>
      }
    </ol>
  `,
})
export class ActivityView {
  store = inject(Store);
  ui = inject(Ui);
  filters = FILTERS;
  stamp = stamp;
  readonly filter = signal('all');
  readonly events = computed(() => {
    const f = FILTERS.find((x) => x[0] === this.filter())![2];
    return (this.store.board()?.feed ?? []).filter(f).slice(0, 200);
  });
  verb(k: string) {
    return VERBS[k] ?? k;
  }
}

@Component({
  selector: 'tf-assumptions',
  template: `
    <p class="cmd"><span class="prompt">$</span> python tasks.py assumptions</p>
    <h2>Assumptions</h2>
    <p class="lede">Decisions agents took without asking anyone, newest first. This is the fastest way to spot a wrong turn.
      Confirm the ones that are right, so only the open ones stay here. Reject a wrong one, then edit the task if it hasn’t
      started, or add a task that changes what was built.</p>
    <div class="btns small" role="group" aria-label="Which assumptions">
      <button class="btn ghost" [attr.aria-pressed]="!all()" (click)="all.set(false)">To review ({{ nOpen() }})</button>
      <button class="btn ghost" [attr.aria-pressed]="all()" (click)="all.set(true)">All ({{ everything().length }})</button>
    </div>
    <ul class="assume-all">
      @for (a of rows(); track a.id + '#' + a.n) {
        <li class="panel" [attr.data-review]="a.review || 'open'">
          <p>{{ a.text }}</p>
          @if (a.review) {
            <p class="small"><b>{{ a.review === 'confirmed' ? 'Confirmed' : 'Rejected' }}</b> by {{ a.reviewed_by }} · {{ a.reviewed_at }}
              @if (a.note) { — {{ a.note }} }</p>
          }
          <div class="row-between">
            <span class="muted small">
              <button class="link mono" (click)="ui.open(a.id)">{{ a.id }}</button> #{{ a.n }} · {{ a.who }} · {{ a.at }}
            </span>
            <span class="btns small">
              @if (!a.review) {
                <button class="btn" (click)="ui.act('confirm', { id: a.id, n: a.n })">Confirm</button>
                <button class="btn ghost" (click)="ui.act('reject', { id: a.id, n: a.n })">Reject…</button>
              }
              @if (editable(a.id)) {
                <button class="btn ghost" (click)="ui.act('edit', { id: a.id })">Edit task</button>
              }
              <button class="btn ghost" (click)="ui.act('followup', { id: a.id })">Add a task to change it</button>
            </span>
          </div>
        </li>
      } @empty {
        <li class="panel empty-state"><p>{{ all() || !everything().length
          ? 'No assumptions recorded. Agents add one whenever they decide something the spec doesn’t say.'
          : 'Nothing to review: every assumption is confirmed or rejected.' }}</p></li>
      }
    </ul>
  `,
})
export class AssumptionsView {
  store = inject(Store);
  ui = inject(Ui);
  readonly all = signal(false);
  readonly everything = computed(() =>
    this.store
      .tasks()
      .flatMap((t) => t.assumptions.map((a): Assumption & { id: string } => ({ ...a, id: t.id })))
      .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id) || b.n - a.n),
  );
  readonly nOpen = computed(() => this.everything().filter((a) => !a.review).length);
  readonly rows = computed(() => (this.all() ? this.everything() : this.everything().filter((a) => !a.review)));
  editable(id: string) {
    const t = this.store.byId().get(id);
    return !!t && (t.status === 'todo' || t.status === 'dropped');
  }
}

@Component({
  selector: 'tf-repos',
  imports: [AgoPipe],
  template: `
    <div class="block-head">
      <div>
        <p class="cmd"><span class="prompt">$</span> python tasks.py repos list</p>
        <h2>Original repos</h2>
        <p class="lede">Folders of this repo that are published to their own repos. Each sync merges outside changes,
          runs the project check, and pushes only if it passes.</p>
      </div>
      <div class="btns">
        <button class="btn tone-go" (click)="ui.act('repos_sync')">Sync now</button>
        <button class="btn" (click)="ui.act('repos_list')">List</button>
        <button class="btn" (click)="ui.act('repos_pull')">Pull outside changes</button>
        <button class="btn" (click)="ui.act('repos_add')">Import a repo</button>
      </div>
    </div>
    @if (sync(); as s) {
      <div class="panel table-wrap">
        <table>
          <thead><tr><th>Folder</th><th>Repo</th><th>Last update</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (r of repos(); track r[0]) {
              <tr>
                <td><b>{{ r[0] }}/</b></td>
                <td class="muted">{{ r[1].url }} ({{ r[1].branch }})</td>
                <td>@if (r[1].pushed_at) { {{ r[1].pushed_at | ago: store.now() }} <span class="muted mono">{{ r[1].commit?.slice(0, 9) }}</span> } @else { <span class="muted">never</span> }</td>
                <td><span class="pill" [attr.data-s]="pill(r[1].result)">{{ r[1].result }}</span></td>
                <td class="muted">{{ r[1].message }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="muted small">Last sync run {{ s.run_at | ago: store.now() }}: {{ s.result }}{{ s.message ? ' · ' + s.message : '' }}</p>
    } @else {
      <div class="panel empty-state">
        <p>No sync has run yet. It runs in GitLab CI every 30 minutes (templates/gitlab-ci-sync.yml) or from a laptop with
          <code>python tasks.py repos sync --every 30m</code>. “Sync now” runs one round from this clone.</p>
      </div>
    }
  `,
})
export class ReposView {
  store = inject(Store);
  ui = inject(Ui);
  readonly sync = computed(() => this.store.board()?.sync ?? null);
  readonly repos = computed(() => Object.entries(this.sync()?.repos ?? {}).sort());
  pill(r?: string) {
    return r === 'pushed' || r === 'up to date' ? 'working' : r === 'check failed' ? 'limited' : 'offline';
  }
}
