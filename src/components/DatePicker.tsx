import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
  isAfter,
  getDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  selectedDate: Date | null;
  selectedEndDate?: Date | null;
  onChange: (date: Date) => void;
  onEndDateChange?: (date: Date) => void;
  isRange?: boolean;
  minDate?: Date;
}

export default function DatePicker({
  selectedDate,
  selectedEndDate,
  onChange,
  onEndDateChange,
  isRange = false,
  minDate,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leere Tage am Anfang (Montag = 0)
  const startDay = getDay(monthStart);
  const emptyDays = startDay === 0 ? 6 : startDay - 1;

  const handleDayClick = (day: Date) => {
    if (minDate && isBefore(day, minDate)) return;

    if (isRange) {
      if (!selectingEnd || !selectedDate) {
        onChange(day);
        setSelectingEnd(true);
      } else {
        if (isBefore(day, selectedDate)) {
          onChange(day);
        } else {
          onEndDateChange?.(day);
          setSelectingEnd(false);
        }
      }
    } else {
      onChange(day);
    }
  };

  const isInRange = (day: Date) => {
    if (!isRange || !selectedDate || !selectedEndDate) return false;
    return isWithinInterval(day, {
      start: selectedDate,
      end: selectedEndDate,
    });
  };

  const isRangeStart = (day: Date) => {
    return selectedDate && isSameDay(day, selectedDate);
  };

  const isRangeEnd = (day: Date) => {
    return selectedEndDate && isSameDay(day, selectedEndDate);
  };

  const isDisabled = (day: Date) => {
    return minDate && isBefore(day, minDate);
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {format(currentMonth, "MMMM yyyy", { locale: de })}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Wochentage */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Tage */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Leere Tage */}
        {Array.from({ length: emptyDays }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Kalender-Tage */}
        {days.map((day) => {
          const isSelected = isRangeStart(day) || isRangeEnd(day);
          const inRange = isInRange(day);
          const disabled = isDisabled(day);
          const isTodayDate = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={disabled}
              className={`
                aspect-square flex items-center justify-center text-xs rounded
                transition-all duration-100
                ${disabled ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "bg-blue-600 text-white font-semibold" : ""}
                ${inRange && !isSelected ? "bg-blue-100 text-blue-700" : ""}
                ${!isSelected && !inRange && !disabled ? "hover:bg-white text-gray-700" : ""}
                ${isTodayDate && !isSelected ? "ring-1 ring-blue-400 ring-inset font-medium" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Range Info */}
      {isRange && selectedDate && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500 text-center">
          {selectingEnd ? (
            <span>Enddatum wählen</span>
          ) : selectedEndDate ? (
            <span>
              {format(selectedDate, "d. MMM", { locale: de })} – {format(selectedEndDate, "d. MMM yyyy", { locale: de })}
            </span>
          ) : (
            <span>{format(selectedDate, "d. MMMM yyyy", { locale: de })}</span>
          )}
        </div>
      )}
    </div>
  );
}
