'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { NextAppointmentSuggestion } from '@agendamiento/shared';

interface AppointmentCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  workingDays?: number[]; // [1, 2, 3, 4, 5]
  suggestion?: NextAppointmentSuggestion | null;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function AppointmentCalendar({
  selectedDate,
  onSelectDate,
  workingDays = [1, 2, 3, 4, 5],
  suggestion,
}: AppointmentCalendarProps) {
  // Inicializar mes y año con la fecha seleccionada o actual
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-11

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Generar matriz de días para el mes actual
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Dom) a 6 (Sáb)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isWorkingDay: boolean;
      isSuggested: boolean;
      isPast: boolean;
    }[] = [];

    // Días del mes anterior para rellenar
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(prevY, prevM - 1, dayNum).getDay();
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isWorkingDay: workingDays.includes(dayOfWeek),
        isSuggested: false,
        isPast: dateStr < todayStr,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth, i).getDay();

      let isSuggested = false;
      if (suggestion?.suggestedDate) {
        const suggDateOnly = suggestion.suggestedDate.split('T')[0];
        if (dateStr === suggDateOnly) {
          isSuggested = true;
        }
      }

      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: true,
        isWorkingDay: workingDays.includes(dayOfWeek),
        isSuggested,
        isPast: dateStr < todayStr,
      });
    }

    // Días del mes siguiente para completar cuadrícula (múltiplo de 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = new Date(nextY, nextM - 1, i).getDay();
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false,
        isWorkingDay: workingDays.includes(dayOfWeek),
        isSuggested: false,
        isPast: dateStr < todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, workingDays, suggestion, todayStr]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-app)',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Cabecera del Calendario */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={18} style={{ color: 'var(--primary-600)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'capitalize' }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleGoToToday}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handlePrevMonth}
            style={{ padding: '0.25rem', minWidth: '28px', height: '28px' }}
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleNextMonth}
            style={{ padding: '0.25rem', minWidth: '28px', height: '28px' }}
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          paddingBottom: '0.375rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {DAY_NAMES.map((d, idx) => (
          <div key={idx} style={{ padding: '0.25rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.25rem',
        }}
      >
        {calendarDays.map((item, idx) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                border: isSelected
                  ? '2px solid var(--primary-600)'
                  : item.isSuggested
                  ? '1.5px dashed var(--primary-500)'
                  : isToday
                  ? '1px solid var(--primary-400)'
                  : '1px solid transparent',
                backgroundColor: isSelected
                  ? 'var(--primary-600)'
                  : item.isSuggested
                  ? 'var(--primary-50)'
                  : 'transparent',
                color: isSelected
                  ? '#ffffff'
                  : !item.isCurrentMonth
                  ? 'var(--text-light)'
                  : !item.isWorkingDay
                  ? 'var(--text-muted)'
                  : 'var(--text-main)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s ease',
                opacity: !item.isCurrentMonth ? 0.45 : item.isPast && !isSelected ? 0.6 : 1,
              }}
              title={
                !item.isWorkingDay
                  ? `${item.dateStr} (Día no laboral - Clic para agendamiento excepcional)`
                  : item.isSuggested
                  ? `${item.dateStr} (Fecha sugerida por el sistema)`
                  : item.dateStr
              }
            >
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: isSelected || isToday ? 800 : 500,
                }}
              >
                {item.dayNumber}
              </span>

              {/* Indicadores visuales */}
              <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '2px' }}>
                {item.isSuggested && !isSelected && (
                  <Sparkles size={8} style={{ color: 'var(--primary-600)' }} />
                )}
                {!item.isWorkingDay && item.isCurrentMonth && !isSelected && (
                  <span
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--warning-text)',
                    }}
                    title="Día no laboral"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Leyenda rápida */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }} />
          <span>Seleccionado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Sparkles size={10} style={{ color: 'var(--primary-600)' }} />
          <span>Sugerido</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning-text)' }} />
          <span>Día no laboral (excepcional)</span>
        </div>
      </div>
    </div>
  );
}
