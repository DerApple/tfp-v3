import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { outcome } from './dialog';
import { Job, Store } from './store';
import { Ui } from './ui';

interface Sub {
  id: string;
  title: string;
  deps: string;
  goal: string;
  criteria: string;
}

const blank = (): Sub => ({ id: '', title: '', deps: '', goal: '', criteria: '' });

/** Split a too-big task into 2-6 subtasks (`tasks.py split <id> --from <file>`). */
@Component({
  selector: 'tf-split',
  imports: [FormsModule],
  template: `
    <dialog #dlg class="dlg wide" (close)="closed()" (cancel)="$event.preventDefault(); close()">
      @if (ui.split(); as id) {
        <form class="dlg-body" (ngSubmit)="submit()">
          <header>
            <h2>Split {{ id }}</h2>
            <button type="button" class="x" (click)="close()" aria-label="Close">×</button>
          </header>
          <p class="explain">
            Describe the remaining work as 2–6 subtasks. They inherit this task’s dependencies; {{ id }} then waits for them
            and whoever claims it afterwards only integrates and verifies. Work so far goes to wip/{{ id }} for the subtasks.
            Subtasks can’t be split again.
          </p>
          @for (s of subs(); track $index; let i = $index) {
            <fieldset class="sub">
              <legend>Subtask {{ i + 1 }}</legend>
              <div class="grid2">
                <label class="fld"><span>Title</span><input [name]="'t' + i" [(ngModel)]="s.title" (ngModelChange)="touch()" /></label>
                <label class="fld"><span>Id</span><input class="mono" [name]="'i' + i" [(ngModel)]="s.id" (ngModelChange)="touch()" placeholder="{{ id }}-part" /></label>
              </div>
              <label class="fld"><span>Also waits for <i>(other subtask ids, comma-separated)</i></span>
                <input class="mono" [name]="'d' + i" [(ngModel)]="s.deps" (ngModelChange)="touch()" /></label>
              <label class="fld"><span>Goal</span><textarea rows="2" [name]="'g' + i" [(ngModel)]="s.goal" (ngModelChange)="touch()"></textarea></label>
              <label class="fld"><span>Acceptance criteria <i>(one per line)</i></span>
                <textarea rows="3" [name]="'c' + i" [(ngModel)]="s.criteria" (ngModelChange)="touch()"></textarea></label>
              @if (subs().length > 2) {
                <button type="button" class="link" (click)="remove(i)">Remove subtask {{ i + 1 }}</button>
              }
            </fieldset>
          }
          @if (subs().length < 6) {
            <button type="button" class="btn ghost" (click)="add()">Add a subtask</button>
          }
          <label class="fld"><span>What is done so far</span>
            <textarea name="note" rows="2" [(ngModel)]="note"></textarea></label>
          @if (problem()) {<p class="bad small">{{ problem() }}</p>}
          <div class="cli"><span class="prompt">$</span> python tasks.py split {{ id }} --from subtasks.md{{ note ? ' --note "…"' : '' }}</div>
          @if (job(); as j) {
            <div class="result" [class.good]="res()?.good === true" [class.bad]="res()?.good === false"><b>{{ res()?.line }}</b></div>
            @if (j.output) {<pre class="output">{{ j.output }}</pre>}
          }
          <footer>
            @if (job()?.state === 'ok') {
              <button type="button" class="btn" (click)="close()">Close</button>
            } @else {
              <button type="button" class="btn ghost" (click)="close()">Cancel</button>
              <button type="submit" class="btn tone-caution" [disabled]="!!problem() || busy()">{{ busy() ? 'Splitting…' : 'Split' }}</button>
            }
          </footer>
        </form>
      }
    </dialog>
  `,
})
export class SplitDialog {
  ui = inject(Ui);
  private store = inject(Store);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  readonly subs = signal<Sub[]>([blank(), blank()]);
  readonly version = signal(0);
  readonly busy = signal(false);
  readonly job = signal<Job | null>(null);
  readonly res = computed(() => (this.job() ? outcome(this.job()!) : null));
  note = '';

  readonly problem = computed(() => {
    this.version();
    const subs = this.subs();
    const ids = subs.map((s) => s.id.trim());
    if (subs.some((s) => !s.title.trim() || !s.id.trim())) return 'Every subtask needs a title and an id.';
    const bad = ids.find((i) => !/^[a-z0-9][a-z0-9-]*$/.test(i));
    if (bad) return `“${bad}” is not a valid id (a-z, 0-9, -).`;
    const dup = ids.find((i, n) => ids.indexOf(i) !== n || this.store.byId().has(i));
    if (dup) return `The id “${dup}” is used twice or exists already.`;
    return '';
  });

  constructor() {
    effect(() => {
      const id = this.ui.split();
      const el = this.dlg().nativeElement;
      if (!id) {
        if (el.open) el.close();
        return;
      }
      this.subs.set([blank(), blank()]);
      this.note = '';
      this.job.set(null);
      if (!el.open) el.showModal();
    });
  }

  touch() {
    this.version.update((v) => v + 1);
  }

  add() {
    this.subs.update((s) => [...s, blank()]);
  }

  remove(i: number) {
    this.subs.update((s) => s.filter((_, n) => n !== i));
  }

  async submit() {
    const id = this.ui.split();
    if (!id || this.problem()) return;
    const text = this.subs()
      .map((s) => {
        const crit = s.criteria.split('\n').map((l) => l.trim().replace(/^-\s*(\[.?\]\s*)?/, '')).filter(Boolean);
        return [
          `## ${s.id.trim()}: ${s.title.trim()}`,
          s.deps.trim() ? `deps: ${s.deps.split(',').map((d) => d.trim()).filter(Boolean).join(', ')}` : '',
          s.goal.trim(),
          ...crit.map((c) => `- [ ] ${c}`),
        ].filter(Boolean).join('\n');
      })
      .join('\n');
    this.busy.set(true);
    try {
      const { job, done } = await this.store.run('split', { id, text: text + '\n', note: this.note });
      this.job.set(job);
      this.job.set(await done);
    } finally {
      this.busy.set(false);
    }
  }

  close() {
    this.ui.split.set(null);
  }

  closed() {
    if (this.ui.split()) this.ui.split.set(null);
  }
}
