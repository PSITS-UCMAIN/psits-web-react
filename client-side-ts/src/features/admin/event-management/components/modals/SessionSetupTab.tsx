import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Sunrise, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { EventFormData, SessionData } from './AddEventModal';

interface SessionSetupTabProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState({ hour: 7, minute: 30, period: 'AM' as 'AM' | 'PM' });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!showPicker || !triggerRef.current) return;
    const ESTIMATED_PICKER_WIDTH = 320; // px
    const ESTIMATED_PICKER_HEIGHT = 360; // px

    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;

      // Preferred position: below the trigger
      let left = rect.left + window.scrollX;
      let top = rect.bottom + scrollY + 8;

      // Constrain left so the picker doesn't overflow the right edge
      const maxPickerWidth = Math.min(viewportWidth - 16, ESTIMATED_PICKER_WIDTH);
      if (left + maxPickerWidth + 8 > viewportWidth + window.scrollX) {
        left = Math.max(8 + window.scrollX, viewportWidth + window.scrollX - maxPickerWidth - 8);
      }

      // If there's not enough space below, try placing above the trigger
      const spaceBelow = viewportHeight - rect.bottom;
      if (spaceBelow < 200) {
        // place above when possible
        top = rect.top + scrollY - ESTIMATED_PICKER_HEIGHT - 8;
        // if still negative, fallback to below
        if (top < scrollY + 8) top = rect.bottom + scrollY + 8;
      }

      setPosition({ top: Math.round(top), left: Math.round(left) });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [showPicker]);

  useEffect(() => {
    if (!showPicker || !value) return;
    const m = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      const h = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const p = (m[3] || 'AM').toUpperCase() as 'AM' | 'PM';
      setTime({ hour: h, minute: mm, period: p });
    }
  }, [showPicker, value]);

  const formatTime = (h = time.hour, m = time.minute, p = time.period) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
  };

  const pickerContent = (
    <div className="bg-white border rounded-lg shadow-lg p-4 min-w-0 w-[95vw] max-w-[320px] sm:min-w-[280px] sm:w-auto">
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-3xl font-semibold">{formatTime()}</div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <Button
          size="sm"
          variant={time.period === 'AM' ? 'default' : 'outline'}
          onClick={() => {
            setTime(prev => ({ ...prev, period: 'AM' }));
            onChange(formatTime(time.hour, time.minute, 'AM'));
          }}
          className={cn(time.period === 'AM' && 'bg-[#1C9DDE] hover:bg-[#1C9DDE]', 'cursor-pointer')}
        >
          AM
        </Button>
        <Button
          size="sm"
          variant={time.period === 'PM' ? 'default' : 'outline'}
          onClick={() => {
            setTime(prev => ({ ...prev, period: 'PM' }));
            onChange(formatTime(time.hour, time.minute, 'PM'));
          }}
          className={cn(time.period === 'PM' && 'bg-[#1C9DDE] hover:bg-[#1C9DDE]', 'cursor-pointer')}
        >
          PM
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm mb-2 block">Hour</Label>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>01</span>
            <span className="text-[#1C9DDE] font-semibold">{String(time.hour).padStart(2, '0')}</span>
            <span>12</span>
          </div>
          <Slider
            value={[time.hour]}
            onValueChange={(val) => {
              const newHour = val[0];
              setTime(prev => ({ ...prev, hour: newHour }));
              onChange(formatTime(newHour, time.minute, time.period));
            }}
            min={1}
            max={12}
            step={1}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-sm mb-2 block">Minutes</Label>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>00</span>
            <span className="text-[#1C9DDE] font-semibold">{String(time.minute).padStart(2, '0')}</span>
            <span>59</span>
          </div>
          <Slider
            value={[time.minute]}
            onValueChange={(val) => {
              const newMinute = val[0];
              setTime(prev => ({ ...prev, minute: newMinute }));
              onChange(formatTime(time.hour, newMinute, time.period));
            }}
            min={0}
            max={59}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1 cursor-pointer" onClick={() => setShowPicker(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-[#1C9DDE] hover:bg-[#1C9DDE] cursor-pointer"
          onClick={() => {
            onChange(formatTime());
            setShowPicker(false);
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={triggerRef}>
      <Button
        variant="outline"
        onClick={() => setShowPicker((s) => !s)}
        className="w-full justify-between cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {label && <span className="text-muted-foreground">{label}</span>}
          {formatTime()}
        </span>
      </Button>

      {showPicker && typeof document !== 'undefined'
        ? createPortal(
            position && window.innerWidth >= 640 ? (
              <div
                style={{ position: 'absolute', top: position.top + 'px', left: position.left + 'px', zIndex: 99999 }}
                className="pointer-events-auto"
              >
                {pickerContent}
              </div>
            ) : (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 pointer-events-auto">
                <div className="pointer-events-auto">{pickerContent}</div>
              </div>
            ),
            document.body
          ) : null}
    </div>
  );
};

interface SessionItemProps {
  date: string;
  session: SessionData;
  onUpdate: (session: SessionData) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ date, session, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded((s) => !s)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">{date}</span>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 border-t space-y-4 bg-gray-50/50">
          {/* Morning Session */}
          <div className="flex items-center gap-3">
            <Checkbox
              id={`morning-${date}`}
              checked={session.morningSession.enabled}
              onCheckedChange={(checked) =>
                onUpdate({ ...session, morningSession: { ...session.morningSession, enabled: !!checked } })
              }
            />
            <Sunrise className="h-5 w-5 text-orange-500" />
            <Label htmlFor={`morning-${date}`} className="flex-1 cursor-pointer">
              Morning Session
            </Label>
            {session.morningSession.enabled && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                <div className="flex-1">
                  <TimePicker
                    value={session.morningSession.startTime}
                    onChange={(val) => onUpdate({ ...session, morningSession: { ...session.morningSession, startTime: val } })}
                  />
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">to</span>
                <div className="flex-1">
                  <TimePicker
                    value={session.morningSession.endTime}
                    onChange={(val) => onUpdate({ ...session, morningSession: { ...session.morningSession, endTime: val } })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Afternoon Session */}
          <div className="flex items-center gap-3">
            <Checkbox
              id={`afternoon-${date}`}
              checked={session.afternoonSession.enabled}
              onCheckedChange={(checked) =>
                onUpdate({ ...session, afternoonSession: { ...session.afternoonSession, enabled: !!checked } })
              }
            />
            <Sun className="h-5 w-5 text-yellow-500" />
            <Label htmlFor={`afternoon-${date}`} className="flex-1 cursor-pointer">
              Afternoon Session
            </Label>
            {session.afternoonSession.enabled && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                <div className="flex-1">
                  <TimePicker
                    value={session.afternoonSession.startTime}
                    onChange={(val) => onUpdate({ ...session, afternoonSession: { ...session.afternoonSession, startTime: val } })}
                  />
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">to</span>
                <div className="flex-1">
                  <TimePicker
                    value={session.afternoonSession.endTime}
                    onChange={(val) => onUpdate({ ...session, afternoonSession: { ...session.afternoonSession, endTime: val } })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Evening Session */}
          <div className="flex items-center gap-3">
            <Checkbox
              id={`evening-${date}`}
              checked={session.eveningSession.enabled}
              onCheckedChange={(checked) =>
                onUpdate({ ...session, eveningSession: { ...session.eveningSession, enabled: !!checked } })
              }
            />
            <Moon className="h-5 w-5 text-indigo-500" />
            <Label htmlFor={`evening-${date}`} className="flex-1 cursor-pointer">
              Evening Session
            </Label>
            {session.eveningSession.enabled && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                <div className="flex-1">
                  <TimePicker
                    value={session.eveningSession.startTime}
                    onChange={(val) => onUpdate({ ...session, eveningSession: { ...session.eveningSession, startTime: val } })}
                  />
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">to</span>
                <div className="flex-1">
                  <TimePicker
                    value={session.eveningSession.endTime}
                    onChange={(val) => onUpdate({ ...session, eveningSession: { ...session.eveningSession, endTime: val } })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SessionSetupTab: React.FC<SessionSetupTabProps> = ({ formData, setFormData }) => {
  const sampleDates = ['23 Jan 2025', '24 Jan 2025', '25 Jan 2025'];

  useEffect(() => {
    if (formData.sessions.length === 0) {
      const initialSessions: SessionData[] = sampleDates.map((date) => ({
        date,
        morningSession: { enabled: false, startTime: '07:30 AM', endTime: '12:00 PM' },
        afternoonSession: { enabled: false, startTime: '01:00 PM', endTime: '03:00 PM' },
        eveningSession: { enabled: false, startTime: '05:00 PM', endTime: '08:00 PM' },
      }));
      setFormData((prev) => ({ ...prev, sessions: initialSessions }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSessionUpdate = (index: number, session: SessionData) => {
    setFormData((prev) => ({ ...prev, sessions: prev.sessions.map((s, i) => (i === index ? session : s)) }));
  };

  return (
    <div className="space-y-3 w-full h-full">
      {formData.sessions.map((session, index) => (
        <SessionItem key={session.date} date={session.date} session={session} onUpdate={(updated) => handleSessionUpdate(index, updated)} />
      ))}
    </div>
  );
};
