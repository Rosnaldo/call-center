import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatbotParamsStore, useChatbotStore } from '../../states/stores.ts';
import { WEEKDAYS, type AppSchedules, type TimeRange, type Weekday, type WeekSchedule } from '../../states/local/chatbot-params/state.ts';
import { POPULAR_APPS } from './popular-apps.ts';
import { loadSavedApps } from './saved-allowed-apps.ts';
import AppIcon from './AppIcon.tsx';
import { SLOTS_PER_DAY, SLOT_MINUTES, cleanSchedules, defaultWeek, slotTime, toGrid, toRanges, toSlots } from './app-schedules.ts';

const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';
const SCROLLBAR =
  '[scrollbar-width:thin] [scrollbar-color:#D9C9A8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D9C9A8] [&::-webkit-scrollbar-track]:bg-transparent';

const POPULAR_BY_ID = new Map(POPULAR_APPS.map((app) => [app.id, app]));

interface AppSchedulesModalProps {
  // Sends the schedules to the bot; false when they couldn't be sent.
  onSubmit: (schedules: AppSchedules) => boolean;
}

// Per allowed app, the days and time ranges it may be used in, answering the
// bot's schedules request. An app left unrestricted may be used at any time.
// Opened and closed through the chatbot store (the bot opens it over the ws).
export const AppSchedulesModal: React.FC<AppSchedulesModalProps> = ({ onSubmit }) => {
  const isOpen = useChatbotStore((s) => s.isAppSchedulesModalOpen);
  // Mounted only while open, so every opening starts from the schedules given so far.
  return isOpen ? <SchedulesEditor onSubmit={onSubmit} /> : null;
};

const SchedulesEditor: React.FC<AppSchedulesModalProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const close = useChatbotStore((s) => s.closeAppSchedulesModal);
  const searchedApps = useChatbotStore((s) => s.searchedApps);
  // The conversation's apps and schedules, else the kept configuration's.
  const [apps] = useState<string[]>(() => {
    const { params, savedParams } = useChatbotParamsStore.getState();
    return params?.allowedApps ?? savedParams?.allowedApps ?? [];
  });
  const [schedules, setSchedules] = useState<AppSchedules>(() => {
    const { params, savedParams } = useChatbotParamsStore.getState();
    return toGrid(cleanSchedules(params?.appSchedules ?? savedParams?.appSchedules ?? {}, apps));
  });
  const [expanded, setExpanded] = useState<string | null>(() => apps[0] ?? null);
  // Saved picks cover apps searched before a reload.
  const [knownApps] = useState(() => ({
    ...Object.fromEntries(loadSavedApps().map((app) => [app.id, app])),
    ...searchedApps,
  }));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const appOf = (id: string) => POPULAR_BY_ID.get(id) ?? knownApps[id];

  const setWeek = (app: string, week: WeekSchedule | null) =>
    setSchedules((prev) => {
      const next = { ...prev };
      if (week) next[app] = week;
      else delete next[app];
      return next;
    });

  const handleSubmit = () => onSubmit(cleanSchedules(schedules, apps));

  const restrictedCount = apps.filter((app) => schedules[app]).length;

  return (
    <div
      id="app-schedules-modal"
      className="fixed inset-0 z-[200] bg-brand-dark/35 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-schedules-title"
        className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '22px',
          backgroundColor: '#FDFBF7',
          border: '1.5px solid #E4DAC6',
          boxShadow: '0 18px 36px -12px rgba(165, 120, 50, 0.09), 0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4.5 py-2.5"
          style={{ backgroundColor: '#F5EFE4', borderBottomColor: '#E8DECA', fontFamily: MONO }}
        >
          <h4 id="app-schedules-title" className="flex items-center gap-2 text-[12.5px] font-medium tracking-tight text-[#524A3D]">
            <span className="text-[11px] leading-none" style={{ color: '#B97204' }}>◆</span>
            {t('chatbot.appSchedulesModal.title')}
          </h4>
        </div>

        <p className="px-4.5 pt-3 pb-1 text-[12px] text-[#857967] text-left" style={{ fontFamily: MONO, backgroundColor: '#FAF7F1' }}>
          {t('chatbot.appSchedulesModal.hint')}
        </p>

        <div className={`flex-1 overflow-y-auto overscroll-contain ${SCROLLBAR} p-3 flex flex-col gap-2`} style={{ backgroundColor: '#FAF7F1' }}>
          {apps.length === 0 ? (
            <p className="text-center py-8 text-[13px] text-[#A09787]">{t('chatbot.appSchedulesModal.noApps')}</p>
          ) : (
            apps.map((id) => {
              const app = appOf(id);
              return (
                <AppRow
                  key={id}
                  id={id}
                  name={app?.name ?? id}
                  iconUrl={app?.iconUrl}
                  week={schedules[id] ?? null}
                  isExpanded={expanded === id}
                  onToggleExpanded={() => setExpanded((prev) => (prev === id ? null : id))}
                  onChange={(week) => setWeek(id, week)}
                />
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4.5 py-3.5 bg-white border-t border-[#E8DECA]">
          <span className="text-[12px] text-[#857967]" style={{ fontFamily: MONO }}>
            {t('chatbot.appSchedulesModal.count', { count: restrictedCount })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-[10px] border border-[#E4D9C4] text-[#524A3D] text-[12px] uppercase font-semibold tracking-wider cursor-pointer hover:bg-[#FAF7F1]"
              style={{ fontFamily: MONO }}
            >
              {t('chatbot.appSchedulesModal.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-[10px] text-white text-[12px] uppercase font-bold tracking-wider cursor-pointer active:scale-[0.98]"
              style={{ backgroundColor: '#B97204', boxShadow: '0 3px 12px -1px rgba(185, 114, 4, 0.38)', fontFamily: MONO }}
            >
              {t('chatbot.appSchedulesModal.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AppRowProps {
  id: string;
  name: string;
  iconUrl?: string;
  // Null: the app may be used at any time.
  week: WeekSchedule | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onChange: (week: WeekSchedule | null) => void;
}

// An allowed app: collapsed to its name and how restricted it is, expanded to
// the restriction switch and, when restricted, its week grid.
const AppRow: React.FC<AppRowProps> = ({ id, name, iconUrl, week, isExpanded, onToggleExpanded, onChange }) => {
  const { t } = useTranslation();
  const enabledDays = week ? WEEKDAYS.filter((day) => week[day]?.length).length : 0;
  const status = week ? t('chatbot.appSchedulesModal.restricted', { count: enabledDays }) : t('chatbot.appSchedulesModal.anyTime');
  const panelId = `app-schedule-${id}`;

  return (
    <div className="rounded-xl border border-[#E4D9C4] bg-white">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
      >
        {iconUrl ? (
          <AppIcon url={iconUrl} name={name} />
        ) : (
          <span className="shrink-0 w-8 h-8 rounded-[9px] flex items-center justify-center bg-[#F5EFE4] text-[#857967] text-[13px] font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[14px] text-[#1E1913]">{name}</span>
          <span className="block text-[11.5px] text-[#857967]" style={{ fontFamily: MONO }}>
            {status}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#A09787] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div id={panelId} className="px-3 pb-3 border-t border-[#F0E8DA]">
          <label className="flex items-center gap-2 pt-2.5 pb-1 text-[13px] text-[#524A3D] cursor-pointer">
            <input
              type="checkbox"
              checked={!!week}
              onChange={(e) => onChange(e.target.checked ? defaultWeek() : null)}
              className="accent-[#B97204] w-4 h-4"
            />
            {t('chatbot.appSchedulesModal.restrict')}
          </label>
          {week && <ScheduleEditor week={week} onChange={onChange} />}
        </div>
      )}
    </div>
  );
};

type Mode = 'daily' | 'weekly';

const sameRanges = (a: TimeRange[] = [], b: TimeRange[] = []): boolean =>
  a.length === b.length && a.every((range, i) => range.start === b[i].start && range.end === b[i].end);
const isEveryDaySame = (week: WeekSchedule): boolean => WEEKDAYS.every((day) => sameRanges(week[day], week.sun));

interface ScheduleEditorProps {
  week: WeekSchedule;
  onChange: (week: WeekSchedule) => void;
}

// Two tabs over the same schedule: "per day", one row whose ranges every day
// gets, and "per day of the week", a row per day. Opens on "per day" when every
// day already has the same ranges.
const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ week, onChange }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(() => (isEveryDaySame(week) ? 'daily' : 'weekly'));
  const dayName = (day: Weekday) => t(`chatbot.appSchedulesModal.daysShort.${day}`);

  // Per day: the first day with ranges stands for all of them until it's edited.
  const dailyRanges = week[WEEKDAYS.find((day) => week[day]?.length) ?? 'sun'] ?? [];
  const setEveryDay = (ranges: TimeRange[]) =>
    onChange(ranges.length ? Object.fromEntries(WEEKDAYS.map((day) => [day, ranges.map((range) => ({ ...range }))])) : {});

  const rows: GridRow[] =
    mode === 'daily'
      ? [{ key: 'daily', label: t('chatbot.appSchedulesModal.everyDayShort'), name: t('chatbot.appSchedulesModal.everyDay'), ranges: dailyRanges }]
      : WEEKDAYS.map((day) => ({ key: day, label: dayName(day), name: t(`chatbot.appSchedulesModal.days.${day}`), ranges: week[day] }));

  const commit = (changed: Map<number, TimeRange[]>) => {
    if (mode === 'daily') {
      setEveryDay(changed.get(0) ?? dailyRanges);
      return;
    }
    const next = { ...week };
    changed.forEach((ranges, index) => {
      if (ranges.length) next[WEEKDAYS[index]] = ranges;
      else delete next[WEEKDAYS[index]];
    });
    onChange(next);
  };

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={`px-3 py-1.5 rounded-lg text-[12px] cursor-pointer ${
        mode === value ? 'bg-[#B97204] text-white font-semibold' : 'text-[#524A3D] hover:bg-[#F5EFE4]'
      }`}
      style={{ fontFamily: MONO }}
    >
      {label}
    </button>
  );

  return (
    <div className="pt-1.5">
      <div role="tablist" className="inline-flex gap-1 p-0.5 rounded-[10px] border border-[#E4D9C4] bg-[#FAF7F1]">
        {tab('daily', t('chatbot.appSchedulesModal.tabs.daily'))}
        {tab('weekly', t('chatbot.appSchedulesModal.tabs.weekly'))}
      </div>
      {mode === 'daily' && !isEveryDaySame(week) && (
        <p className="pt-1.5 text-[11.5px] text-[#9A6B12] text-left" style={{ fontFamily: MONO }}>
          {t('chatbot.appSchedulesModal.differentDays')}
        </p>
      )}

      <SlotGrid rows={rows} onCommit={commit} />

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setEveryDay([{ start: '00:00', end: slotTime(SLOTS_PER_DAY) }])}
          className="text-[12px] text-[#B97204] hover:text-[#8f5803] cursor-pointer"
          style={{ fontFamily: MONO }}
        >
          {t('chatbot.appSchedulesModal.allowAll')}
        </button>
        <button
          type="button"
          onClick={() => setEveryDay([])}
          className="text-[12px] text-[#857967] hover:text-[#524A3D] cursor-pointer"
          style={{ fontFamily: MONO }}
        >
          {t('chatbot.appSchedulesModal.clearAll')}
        </button>
      </div>

      <dl className="pt-2 grid gap-x-2 gap-y-0.5 text-[12px] text-left" style={{ gridTemplateColumns: 'auto 1fr', fontFamily: MONO }}>
        {rows.map((row) => (
          <React.Fragment key={row.key}>
            <dt className="text-[#857967]">{row.label}</dt>
            <dd className={row.ranges?.length ? 'text-[#1E1913]' : 'text-[#A09787]'}>{rangesText(row.ranges, t)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};

// A grid row: its short label (shown) and full name (read out), and its ranges.
interface GridRow {
  key: string;
  label: string;
  name: string;
  ranges: TimeRange[] | undefined;
}

// The rectangle being dragged over (row and slot indexes, either order), and
// whether it enables or clears its slots: the opposite of the cell it started on.
interface Drag {
  fromRow: number;
  fromSlot: number;
  toRow: number;
  toSlot: number;
  enable: boolean;
}

const rowsOf = (drag: Drag): [number, number] => [Math.min(drag.fromRow, drag.toRow), Math.max(drag.fromRow, drag.toRow)];
const inDrag = (drag: Drag, row: number, slot: number): boolean => {
  const [first, last] = rowsOf(drag);
  return (
    row >= first && row <= last && slot >= Math.min(drag.fromSlot, drag.toSlot) && slot <= Math.max(drag.fromSlot, drag.toSlot)
  );
};

const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const GRID_COLUMNS = `2.25rem repeat(${SLOTS_PER_DAY}, minmax(0, 1fr))`;

interface SlotGridProps {
  rows: GridRow[];
  // The new ranges of the rows a drag touched, by row index.
  onCommit: (changed: Map<number, TimeRange[]>) => void;
}

// A cell per SLOT_MINUTES in each row: clicking and dragging enables (or,
// starting on an enabled cell, clears) the cells in the rectangle dragged over,
// across rows too.
const SlotGrid: React.FC<SlotGridProps> = ({ rows, onCommit }) => {
  const { t } = useTranslation();
  const slots = useMemo(() => rows.map((row) => toSlots(row.ranges)), [rows]);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Read by the window listeners, which outlive the render that added them.
  const latest = useRef({ drag, slots, onCommit });
  latest.current = { drag, slots, onCommit };
  const isDragging = drag !== null;

  useEffect(() => {
    if (!isDragging) return;
    const finish = () => {
      const { drag: current, slots: rowSlots, onCommit: commit } = latest.current;
      setDrag(null);
      if (!current) return;
      const [first, last] = rowsOf(current);
      const changed = new Map<number, TimeRange[]>();
      for (let row = first; row <= last; row++) {
        changed.set(row, toRanges(rowSlots[row].map((on, slot) => (inDrag(current, row, slot) ? current.enable : on))));
      }
      commit(changed);
    };
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [isDragging]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, row: number, slot: number) => {
    e.preventDefault();
    // Touch captures the pointer to the first cell; released, the others get pointerenter too.
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDrag({ fromRow: row, fromSlot: slot, toRow: row, toSlot: slot, enable: !slots[row][slot] });
  };
  const moveDrag = (row: number, slot: number) =>
    setDrag((prev) => (prev && (prev.toRow !== row || prev.toSlot !== slot) ? { ...prev, toRow: row, toSlot: slot } : prev));

  let dragText = '';
  if (drag) {
    const [first, last] = rowsOf(drag);
    dragText = t('chatbot.appSchedulesModal.dragging', {
      days: first === last ? rows[first].label : `${rows[first].label}–${rows[last].label}`,
      start: slotTime(Math.min(drag.fromSlot, drag.toSlot)),
      end: slotTime(Math.max(drag.fromSlot, drag.toSlot) + 1),
      action: t(drag.enable ? 'chatbot.appSchedulesModal.enable' : 'chatbot.appSchedulesModal.disable'),
    });
  }

  return (
    <div className="pt-1.5">
      {/* Fixed height, one line: a change in its size while dragging would move the grid
          under the pointer, and the row below would get the drag. */}
      <p aria-live="polite" className="h-5 overflow-hidden whitespace-nowrap text-ellipsis text-[11.5px] text-[#857967] text-left" style={{ fontFamily: MONO }}>
        {dragText}
      </p>

      <div className="select-none" style={{ touchAction: 'none' }}>
        <div className="grid" style={{ gridTemplateColumns: GRID_COLUMNS }} aria-hidden="true">
          {HOUR_LABELS.map((hour) => (
            <span
              key={hour}
              className="text-[10px] text-[#A09787] text-left"
              style={{ gridColumn: `${2 + hour * SLOTS_PER_HOUR} / span ${3 * SLOTS_PER_HOUR}`, fontFamily: MONO }}
            >
              {hour}h
            </span>
          ))}
        </div>

        {rows.map((row, r) => (
          <div
            key={row.key}
            role="group"
            aria-label={`${row.name}: ${rangesText(row.ranges, t)}`}
            className="grid items-stretch h-7 mt-0.5"
            style={{ gridTemplateColumns: GRID_COLUMNS }}
          >
            <span className="self-center text-[11.5px] text-[#524A3D] text-left truncate" style={{ fontFamily: MONO }}>
              {row.label}
            </span>
            {slots[r].map((on, slot) => {
              const enabled = drag && inDrag(drag, r, slot) ? drag.enable : on;
              return (
                <div
                  key={slot}
                  data-testid={`slot-${row.key}-${slot}`}
                  onPointerDown={(e) => startDrag(e, r, slot)}
                  onPointerEnter={() => moveDrag(r, slot)}
                  className={`cursor-pointer ${slot % SLOTS_PER_HOUR === 0 ? 'border-l border-l-[#E4D9C4]' : ''} ${
                    slot === 0 ? 'rounded-l-md' : ''
                  } ${slot === SLOTS_PER_DAY - 1 ? 'rounded-r-md' : ''}`}
                  style={{ backgroundColor: enabled ? '#B97204' : '#F5EFE4' }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

type T = ReturnType<typeof useTranslation>['t'];

const rangesText = (ranges: TimeRange[] | undefined, t: T): string =>
  ranges?.length ? ranges.map(({ start, end }) => `${start}–${end}`).join(', ') : t('chatbot.appSchedulesModal.blocked');

export default AppSchedulesModal;
