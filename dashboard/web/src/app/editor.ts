import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { outcome } from './dialog';
import { Job, Store } from './store';
import { Ui } from './ui';
import { markdown } from './util';

const TEMPLATE = '## Goal\n\n\n## Acceptance criteria\n- [ ] \n\n## Notes\n';
const PROTOCOL = ['status', 'owner', 'lease_until', 'attempts', 'releases', 'hold', 'extended', 'parent', 'subtasks'];

function slug(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}

/** New task / edit task: the front matter as a form, the rest as Markdown with a preview. */
@Component({
  selector: 'tf-editor',
  imports: [FormsModule],
  template: `
    <dialog #dlg class="dlg wide" (close)="closed()" (cancel)="$event.preventDefault(); close()">
      @if (ui.editor(); as r) {
        <form class="dlg-body" (ngSubmit)="save()">
          <header>
            <h2>{{ r.mode === 'new' ? 'New task' : 'Edit ' + r.id }}</h2>
            <button type="button" class="x" (click)="close()" aria-label="Close">×</button>
          </header>
          <p class="explain">
            @if (r.mode === 'new') {
              Agents pick it up as soon as its dependencies are done. Keep it to 30–90 minutes of work with concrete acceptance criteria.
            } @else {
              Agents read a task once, when they claim it. Status, owner and the like are kept as they are on the board.
            }
          </p>
          @if (loading()) {
            <p class="muted">Loading the task from the board…</p>
          } @else {
            <div class="grid2">
              <label class="fld">
                <span>Title<i> required</i></span>
                <input name="title" [ngModel]="title()" (ngModelChange)="onTitle($event)" placeholder="Login endpoint" autofocus />
              </label>
              <label class="fld">
                <span>Id @if (r.mode === 'new') {<i> a-z, 0-9, -</i>}</span>
                <input name="id" class="mono" [ngModel]="id()" (ngModelChange)="idTouched = true; id.set($event)" [readonly]="r.mode === 'edit'" />
                @if (idProblem()) {<small class="bad">{{ idProblem() }}</small>}
              </label>
            </div>
            <div class="fld">
              <span>Depends on</span>
              <div class="chips">
                @for (d of deps(); track d) {
                  <span class="chip">{{ d }}<button type="button" (click)="removeDep(d)" [attr.aria-label]="'Remove ' + d">×</button></span>
                }
                <select name="adddep" [ngModel]="''" (ngModelChange)="addDep($event)" aria-label="Add a dependency">
                  <option value="">+ add a task it waits for</option>
                  @for (t of candidates(); track t.id) {
                    <option [value]="t.id">{{ t.id }} · {{ t.title }}</option>
                  }
                </select>
              </div>
              <small>It becomes ready when all of these are done.</small>
            </div>
            <label class="fld narrow">
              <span>Priority</span>
              <select name="prio" [ngModel]="prio()" (ngModelChange)="prio.set(+$event)">
                <option [value]="1">1 · first among equals</option>
                <option [value]="2">2 · normal</option>
                <option [value]="3">3 · later</option>
              </select>
              <small>Tasks that unblock more work always go first; priority breaks ties.</small>
            </label>
            <div class="fld">
              <span class="row-between">Description
                <span class="seg">
                  <button type="button" [class.on]="!preview()" (click)="preview.set(false)">Write</button>
                  <button type="button" [class.on]="preview()" (click)="preview.set(true)">Preview</button>
                </span>
              </span>
              @if (preview()) {
                <div class="md preview" [innerHTML]="html()"></div>
              } @else {
                <textarea name="body" class="mono" rows="14" [ngModel]="body()" (ngModelChange)="body.set($event)"></textarea>
              }
              <small>Markdown. Checklist items (<code>- [ ]</code>) under “Acceptance criteria” are what “done” means.</small>
            </div>
          }
          <div class="cli"><span class="prompt">$</span> {{ cli() }}</div>
          @if (job(); as j) {
            <div class="result" [class.good]="res()?.good === true" [class.bad]="res()?.good === false"><b>{{ res()?.line }}</b></div>
            @if (j.state === 'failed') {<pre class="output">{{ j.output }}</pre>}
          }
          @if (error()) {<div class="result bad"><b>{{ error() }}</b></div>}
          <footer>
            @if (job()?.state === 'ok') {
              <button type="button" class="btn" (click)="close()">Close</button>
            } @else {
              <button type="button" class="btn ghost" (click)="close()">Cancel</button>
              <button type="submit" class="btn tone-go" [disabled]="!valid() || busy()">
                {{ busy() ? 'Saving…' : r.mode === 'new' ? 'Create and push' : 'Save and push' }}
              </button>
            }
          </footer>
        </form>
      }
    </dialog>
  `,
})
export class TaskEditor {
  ui = inject(Ui);
  private store = inject(Store);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  readonly id = signal('');
  readonly title = signal('');
  readonly deps = signal<string[]>([]);
  readonly prio = signal(2);
  readonly body = signal(TEMPLATE);
  readonly extra = signal<[string, string][]>([]);
  readonly preview = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly job = signal<Job | null>(null);
  readonly error = signal<string | null>(null);
  idTouched = false;

  readonly html = computed(() => markdown(this.body()));
  readonly cli = computed(() => {
    const id = this.id() || '<id>';
    if (this.ui.editor()?.mode !== 'new') return `edit tasks/${id}.md && git commit && git push`;
    const deps = this.deps().length ? ` --deps ${this.deps().join(',')}` : '';
    const prio = this.prio() !== 2 ? ` --prio ${this.prio()}` : '';
    return `python tasks.py new ${id} "${this.title()}"${deps}${prio} && edit tasks/${id}.md && git commit && git push`;
  });
  readonly res = computed(() => (this.job() ? outcome(this.job()!) : null));
  readonly candidates = computed(() =>
    this.store
      .tasks()
      .filter((t) => t.id !== this.id() && !this.deps().includes(t.id) && t.status !== 'dropped')
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
  readonly idProblem = computed(() => {
    const id = this.id();
    if (this.ui.editor()?.mode !== 'new' || !id) return '';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return 'Only a-z, 0-9 and -, starting with a letter or digit.';
    if (this.store.byId().has(id)) return 'A task with this id exists already.';
    return '';
  });
  readonly valid = computed(() => !!this.title().trim() && !!this.id() && !this.idProblem() && !this.loading());

  constructor() {
    effect(() => {
      const r = this.ui.editor();
      const el = this.dlg().nativeElement;
      if (!r) {
        if (el.open) el.close();
        return;
      }
      this.job.set(null);
      this.error.set(null);
      this.preview.set(false);
      this.idTouched = r.mode === 'edit';
      if (r.mode === 'new') {
        this.id.set('');
        this.title.set('');
        this.deps.set(r.deps ?? []);
        this.prio.set(2);
        this.body.set(TEMPLATE);
        this.extra.set([]);
      } else {
        this.load(r.id!);
      }
      if (!el.open) el.showModal();
    });
  }

  private async load(id: string) {
    this.loading.set(true);
    this.id.set(id);
    try {
      const { text } = await this.store.get<{ text: string }>(`/api/tasks/${id}/text`);
      const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      const fields: [string, string][] = (m?.[1] ?? '')
        .split('\n')
        .filter((l) => l.includes(':'))
        .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]);
      const get = (k: string) => fields.find((f) => f[0] === k)?.[1] ?? '';
      this.title.set(get('title'));
      this.deps.set(get('deps').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean));
      this.prio.set(+get('prio') || 2);
      this.extra.set(fields.filter(([k]) => !['title', 'deps', 'prio', ...PROTOCOL].includes(k)));
      this.body.set(m?.[2] ?? text);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  onTitle(v: string) {
    this.title.set(v);
    if (!this.idTouched && this.ui.editor()?.mode === 'new') this.id.set(slug(v));
  }

  addDep(id: string) {
    if (id && !this.deps().includes(id)) this.deps.update((d) => [...d, id]);
  }

  removeDep(id: string) {
    this.deps.update((d) => d.filter((x) => x !== id));
  }

  async save() {
    const r = this.ui.editor();
    if (!r || !this.valid()) return;
    const front = [
      ['title', this.title().trim().replace(/\n/g, ' ')],
      ['deps', `[${this.deps().join(', ')}]`],
      ['prio', String(this.prio())],
      ...this.extra(),
    ];
    const text = `---\n${front.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${this.body().replace(/^\n+/, '')}`;
    this.busy.set(true);
    this.error.set(null);
    try {
      const { job, done } = await this.store.run('save_task', { id: this.id(), text, create: r.mode === 'new' });
      this.job.set(job);
      const j = await done;
      this.job.set(j);
      if (j.state === 'ok' && r.mode === 'new') this.ui.open(this.id());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  close() {
    this.ui.editor.set(null);
  }

  closed() {
    if (this.ui.editor()) this.ui.editor.set(null);
  }
}
