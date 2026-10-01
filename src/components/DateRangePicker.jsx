import React, { useState, useEffect, useRef } from 'react';

export default function DateRangePicker({ onDateChange, defaultMonth }) {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [activePicker, setActivePicker] = useState(null); // 'start' or 'end'
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (defaultMonth) {
            const date = new Date(defaultMonth);
            if (!isNaN(date)) return date;
        }
        return new Date();
    });
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setActivePicker(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        return { daysInMonth, firstDayOfMonth };
    };

    const handleDateClick = (day) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (activePicker === 'start') {
            if (endDate && newDate > endDate) {
                setStartDate(newDate);
                setEndDate(null);
            } else {
                setStartDate(newDate);
            }
            setActivePicker(null);
        } else if (activePicker === 'end') {
            if (startDate && newDate < startDate) {
                setStartDate(newDate);
                setEndDate(null);
                setActivePicker(null);
            } else {
                setEndDate(newDate);
                setActivePicker(null);
            }
        }
        onDateChange({
            start: activePicker === 'start' ? newDate : startDate,
            end: activePicker === 'end' ? newDate : endDate
        });
    };

    const minDate = defaultMonth ? new Date(defaultMonth) : null;
    if (minDate) minDate.setHours(0, 0, 0, 0);

    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const isPrevMonthDisabled = minDate && (currentMonth.getFullYear() < minDate.getFullYear() || (currentMonth.getFullYear() === minDate.getFullYear() && currentMonth.getMonth() <= minDate.getMonth()));
    const prevMonth = () => {
        if (!isPrevMonthDisabled) {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
        }
    };

    const clearDates = () => {
        setStartDate(null);
        setEndDate(null);
        setActivePicker(null);
        onDateChange({ start: null, end: null });
    };

    const setToday = () => {
        const today = new Date();
        if (activePicker === 'start') {
            setStartDate(today);
            if (endDate && today > endDate) setEndDate(null);
        } else {
            setEndDate(today);
            if (startDate && today < startDate) setStartDate(today);
        }
        setCurrentMonth(today);
        setActivePicker(null);
        onDateChange({
            start: activePicker === 'start' ? today : startDate,
            end: activePicker === 'end' ? today : endDate
        });
    };

    const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentMonth);
    const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push({ day: prevMonthDays - firstDayOfMonth + i + 1, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ day: i, isCurrentMonth: true });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        days.push({ day: i, isCurrentMonth: false });
    }

    const formatDate = (d) => d ? `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}` : 'Select Date';
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    const isSelected = (day, isCurrentMonth) => {
        if (!isCurrentMonth) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const isStart = startDate && date.toDateString() === startDate.toDateString();
        const isEnd = endDate && date.toDateString() === endDate.toDateString();
        return isStart || isEnd;
    };

    const isBetween = (day, isCurrentMonth) => {
        if (!isCurrentMonth || !startDate || !endDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date > startDate && date < endDate;
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex items-center bg-[#131729] rounded-2xl border border-white/5 p-1.5 shadow-lg">
                <button 
                    onClick={() => setActivePicker('start')}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${activePicker === 'start' ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-purple-400 tracking-wider">START DATE</div>
                        <div className={`text-xs font-bold ${startDate ? 'text-white' : 'text-slate-400'}`}>{formatDate(startDate)}</div>
                    </div>
                </button>
                
                <div className="w-px h-8 bg-white/10 mx-2 -rotate-12"></div>
                
                <button 
                    onClick={() => setActivePicker('end')}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${activePicker === 'end' ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div className="text-left">
                        <div className="text-[10px] font-bold text-emerald-500 tracking-wider">END DATE</div>
                        <div className={`text-xs font-bold ${endDate ? 'text-white' : 'text-slate-400'}`}>{formatDate(endDate)}</div>
                    </div>
                </button>
            </div>

            {activePicker && (
                <div className="absolute top-full right-0 lg:left-0 lg:right-auto mt-2 w-[260px] bg-[#111424] rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center p-3 border-b border-white/5">
                        <button onClick={prevMonth} disabled={isPrevMonthDisabled} className={`p-1 ${isPrevMonthDisabled ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>
                        <div className="font-bold text-white text-xs tracking-widest italic">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
                        <button onClick={nextMonth} className="text-slate-400 hover:text-white p-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    
                    <div className="p-3">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                                <div key={day} className="text-center text-[10px] font-bold text-slate-500">{day}</div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((d, i) => {
                                const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d.day);
                                dateObj.setHours(0, 0, 0, 0);
                                const isDisabledDate = minDate && dateObj < minDate;
                                const isClickable = d.isCurrentMonth && !isDisabledDate;
                                
                                return (
                                    <button 
                                        key={i}
                                        disabled={!isClickable}
                                        onClick={() => isClickable && handleDateClick(d.day)}
                                        className={`
                                            h-7 w-full rounded-md text-[11px] font-bold flex items-center justify-center transition-all
                                            ${!isClickable ? 'text-slate-700 cursor-default opacity-50' : 'hover:bg-white/10 cursor-pointer'}
                                            ${isSelected(d.day, d.isCurrentMonth) ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : ''}
                                            ${isBetween(d.day, d.isCurrentMonth) ? 'bg-purple-500/20 text-purple-300' : ''}
                                            ${isClickable && !isSelected(d.day, d.isCurrentMonth) && !isBetween(d.day, d.isCurrentMonth) ? 'text-slate-300' : ''}
                                        `}
                                    >
                                        {d.day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-3 border-t border-white/5 bg-black/20">
                        <button onClick={clearDates} className="text-[11px] font-bold text-slate-400 hover:text-white tracking-wider transition-colors">CLEAR</button>
                        <button onClick={setToday} className="text-[11px] font-bold text-purple-400 hover:text-purple-300 tracking-wider transition-colors">TODAY</button>
                    </div>
                </div>
            )}
        </div>
    );
}
