"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
    value?: string;
    onChange?: (date: string) => void;
    placeholder?: string;
    className?: string;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Custom mini dropdown component
function MiniDropdown({
    value,
    options,
    onChange,
    width = "w-10"
}: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
    width?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-center gap-0.5 text-sm font-medium text-[#232323] bg-[#f8fafc] hover:bg-[#e8f0fe] rounded-md px-2 py-1 cursor-pointer border-0 outline-none transition-colors",
                    width
                )}
            >
                {selectedOption?.label || value}
            </button>
            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[100] bg-white rounded-lg shadow-lg border border-[#e8eef3] py-1 max-h-[120px] overflow-y-auto min-w-[48px]">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full px-2 py-1 text-xs text-center hover:bg-[#f0f5ff] transition-colors",
                                value === opt.value ? "bg-[#3371eb] text-white hover:bg-[#3371eb]" : "text-[#232323]"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function DatePicker({ value, onChange, placeholder = "Select date", className }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [day, setDay] = useState("25");
    const [month, setMonth] = useState("01");
    const [year, setYear] = useState("1990");
    const [viewMonth, setViewMonth] = useState(0);
    const [viewYear, setViewYear] = useState(1990);

    // Parse initial value
    useEffect(() => {
        if (value) {
            const parts = value.split("/");
            if (parts.length === 3) {
                setDay(parts[0]);
                setMonth(parts[1]);
                setYear(parts[2]);
                setViewMonth(parseInt(parts[1]) - 1);
                setViewYear(parseInt(parts[2]));
            }
        }
    }, [value]);

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        const d = new Date(year, month, 1).getDay();
        return d === 0 ? 6 : d - 1;
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(viewMonth, viewYear);
        const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
        const daysInPrevMonth = getDaysInMonth(viewMonth === 0 ? 11 : viewMonth - 1, viewMonth === 0 ? viewYear - 1 : viewYear);

        const days: { day: number; isCurrentMonth: boolean; isSelected: boolean }[] = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isSelected: false });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isSelected = i === parseInt(day) && viewMonth === parseInt(month) - 1 && viewYear === parseInt(year);
            days.push({ day: i, isCurrentMonth: true, isSelected });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isCurrentMonth: false, isSelected: false });
        }

        return days;
    };

    const handleDayClick = (dayNum: number, isCurrentMonth: boolean) => {
        if (!isCurrentMonth) return;

        const newDay = dayNum.toString().padStart(2, "0");
        const newMonth = (viewMonth + 1).toString().padStart(2, "0");
        const newYear = viewYear.toString();

        setDay(newDay);
        setMonth(newMonth);
        setYear(newYear);

        onChange?.(`${newDay}/${newMonth}/${newYear}`);
        setIsOpen(false);
    };

    const updateDate = (newDay: string, newMonth: string, newYear: string) => {
        setDay(newDay);
        setMonth(newMonth);
        setYear(newYear);
        setViewMonth(parseInt(newMonth) - 1);
        setViewYear(parseInt(newYear));
        onChange?.(`${newDay}/${newMonth}/${newYear}`);
    };

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const setToday = () => {
        const today = new Date();
        const newDay = today.getDate().toString().padStart(2, "0");
        const newMonth = (today.getMonth() + 1).toString().padStart(2, "0");
        const newYear = today.getFullYear().toString();
        updateDate(newDay, newMonth, newYear);
    };

    const calendarDays = generateCalendarDays();
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    // Generate options
    const dayOptions = Array.from({ length: 31 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, "0"),
        label: (i + 1).toString()
    }));
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, "0"),
        label: (i + 1).toString().padStart(2, "0")
    }));
    const yearOptions = Array.from({ length: 50 }, (_, i) => ({
        value: (1970 + i).toString(),
        label: (1970 + i).toString()
    }));

    return (
        <div className="relative">
            {/* Trigger Input */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-[50px] rounded-[15px] border border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-10 flex items-center cursor-pointer hover:border-[#3371eb] transition-colors",
                    className
                )}
            >
                {day && month && year ? (
                    <span>{`${day}/${month}/${year}`}</span>
                ) : (
                    <span className="text-[#a0aec0]">{placeholder}</span>
                )}
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#718ebf]" />
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl w-[280px] overflow-hidden"
                        style={{ boxShadow: "0px 4px 16px 0px rgba(0, 0, 0, 0.08)" }}>

                        {/* Date Selector Row */}
                        <div className="border-b border-[#f0f2f5] px-3 py-2.5 flex items-center justify-center gap-1">
                            <MiniDropdown
                                value={day}
                                options={dayOptions}
                                onChange={(v) => updateDate(v, month, year)}
                            />
                            <span className="text-[#c4cdd5] text-sm">/</span>
                            <MiniDropdown
                                value={month}
                                options={monthOptions}
                                onChange={(v) => updateDate(day, v, year)}
                            />
                            <span className="text-[#c4cdd5] text-sm">/</span>
                            <MiniDropdown
                                value={year}
                                options={yearOptions}
                                width="w-12"
                                onChange={(v) => updateDate(day, month, v)}
                            />
                        </div>

                        {/* Navigation Row */}
                        <div className="px-3 py-2 flex items-center justify-between">
                            <button
                                onClick={setToday}
                                className="bg-[#f4f6f8] rounded px-2 py-1 text-[10px] text-[#232323] hover:bg-[#e8eef3] transition-colors"
                            >
                                Today
                            </button>
                            <div className="flex items-center gap-1">
                                <button onClick={prevMonth} className="p-1 rounded hover:bg-[#f4f6f8]">
                                    <ChevronLeft className="w-3.5 h-3.5 text-[#718ebf]" />
                                </button>
                                <span className="text-[11px] text-[#232323] min-w-[32px] text-center font-medium">
                                    {MONTHS[viewMonth]}
                                </span>
                                <button onClick={nextMonth} className="p-1 rounded hover:bg-[#f4f6f8]">
                                    <ChevronRight className="w-3.5 h-3.5 text-[#718ebf]" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="px-2 pb-2">
                            <div className="grid grid-cols-7 gap-0">
                                {DAYS.map((d) => (
                                    <div key={d} className="text-center text-[9px] text-[#a0aec0] py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {weeks.slice(0, 6).map((week, weekIdx) => (
                                <div key={weekIdx} className="grid grid-cols-7 gap-0">
                                    {week.map((dayInfo, dayIdx) => (
                                        <button
                                            key={dayIdx}
                                            onClick={() => handleDayClick(dayInfo.day, dayInfo.isCurrentMonth)}
                                            disabled={!dayInfo.isCurrentMonth}
                                            className={cn(
                                                "text-center text-[11px] py-1.5 rounded-md transition-colors",
                                                dayInfo.isCurrentMonth
                                                    ? dayInfo.isSelected
                                                        ? "bg-[#3371eb] text-white"
                                                        : "text-[#232323] hover:bg-[#f0f5ff]"
                                                    : "text-[#d0d5dd] cursor-default"
                                            )}
                                        >
                                            {dayInfo.day}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
