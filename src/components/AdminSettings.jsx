import { useEffect, useMemo, useState } from "react";
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
const shiftTypes = ["Morning Shift", "Afternoon Shift", "Evening Shift", "Custom Shift"];
const tabs = [
  { id: "schedule", label: "Operating Schedule", icon: CalendarDays },
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

export default function AdminSettings({ embedded = false, initialTab = "schedule" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [schedule, setSchedule] = useState(createEmptySchedule);
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

  const saveOperatingSchedule = async () => {
    for (const day of days) {
      const entry = schedule[day];
      if (!entry.enabled) continue;
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
          <h2 className="text-lg font-bold text-white">Edit operating schedule</h2>
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
                <label className="space-y-1 text-xs text-[#A1A1AA]">
                  Opening time
                  <input
                    type="time"
                    aria-label={`${day} opening time`}
                    value={entry.opening}
                    disabled={!entry.enabled}
                    onChange={(event) => updateDay(day, "opening", event.target.value)}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                </label>
                <label className="space-y-1 text-xs text-[#A1A1AA]">
                  Closing time
                  <input
                    type="time"
                    aria-label={`${day} closing time`}
                    value={entry.closing}
                    disabled={!entry.enabled}
                    onChange={(event) => updateDay(day, "closing", event.target.value)}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" disabled={savingSchedule} onClick={saveOperatingSchedule} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#E63946] px-4 text-sm font-bold text-white transition hover:bg-[#d62f3c] disabled:cursor-wait disabled:opacity-60">
            {savingSchedule ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save schedule
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
