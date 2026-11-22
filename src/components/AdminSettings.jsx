import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  readEmployees,
  readSchedule,
  readShifts,
  readStoreAvailability,
  saveEmployees,
  saveEmployeeSchedule,
  saveSchedule,
  saveShifts,
  saveStoreStatus,
} from "../data/adminSettingsStorage";
import { showConfirm, showError, showSuccess } from "../utils/swal";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekDaysFromSunday = ["Sunday", ...days];
const clockHours = Array.from({ length: 12 }, (_, index) => index + 1);
const clockMinutes = Array.from({ length: 12 }, (_, index) => index * 5);
const shiftTypes = ["Morning Shift", "Afternoon Shift", "Evening Shift", "Custom Shift"];
const tabs = [
  { id: "schedule", label: "Shop Operating Hours", icon: CalendarDays },
  { id: "availability", label: "Store Availability", icon: Store },
  { id: "shifts", label: "Employee Shifts", icon: Users },
];
const tabRoutes = {
  schedule: "/staff/operating-hours",
  availability: "/staff/store-availability",
  shifts: "/staff/shifts",
};
const panelClass = "rounded-2xl border border-white/[0.08] bg-[#14141b] p-5";
const fieldClass = "min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#0f0f15] px-3 text-sm text-white outline-none transition focus:border-[#E63946]";
const mutedTextClass = "text-sm text-[#A1A1AA]";
const defaultEmployeeDraft = { name: "", position: "" };

const createEmptySchedule = () => Object.fromEntries(
  days.map((day) => [day, { enabled: false, opening: "", closing: "" }]),
);

const currentStoreDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const createShiftDraft = () => ({
  employeeId: "",
  type: "Custom Shift",
  start: "",
  end: "",
  days: [],
  startDate: currentStoreDate(),
  endDate: "",
});

const createId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;

const timeToMinutes = (time) => {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseScheduleTime = (time) => {
  const match = (time || "").trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  if (hours < 1 || hours > 12) return null;

  const normalizedHours = (hours % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const formatScheduleTime = (time) => {
  const minutes = timeToMinutes(time);
  if (minutes === null) return "";

  const hours = Math.floor(minutes / 60);
  return `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

const getScheduleInputSegments = (time) => {
  const parsed = parseScheduleTime(time);
  if (parsed === null) {
    const partial = (time || "").trim().match(/^(\d{1,2}|--):(\d{1,2}|--)\s*(AM|PM|--)?$/i);
    if (!partial) return { hour: "", minute: "", period: "" };
    return {
      hour: partial[1] === "--" ? "" : partial[1],
      minute: partial[2] === "--" ? "" : partial[2],
      period: ["AM", "PM"].includes(partial[3]?.toUpperCase()) ? partial[3].toUpperCase() : "",
    };
  }

  const [hours, minutes] = parsed.split(":").map(Number);
  return {
    hour: String(hours % 12 || 12).padStart(2, "0"),
    minute: String(minutes).padStart(2, "0"),
    period: hours >= 12 ? "PM" : "AM",
  };
};

const formatScheduleInputSegments = ({ hour, minute, period }) => (
  `${hour || "--"}:${minute || "--"} ${period || "--"}`
);

const getPickerValues = (time) => {
  const parsed = parseScheduleTime(time);
  if (parsed === null) return { hour: "08", minute: "00", period: "AM" };

  const totalMinutes = timeToMinutes(parsed);

  const hours = Math.floor(totalMinutes / 60);
  return {
    hour: String(hours % 12 || 12).padStart(2, "0"),
    minute: String(totalMinutes % 60).padStart(2, "0"),
    period: hours >= 12 ? "PM" : "AM",
  };
};

const getPickerValuesFromSegments = (segments) => {
  const parsed = parseScheduleTime(formatScheduleInputSegments(segments));
  if (parsed !== null) return getPickerValues(parsed);

  const hour = Number(segments.hour);
  const minute = Number(segments.minute);
  const hours = hour >= 1 && hour <= 12 ? hour : 8;
  const minutes = minute >= 0 && minute <= 59 ? minute : 0;
  const period = segments.period === "PM" ? "PM" : "AM";
  const time = `${String((hours % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return getPickerValues(time);
};

const hasSharedWorkdayInRange = (first, second) => {
  const firstStart = first.startDate || "0000-01-01";
  const secondStart = second.startDate || "0000-01-01";
  const firstEnd = first.endDate || "9999-12-31";
  const secondEnd = second.endDate || "9999-12-31";
  const rangeStart = firstStart > secondStart ? firstStart : secondStart;
  const rangeEnd = firstEnd < secondEnd ? firstEnd : secondEnd;
  if (rangeStart > rangeEnd) return false;

  const sharedDays = (first.days || []).filter((day) => (second.days || []).includes(day));
  const start = new Date(`${rangeStart}T00:00:00Z`);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);
    if (candidate.toISOString().slice(0, 10) > rangeEnd) return false;
    if (sharedDays.includes(weekDaysFromSunday[candidate.getUTCDay()])) return true;
  }
  return false;
};

const dateWeekday = (date) => {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return weekDaysFromSunday[parsedDate.getUTCDay()];
};

const formatDate = (date) => {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatTransition = (transition) => {
  if (!transition) return null;
  const action = transition.action === "open" ? "Opens" : "Closes";
  return `${action} ${transition.day}, ${formatDate(transition.date)} at ${transition.time}`;
};

function StatusBadge({ open }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${open ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
      <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-400" : "bg-rose-400"}`} />
      {open ? "Open" : "Closed"}
    </span>
  );
}

function ScheduleTimeField({
  day,
  label,
  displayValue,
  disabled,
  onInputChange,
  onInputBlur,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const segments = getScheduleInputSegments(displayValue);
  const [pickerValues, setPickerValues] = useState(() => getPickerValuesFromSegments(getScheduleInputSegments(displayValue)));
  const [pickerStep, setPickerStep] = useState("hour");
  const containerRef = useRef(null);
  const hourInputRef = useRef(null);
  const minuteInputRef = useRef(null);
  const periodInputRef = useRef(null);
  const pickerDialogRef = useRef(null);
  const pickerCloseRef = useRef(null);
  const pickerButtonRef = useRef(null);
  const pickerId = `${day.toLowerCase()}-${label.toLowerCase().replace(/\s+/g, "-")}-picker`;
  const hasInput = Boolean(segments.hour || segments.minute || segments.period);
  const invalid = touched && hasInput && parseScheduleTime(formatScheduleInputSegments(segments)) === null;

  const updateSegments = (nextSegments) => {
    onInputChange(formatScheduleInputSegments(nextSegments));
  };

  const focusSegment = (ref, atEnd = false) => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    const position = atEnd ? input.value.length : 0;
    input.setSelectionRange(position, position);
  };

  const handleHourChange = (event) => {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 2);
    const numeric = Number(raw);
    const completesHour = (raw.length === 1 && numeric >= 2 && numeric <= 9)
      || (raw.length === 2 && numeric >= 1 && numeric <= 12);
    updateSegments({ ...segments, hour: completesHour ? raw.padStart(2, "0") : raw });
    if (completesHour) focusSegment(minuteInputRef);
  };

  const handleMinuteChange = (event) => {
    const raw = event.target.value.replace(/\D/g, "").slice(0, 2);
    const numeric = Number(raw);
    const completesMinute = raw.length === 2 && numeric <= 59;
    const singleDigitMinute = raw.length === 1 && numeric >= 6;
    updateSegments({ ...segments, minute: singleDigitMinute ? raw.padStart(2, "0") : raw });
    if (completesMinute || singleDigitMinute) focusSegment(periodInputRef);
  };

  const handlePeriodChange = (event) => {
    const typedPeriod = event.target.value.toUpperCase().replace(/[^AP]/g, "").slice(-1);
    const period = typedPeriod === "A" ? "AM" : typedPeriod === "P" ? "PM" : "";
    updateSegments({ ...segments, period });
  };

  const handleSegmentBlur = (segment, event) => {
    const nextSegments = { ...segments };
    if (segment === "hour" && /^\d$/.test(nextSegments.hour)) {
      const hour = Number(nextSegments.hour);
      if (hour >= 1 && hour <= 9) nextSegments.hour = nextSegments.hour.padStart(2, "0");
    }
    if (segment === "minute" && /^\d$/.test(nextSegments.minute)) {
      nextSegments.minute = nextSegments.minute.padStart(2, "0");
    }
    if (nextSegments.hour !== segments.hour || nextSegments.minute !== segments.minute) {
      updateSegments(nextSegments);
    }
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setTouched(true);
      onInputBlur(formatScheduleInputSegments(nextSegments));
    }
  };

  const handleSegmentKeyDown = (segment, event) => {
    const input = event.currentTarget;
    if (event.key === "ArrowRight" && input.selectionStart === input.value.length) {
      if (segment === "hour") {
        event.preventDefault();
        focusSegment(minuteInputRef);
      } else if (segment === "minute") {
        event.preventDefault();
        focusSegment(periodInputRef);
      }
    }
    if (event.key === "ArrowLeft" && input.selectionStart === 0) {
      if (segment === "minute") {
        event.preventDefault();
        focusSegment(hourInputRef, true);
      } else if (segment === "period") {
        event.preventDefault();
        focusSegment(minuteInputRef, true);
      }
    }
    if (event.key === "Backspace" && segment === "minute" && input.selectionStart === 0 && !input.selectionEnd) {
      event.preventDefault();
      focusSegment(hourInputRef, true);
    }
    if (event.key === "Backspace" && segment === "period") {
      event.preventDefault();
      if (segments.period) updateSegments({ ...segments, period: "" });
      else focusSegment(minuteInputRef, true);
    }
    if (segment === "period" && /^[ap]$/i.test(event.key)) {
      event.preventDefault();
      updateSegments({ ...segments, period: event.key.toUpperCase() === "A" ? "AM" : "PM" });
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        pickerButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !pickerDialogRef.current) return;
      const focusableElements = Array.from(pickerDialogRef.current.querySelectorAll("button"))
        .filter((element) => element.getClientRects().length > 0);
      if (!focusableElements.length) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    pickerCloseRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const togglePicker = () => {
    if (open) {
      setOpen(false);
      return;
    }

    setPickerValues(getPickerValuesFromSegments(segments));
    setPickerStep("hour");
    setOpen(true);
  };

  const setTime = () => {
    const hour = Number(pickerValues.hour);
    const normalizedHours = (hour % 12) + (pickerValues.period === "PM" ? 12 : 0);
    const time = `${String(normalizedHours).padStart(2, "0")}:${pickerValues.minute}`;
    onSelect(time);
    setTouched(false);
    setOpen(false);
    pickerButtonRef.current?.focus();
  };

  const closePicker = () => {
    setOpen(false);
    pickerButtonRef.current?.focus();
  };
  const clockValues = pickerStep === "hour" ? clockHours : clockMinutes;
  const selectedClockValue = pickerStep === "hour"
    ? Number(pickerValues.hour) % 12
    : Number(pickerValues.minute);
  const clockHandAngle = pickerStep === "hour" ? selectedClockValue * 30 : selectedClockValue * 6;

  return (
    <div ref={containerRef} className={`relative ${open ? "z-30" : ""}`}>
      <span className="mb-1 block text-xs text-[#A1A1AA]">{label}</span>
      <div
        role="group"
        aria-label={`${day} ${label}`}
        aria-invalid={invalid}
        className={`relative flex min-h-11 w-full items-center rounded-xl border bg-[#0f0f15] px-2 text-sm text-white outline-none transition focus-within:border-[#E63946] disabled:opacity-40 ${
          invalid ? "border-rose-500" : "border-white/[0.1]"
        }`}
      >
        <input
          ref={hourInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${day} ${label.toLowerCase()} hour`}
          aria-invalid={invalid}
          placeholder="--"
          maxLength={2}
          value={segments.hour}
          disabled={disabled}
          onChange={handleHourChange}
          onBlur={(event) => handleSegmentBlur("hour", event)}
          onKeyDown={(event) => handleSegmentKeyDown("hour", event)}
          className="w-8 bg-transparent py-2 text-center font-medium tabular-nums text-white outline-none placeholder:text-[#777781] disabled:cursor-not-allowed"
        />
        <span aria-hidden="true" className="select-none text-[#A1A1AA]">:</span>
        <input
          ref={minuteInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${day} ${label.toLowerCase()} minutes`}
          aria-invalid={invalid}
          placeholder="--"
          maxLength={2}
          value={segments.minute}
          disabled={disabled}
          onChange={handleMinuteChange}
          onBlur={(event) => handleSegmentBlur("minute", event)}
          onKeyDown={(event) => handleSegmentKeyDown("minute", event)}
          className="w-8 bg-transparent py-2 text-center font-medium tabular-nums text-white outline-none placeholder:text-[#777781] disabled:cursor-not-allowed"
        />
        <input
          ref={periodInputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${day} ${label.toLowerCase()} AM or PM`}
          aria-invalid={invalid}
          placeholder="--"
          maxLength={2}
          value={segments.period}
          disabled={disabled}
          onChange={handlePeriodChange}
          onBlur={(event) => handleSegmentBlur("period", event)}
          onKeyDown={(event) => handleSegmentKeyDown("period", event)}
          className="ml-1 w-9 bg-transparent py-2 text-center font-medium text-white outline-none placeholder:text-[#777781] disabled:cursor-not-allowed"
        />
        <button
          ref={pickerButtonRef}
          type="button"
          aria-label={`Open time picker for ${day} ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={pickerId}
          disabled={disabled}
          onClick={togglePicker}
          className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-r-xl text-[#A1A1AA] transition hover:bg-white/5 hover:text-[#FF929A] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#E63946]/40 disabled:cursor-not-allowed"
        >
          <Clock3
            aria-hidden="true"
            className={`h-5 w-5 transition-transform ${open ? "scale-110 text-[#E63946]" : ""}`}
          />
        </button>
      </div>
      {invalid && (
        <span className="mt-1 block text-[11px] text-rose-300">
          Complete a valid hour, minute, and AM/PM selection.
        </span>
      )}
      {open && (
        <div
          className="mobile-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <div
            ref={pickerDialogRef}
            id={pickerId}
            role="dialog"
            aria-modal="true"
            aria-label={`${day} ${label.toLowerCase()} picker`}
            className="max-h-[94dvh] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-4 shadow-2xl shadow-black/50 sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Choose {label.toLowerCase()}</p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Select {pickerStep === "hour" ? "an hour" : "a minute"} on the clock.
              </p>
            </div>
            <button
              ref={pickerCloseRef}
              type="button"
              aria-label="Close clock picker"
              onClick={closePicker}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#A1A1AA] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            {["hour", "minute"].map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={pickerStep === step}
                onClick={() => setPickerStep(step)}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 ${
                  pickerStep === step
                    ? "border-[#E63946]/60 bg-[#E63946]/10 text-[#FF929A]"
                    : "border-white/10 bg-[#0f0f15] text-[#A1A1AA] hover:text-white"
                }`}
              >
                <span>{step === "hour" ? "Hour" : "Minute"}</span>
                <span className="tabular-nums text-white">
                  {step === "hour" ? pickerValues.hour : pickerValues.minute}
                </span>
              </button>
            ))}
          </div>

          <div
            className="relative mx-auto aspect-square w-56 max-w-full rounded-full border border-white/10 bg-[#0f0f15] shadow-inner shadow-black/40"
            onClick={(event) => {
              if (event.target.closest("button")) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const dx = event.clientX - (bounds.left + bounds.width / 2);
              const dy = (bounds.top + bounds.height / 2) - event.clientY;
              const radians = (Math.atan2(dx, dy) + Math.PI * 2) % (Math.PI * 2);
              if (pickerStep === "hour") {
                const hour = Math.round(radians / (Math.PI / 6)) % 12 || 12;
                setPickerValues((current) => ({ ...current, hour: String(hour).padStart(2, "0") }));
                setPickerStep("minute");
              } else {
                const minute = Math.round(radians / (Math.PI / 30)) % 60;
                setPickerValues((current) => ({ ...current, minute: String(minute).padStart(2, "0") }));
              }
            }}
          >
            <div className="absolute inset-[8%] rounded-full border border-white/[0.04]" />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[12%] z-[1] h-[38%] w-0.5 origin-bottom bg-[#E63946]/70 transition-transform duration-300"
              style={{ transform: `translateX(-50%) rotate(${clockHandAngle}deg)` }}
            />
            {clockValues.map((clockValue) => {
              const labelValue = pickerStep === "hour"
                ? String(clockValue)
                : String(clockValue).padStart(2, "0");
              const selected = pickerStep === "hour"
                ? pickerValues.hour === String(clockValue).padStart(2, "0")
                : pickerValues.minute === String(clockValue).padStart(2, "0");
              const angle = pickerStep === "hour"
                ? (Number(clockValue) % 12) * (Math.PI / 6)
                : (Number(clockValue) / 5) * (Math.PI / 6);

              return (
                <button
                  key={clockValue}
                  type="button"
                  aria-label={pickerStep === "hour" ? `${clockValue} o'clock` : `${labelValue} minutes`}
                  aria-pressed={selected}
                  onClick={() => {
                    if (pickerStep === "hour") {
                      setPickerValues((current) => ({ ...current, hour: String(clockValue).padStart(2, "0") }));
                      setPickerStep("minute");
                    } else {
                      setPickerValues((current) => ({ ...current, minute: String(clockValue).padStart(2, "0") }));
                    }
                  }}
                  className={`absolute z-[2] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold tabular-nums transition focus:outline-none focus:ring-2 focus:ring-[#E63946]/50 sm:h-9 sm:w-9 ${
                    selected
                      ? "bg-[#E63946] text-white shadow-md shadow-[#E63946]/30"
                      : "text-white hover:bg-white/10 active:bg-[#E63946]/20"
                  }`}
                  style={{
                    left: `${50 + (39 * Math.sin(angle))}%`,
                    top: `${50 - (39 * Math.cos(angle))}%`,
                  }}
                >
                  {labelValue}
                </button>
              );
            })}
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-[3] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E63946]" />
          </div>

          <div role="group" aria-label="AM or PM" className="mt-3 grid grid-cols-2 gap-2">
            {["AM", "PM"].map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={pickerValues.period === period}
                onClick={() => setPickerValues((current) => ({ ...current, period }))}
                className={`min-h-10 rounded-xl border text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 ${
                  pickerValues.period === period
                    ? "border-[#E63946]/60 bg-[#E63946]/15 text-[#FF929A]"
                    : "border-white/10 bg-[#0f0f15] text-[#A1A1AA] hover:text-white"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={setTime}
            className="mt-3 min-h-11 w-full rounded-xl bg-[#E63946] px-4 text-sm font-bold text-white transition-colors hover:bg-[#C92D3A] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
          >
            Set Time
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettings({ embedded = false, initialTab = "schedule" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [schedule, setSchedule] = useState(createEmptySchedule);
  const [scheduleTimeDrafts, setScheduleTimeDrafts] = useState({});
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [availability, setAvailability] = useState({
    mode: "automatic",
    status: "closed",
    schedule: null,
    nextTransition: null,
  });
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employeeDraft, setEmployeeDraft] = useState(defaultEmployeeDraft);
  const [shiftDraft, setShiftDraft] = useState(createShiftDraft);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const [savedSchedule, savedEmployees, savedShifts, savedAvailability] = await Promise.all([
          readSchedule(),
          readEmployees(),
          readShifts(),
          readStoreAvailability(),
        ]);
        if (!active) return;
        setSchedule(savedSchedule || createEmptySchedule());
        setScheduleSaved(Boolean(savedSchedule));
        setEmployees(savedEmployees);
        setShifts(savedShifts);
        setAvailability(savedAvailability);
        setLoadError("");
      } catch (error) {
        if (active) setLoadError(error.message || "Settings could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const filteredShifts = useMemo(() => shifts.filter((shift) => {
    if (employeeFilter && shift.employeeId !== employeeFilter) return false;
    if (!dateFilter) return true;
    const weekday = dateWeekday(dateFilter);
    const startsOnOrBefore = !shift.startDate || shift.startDate <= dateFilter;
    const endsOnOrAfter = !shift.endDate || shift.endDate >= dateFilter;
    return startsOnOrBefore && endsOnOrAfter && (shift.days || []).includes(weekday);
  }), [dateFilter, employeeFilter, shifts]);

  const logout = async () => {
    const result = await showConfirm({
      title: "Log out?",
      text: "Are you sure you want to log out of your administrator account?",
      confirmText: "Yes, log out",
      cancelText: "Stay logged in",
    });
    if (result.isConfirmed) {
      showSuccess("Logged out successfully");
      navigate("/?login=admin");
    }
  };

  const updateDay = (day, field, value) => {
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day], [field]: value },
    }));
  };

  const updateScheduleTimeInput = (day, field, value) => {
    setScheduleTimeDrafts((current) => ({
      ...current,
      [day]: { ...current[day], [field]: value },
    }));
    updateDay(day, field, parseScheduleTime(value) || "");
  };

  const normalizeScheduleTimeInput = (day, field, value) => {
    const normalized = parseScheduleTime(value);
    if (normalized === null) return;

    setScheduleTimeDrafts((current) => ({
      ...current,
      [day]: { ...current[day], [field]: formatScheduleTime(normalized) },
    }));
    updateDay(day, field, normalized);
  };

  const selectScheduleTime = (day, field, value) => {
    setScheduleTimeDrafts((current) => ({
      ...current,
      [day]: { ...current[day], [field]: formatScheduleTime(value) },
    }));
    updateDay(day, field, value);
  };

  const saveOperatingSchedule = async () => {
    for (const day of days) {
      const entry = schedule[day];
      if (!entry.enabled) continue;
      for (const field of ["opening", "closing"]) {
        const draft = scheduleTimeDrafts[day]?.[field];
        if (draft && parseScheduleTime(draft) === null) {
          showError("Invalid time format", `Enter ${day}'s ${field} time as 8:00 AM.`);
          return;
        }
      }
      const opening = timeToMinutes(entry.opening);
      const closing = timeToMinutes(entry.closing);
      if (opening === null || closing === null) {
        showError("Invalid operating hours", `Enter valid opening and closing times for ${day}.`);
        return;
      }
      if (closing <= opening) {
        showError("Invalid operating hours", `${day}'s closing time must be later than its opening time.`);
        return;
      }
    }

    setSavingSchedule(true);
    try {
      await saveSchedule(schedule);
      setScheduleSaved(true);
      setAvailability(await readStoreAvailability());
      showSuccess("Operating schedule saved successfully!");
    } catch (error) {
      showError("Save failed", error.message || "Operating hours could not be saved.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateStoreAvailability = async (status) => {
    setSavingAvailability(true);
    try {
      await saveStoreStatus(status);
      setAvailability(await readStoreAvailability());
      showSuccess(
        status === "open" || status === "closed" ? "Store availability updated." : "Automatic schedule enabled.",
        status === "open" ? "The store is now manually open." : status === "closed" ? "The store is now manually closed." : "",
      );
    } catch (error) {
      showError("Save failed", error.message || "Store availability could not be updated.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const addEmployee = async (event) => {
    event.preventDefault();
    const name = employeeDraft.name.trim();
    const position = employeeDraft.position.trim();
    if (!name || !position) {
      showError("Employee details required", "Enter both a name and position.");
      return;
    }

    const nextEmployees = [...employees, { id: createId("employee"), name, position }];
    setSavingEmployee(true);
    try {
      await saveEmployees(nextEmployees);
      setEmployees(nextEmployees);
      setEmployeeDraft(defaultEmployeeDraft);
      showSuccess("Employee added successfully!");
    } catch (error) {
      showError("Save failed", error.message || "The employee could not be saved.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const removeEmployee = async (employee) => {
    const result = await showConfirm({
      title: "Remove employee?",
      text: `Remove ${employee.name} and their assigned shifts?`,
      confirmText: "Yes, remove",
      cancelText: "Keep employee",
    });
    if (!result.isConfirmed) return;

    const nextEmployees = employees.filter((item) => item.id !== employee.id);
    const nextShifts = shifts.filter((shift) => shift.employeeId !== employee.id);
    try {
      await saveEmployeeSchedule(nextEmployees, nextShifts);
      setEmployees(nextEmployees);
      setShifts(nextShifts);
      if (employeeFilter === employee.id) setEmployeeFilter("");
      showSuccess("Employee removed successfully.");
    } catch (error) {
      showError("Delete failed", error.message || "The employee could not be removed.");
    }
  };

  const resetShiftDraft = () => {
    setShiftDraft({ ...createShiftDraft(), employeeId: employees[0]?.id || "" });
    setEditingShiftId(null);
  };

  const saveShift = async (event) => {
    event.preventDefault();
    const start = timeToMinutes(shiftDraft.start);
    const end = timeToMinutes(shiftDraft.end);
    if (!shiftDraft.employeeId || !shiftDraft.startDate || !shiftDraft.days.length || start === null || end === null || end <= start) {
      showError("Shift details required", "Choose an employee, working days, a start date, and valid start and end times.");
      return;
    }
    if (shiftDraft.endDate && shiftDraft.endDate < shiftDraft.startDate) {
      showError("Invalid shift dates", "The end date must be on or after the start date.");
      return;
    }

    const draft = { ...shiftDraft, days: [...shiftDraft.days] };
    const conflict = shifts.some((shift) => {
      if (shift.id === editingShiftId || shift.employeeId !== draft.employeeId) return false;
      const shiftStart = timeToMinutes(shift.start);
      const shiftEnd = timeToMinutes(shift.end);
      const overlapsTime = shiftStart !== null && shiftEnd !== null && start < shiftEnd && end > shiftStart;
      return hasSharedWorkdayInRange(draft, shift) && overlapsTime;
    });
    if (conflict) {
      showError("Conflicting shift", "This employee already has an overlapping shift on one or more of those days.");
      return;
    }

    const nextShift = { ...draft, id: editingShiftId || createId("shift") };
    const nextShifts = editingShiftId
      ? shifts.map((shift) => shift.id === editingShiftId ? nextShift : shift)
      : [...shifts, nextShift];
    setSavingShift(true);
    try {
      await saveShifts(nextShifts);
      setShifts(nextShifts);
      resetShiftDraft();
      showSuccess(editingShiftId ? "Shift updated successfully." : "Shift added successfully.");
    } catch (error) {
      showError("Save failed", error.message || "The shift could not be saved.");
    } finally {
      setSavingShift(false);
    }
  };

  const editShift = (shift) => {
    setEditingShiftId(shift.id);
    setShiftDraft({
      employeeId: shift.employeeId,
      type: shift.type || "Custom Shift",
      start: shift.start,
      end: shift.end,
      days: shift.days || [],
      startDate: shift.startDate || currentStoreDate(),
      endDate: shift.endDate || "",
    });
  };

  const deleteShift = async (shift) => {
    const result = await showConfirm({
      title: "Delete shift?",
      text: "This shift will be permanently removed.",
      confirmText: "Yes, delete",
      cancelText: "Cancel",
    });
    if (!result.isConfirmed) return;

    const nextShifts = shifts.filter((item) => item.id !== shift.id);
    try {
      await saveShifts(nextShifts);
      setShifts(nextShifts);
      if (editingShiftId === shift.id) resetShiftDraft();
      showSuccess("Shift deleted successfully.");
    } catch (error) {
      showError("Delete failed", error.message || "The shift could not be deleted.");
    }
  };

  const toggleShiftDay = (day) => {
    setShiftDraft((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));
  };

  const renderSchedule = () => (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Current weekly schedule</h2>
            <p className={`mt-1 ${mutedTextClass}`}>
              {scheduleSaved ? "These hours determine automatic store availability." : "No schedule has been saved. The store remains closed while automatic availability is selected."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#c5c5ce]">
            <Clock3 className="h-4 w-4 text-[#FF727D]" />
            Store time: Asia/Manila
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {days.map((day) => {
            const entry = schedule[day];
            return (
              <div key={day} className="rounded-xl border border-white/[0.07] bg-[#101016] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{day}</span>
                  <span className={`text-xs font-semibold ${entry.enabled ? "text-emerald-300" : "text-[#85858f]"}`}>
                    {entry.enabled ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  {entry.enabled && entry.opening && entry.closing ? `${entry.opening} – ${entry.closing}` : "No operating hours"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Shop Operating Hours</h2>
          <p className={`mt-1 ${mutedTextClass}`}>Set different opening hours for each day, or mark a day closed.</p>
        </div>
        <div className="space-y-2">
          {days.map((day) => {
            const entry = schedule[day];
            return (
              <div key={day} className="grid gap-3 rounded-xl border border-white/[0.07] bg-[#101016] p-3 sm:grid-cols-[minmax(100px,1fr)_112px_1fr_1fr] sm:items-center">
                <span className="text-sm font-semibold text-white">{day}</span>
                <button
                  type="button"
                  aria-pressed={entry.enabled}
                  onClick={() => updateDay(day, "enabled", !entry.enabled)}
                  className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition ${entry.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/[0.08] bg-white/[0.03] text-[#A1A1AA]"}`}
                >
                  {entry.enabled ? "Open" : "Closed"}
                </button>
                <ScheduleTimeField
                  key={`${day}-opening-${entry.enabled}`}
                  day={day}
                  label="Opening time"
                  displayValue={scheduleTimeDrafts[day]?.opening ?? formatScheduleTime(entry.opening)}
                  disabled={!entry.enabled}
                  onInputChange={(value) => updateScheduleTimeInput(day, "opening", value)}
                  onInputBlur={(value) => normalizeScheduleTimeInput(day, "opening", value)}
                  onSelect={(value) => selectScheduleTime(day, "opening", value)}
                />
                <ScheduleTimeField
                  key={`${day}-closing-${entry.enabled}`}
                  day={day}
                  label="Closing time"
                  displayValue={scheduleTimeDrafts[day]?.closing ?? formatScheduleTime(entry.closing)}
                  disabled={!entry.enabled}
                  onInputChange={(value) => updateScheduleTimeInput(day, "closing", value)}
                  onInputBlur={(value) => normalizeScheduleTimeInput(day, "closing", value)}
                  onSelect={(value) => selectScheduleTime(day, "closing", value)}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" disabled={savingSchedule} onClick={saveOperatingSchedule} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#E63946] px-4 text-sm font-bold text-white transition hover:bg-[#d62f3c] disabled:cursor-wait disabled:opacity-60">
            {savingSchedule ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </section>
    </div>
  );

  const renderAvailability = () => {
    const isManual = availability.mode === "manual";
    const transitionLabel = formatTransition(availability.nextTransition);
    return (
      <div className="space-y-5">
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-white">Current store status</h2>
                <StatusBadge open={availability.status === "open"} />
              </div>
              <p className={`mt-2 max-w-2xl ${mutedTextClass}`}>
                This is the store&apos;s actual ordering availability. It is separate from the weekly schedule.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#101016] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#85858f]">Availability mode</p>
              <p className="mt-1 text-sm font-semibold text-white">{isManual ? "Manual override" : "Following schedule"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#101016] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#85858f]">Next scheduled change</p>
            <p className="mt-2 text-sm font-semibold text-white">{transitionLabel || "No upcoming change is scheduled."}</p>
            {!scheduleSaved && <p className="mt-1 text-xs text-[#A1A1AA]">Configure and save operating hours to enable automatic transitions.</p>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" disabled={savingAvailability} onClick={() => updateStoreAvailability("automatic")} className={`min-h-12 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${!isManual ? "border-[#E63946]/40 bg-[#E63946]/10 text-[#FF929A]" : "border-white/[0.08] bg-white/[0.03] text-[#C5C5CE] hover:bg-white/[0.06]"}`}>
              Follow schedule
            </button>
            <button type="button" disabled={savingAvailability} onClick={() => updateStoreAvailability("open")} className={`min-h-12 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${isManual && availability.status === "open" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/[0.08] bg-white/[0.03] text-[#C5C5CE] hover:bg-white/[0.06]"}`}>
              Manually open
            </button>
            <button type="button" disabled={savingAvailability} onClick={() => updateStoreAvailability("closed")} className={`min-h-12 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${isManual && availability.status === "closed" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-white/[0.08] bg-white/[0.03] text-[#C5C5CE] hover:bg-white/[0.06]"}`}>
              Manually close
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#85858f]">
            Manual open or close overrides the schedule until you select Follow schedule. Customer ordering is disabled whenever the actual store status is closed.
          </p>
        </section>
      </div>
    );
  };

  const renderShifts = () => (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E63946]/10 text-[#FF727D]"><Users className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-white">Employees</h2>
            <p className={`mt-1 ${mutedTextClass}`}>Add employees before assigning work shifts.</p>
          </div>
        </div>
        <form onSubmit={addEmployee} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input value={employeeDraft.name} onChange={(event) => setEmployeeDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Employee name" aria-label="Employee name" className={fieldClass} />
          <input value={employeeDraft.position} onChange={(event) => setEmployeeDraft((current) => ({ ...current, position: event.target.value }))} placeholder="Position" aria-label="Employee position" className={fieldClass} />
          <button type="submit" disabled={savingEmployee} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E63946] px-4 text-sm font-bold text-white transition hover:bg-[#d62f3c] disabled:opacity-60">
            {savingEmployee ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add employee
          </button>
        </form>
        {employees.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {employees.map((employee) => (
              <div key={employee.id} className="inline-flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#101016] px-3 py-2">
                <span className="text-sm font-medium text-white">{employee.name}<span className="ml-2 text-xs text-[#85858f]">{employee.position}</span></span>
                <button type="button" onClick={() => removeEmployee(employee)} aria-label={`Remove ${employee.name}`} className="rounded-md p-1 text-[#85858f] transition hover:bg-rose-500/10 hover:text-rose-300"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[#85858f]">No employees have been added.</p>}
      </section>

      <section className={panelClass}>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">{editingShiftId ? "Edit employee shift" : "Assign a shift"}</h2>
          <p className={`mt-1 ${mutedTextClass}`}>Shifts can repeat weekly between the selected start and end dates.</p>
        </div>
        <form onSubmit={saveShift} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Employee
              <select value={shiftDraft.employeeId} onChange={(event) => setShiftDraft((current) => ({ ...current, employeeId: event.target.value }))} className={fieldClass} required>
                <option value="">Select an employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Shift label
              <select value={shiftDraft.type} onChange={(event) => setShiftDraft((current) => ({ ...current, type: event.target.value }))} className={fieldClass}>
                {shiftTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Start date
              <input type="date" value={shiftDraft.startDate} onChange={(event) => setShiftDraft((current) => ({ ...current, startDate: event.target.value }))} className={fieldClass} required />
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              End date <span className="text-[#686873]">(optional)</span>
              <input type="date" value={shiftDraft.endDate} onChange={(event) => setShiftDraft((current) => ({ ...current, endDate: event.target.value }))} min={shiftDraft.startDate} className={fieldClass} />
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Shift starts
              <input type="time" value={shiftDraft.start} onChange={(event) => setShiftDraft((current) => ({ ...current, start: event.target.value }))} className={fieldClass} required />
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Shift ends
              <input type="time" value={shiftDraft.end} onChange={(event) => setShiftDraft((current) => ({ ...current, end: event.target.value }))} className={fieldClass} required />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-[#A1A1AA]">Working days</legend>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button key={day} type="button" aria-pressed={shiftDraft.days.includes(day)} onClick={() => toggleShiftDay(day)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition ${shiftDraft.days.includes(day) ? "border-[#E63946]/30 bg-[#E63946]/10 text-[#FF929A]" : "border-white/[0.08] bg-white/[0.03] text-[#A1A1AA] hover:text-white"}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2">
            {editingShiftId && <button type="button" onClick={resetShiftDraft} className="min-h-11 rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-[#C5C5CE] transition hover:bg-white/[0.04]">Cancel edit</button>}
            <button type="submit" disabled={savingShift || employees.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#E63946] px-4 text-sm font-bold text-white transition hover:bg-[#d62f3c] disabled:cursor-not-allowed disabled:opacity-50">
              {savingShift ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editingShiftId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingShiftId ? "Save shift" : "Add shift"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="flex flex-wrap items-end justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Employee schedule</h2>
            <p className={`mt-1 ${mutedTextClass}`}>Filter by employee or a date to view the shifts scheduled that day.</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Employee
              <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className={`${fieldClass} min-w-40`}>
                <option value="">All employees</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#A1A1AA]">
              Date
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={`${fieldClass} min-w-40`} />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-white/[0.07]">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wide text-[#85858f]">
              <tr>
                <th className="px-5 py-3 font-semibold">Employee</th>
                <th className="px-5 py-3 font-semibold">Shift dates</th>
                <th className="px-5 py-3 font-semibold">Working days</th>
                <th className="px-5 py-3 font-semibold">Hours</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredShifts.map((shift) => (
                <tr key={shift.id} className="text-[#d4d4dc]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{employeeMap.get(shift.employeeId)?.name || "Employee unavailable"}</p>
                    <p className="mt-0.5 text-xs text-[#85858f]">{shift.type || "Custom Shift"}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#A1A1AA]">
                    {shift.startDate ? formatDate(shift.startDate) : "Start date not set"}
                    <span className="mx-1 text-[#686873]">–</span>
                    {shift.endDate ? formatDate(shift.endDate) : "Ongoing"}
                  </td>
                  <td className="px-5 py-4">{(shift.days || []).map((day) => day.slice(0, 3)).join(", ") || "—"}</td>
                  <td className="px-5 py-4">{shift.start} – {shift.end}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => editShift(shift)} aria-label="Edit shift" className="rounded-lg p-2 text-[#A1A1AA] transition hover:bg-white/[0.06] hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => deleteShift(shift)} aria-label="Delete shift" className="rounded-lg p-2 text-[#A1A1AA] transition hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-sm text-[#85858f]">
                    {shifts.length ? "No shifts match these filters." : "No employee shifts have been scheduled."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-4">
        <div className="h-8 w-40 rounded-lg bg-white/[0.06]" />
        <div className="h-14 rounded-2xl bg-white/[0.04]" />
        <div className="h-72 rounded-2xl border border-white/[0.06] bg-[#14141b]" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-8 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF727D]">Store administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Settings</h1>
          <p className={`mt-2 ${mutedTextClass}`}>Manage operating hours, store availability, and employee schedules.</p>
        </div>
        {!embedded && (
          <div className="flex gap-2">
            <Link to="/staff" className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.08] px-3 text-sm font-semibold text-[#C5C5CE] no-underline hover:bg-white/[0.04]">Dashboard</Link>
            <button type="button" onClick={logout} className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.08] px-3 text-sm font-semibold text-[#C5C5CE] transition hover:bg-white/[0.04]">Logout</button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.08] pb-3" role="tablist" aria-label="Settings sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => {
            setActiveTab(id);
            if (embedded && location.pathname !== tabRoutes[id]) navigate(tabRoutes[id]);
          }} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${activeTab === id ? "bg-[#E63946]/10 text-[#FF929A]" : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Settings could not be loaded.</p>
            <p className="mt-1 text-rose-200/80">{loadError}</p>
            <button type="button" onClick={() => { setLoading(true); setLoadAttempt((attempt) => attempt + 1); }} className="mt-3 rounded-lg border border-rose-200/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/10">Retry</button>
          </div>
        </div>
      )}

      <div role="tabpanel">
        {activeTab === "schedule" && renderSchedule()}
        {activeTab === "availability" && renderAvailability()}
        {activeTab === "shifts" && renderShifts()}
      </div>
    </main>
  );
}
