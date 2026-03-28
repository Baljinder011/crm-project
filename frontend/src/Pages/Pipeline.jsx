import React, { useEffect, useRef, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Building, User, DollarSign, Calendar, Search, ChevronLeft, ChevronRight, Plus, FileUp, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

const initialLeads = [
  { id: '1', title: 'Test Lead 2', company: 'ABC', status: 'new', amount: '1,000', date: '03/05/2026' },
  { id: '2', title: 'Test Lead', company: 'XYZ', status: 'new', amount: '123', date: '03/03/2026' },
  { id: '3', title: 'Zaid Company', company: 'ABC', status: 'proposal', amount: '1,000', date: '03/10/2026' },
];

const stages = [
  { id: 'new', name: 'New Lead' },
  { id: 'scheduled', name: 'Demo Scheduled' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'proposal', name: 'Proposal Sent' },
  { id: 'won', name: 'Won' },
  { id: 'lost', name: 'Lost' },
];

const Pipeline = () => {
  const { token } = useAuth();
  const [leads, setLeads] = useState(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'table'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rangeLabel, setRangeLabel] = useState('Date range');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const datePickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showDatePicker) return;
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDatePicker]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const getMonthWeeks = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let week = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) {
      week.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      week.push(new Date(year, month, day));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const applyPreset = (preset) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        setRangeLabel('Today');
        break;
      case 'yesterday': {
        const y = new Date();
        y.setDate(today.getDate() - 1);
        start = y;
        end = y;
        setRangeLabel('Yesterday');
        break;
      }
      case 'last7': {
        const s = new Date();
        s.setDate(today.getDate() - 6);
        start = s;
        end = today;
        setRangeLabel('Last 7 days');
        break;
      }
      case 'last30': {
        const s = new Date();
        s.setDate(today.getDate() - 29);
        start = s;
        end = today;
        setRangeLabel('Last 30 days');
        break;
      }
      case 'thisMonth': {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        start = s;
        end = e;
        setRangeLabel('This month');
        break;
      }
      case 'lastMonth': {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        start = s;
        end = e;
        setRangeLabel('Last month');
        break;
      }
      default:
        setRangeLabel('Custom');
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setShowDatePicker(false);
  };

  const applyCustomRange = () => {
    if (startDate && endDate) {
      setRangeLabel(`${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`);
      setShowDatePicker(false);
      return;
    }
    setRangeLabel('Custom');
    setShowDatePicker(false);
  };

  const clearRange = () => {
    setShowDatePicker(false);
  };

  const handleDayClick = (date) => {
    if (!date) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      setRangeLabel('Custom');
      return;
    }
    if (date < startDate) {
      setEndDate(startDate);
      setStartDate(date);
      setRangeLabel('Custom');
      return;
    }
    setEndDate(date);
    setRangeLabel('Custom');
  };

  useEffect(() => {
    if (!token) return;

    const formatBackendDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const fetchContacts = async () => {
      try {
        const response = await apiRequest('/contacts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const mapped = (response?.contacts || []).map((contact) => ({
          id: String(contact.id),
          title: contact.full_name || contact.email || 'Unnamed Lead',
          company: contact.company || 'Unknown',
          status: 'new',
          amount: contact.amount ? String(contact.amount) : '0',
          date: formatBackendDate(contact.created_at),
        }));

        setLeads(mapped);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };

    fetchContacts();
  }, [token]);

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    setLeads(leads.map(lead => lead.id === draggableId ? { ...lead, status: destination.droppableId } : lead));
  };

  const filteredLeads = leads.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const leftMonth = calendarMonth;
  const rightMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  const leftWeeks = getMonthWeeks(leftMonth);
  const rightWeeks = getMonthWeeks(rightMonth);
  const isCustomRange = rangeLabel === 'Custom' || (rangeLabel && rangeLabel.includes('-'));
  const quickSelectClass = (active) =>
    `rounded-lg px-2 py-1 text-left text-sm transition ${
      active ? 'bg-white text-slate-800 font-semibold' : 'text-slate-600 hover:bg-white'
    }`;

  return (
    <AppLayout title="Presales Pipeline" eyebrow="CRM Overview">
      
      {/* HEADER: Search, View Toggle & Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4 w-full">
           <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, email..."
                className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           {/* VIEW TOGGLE */}
           <div className="flex border border-slate-200/70 rounded-full bg-white/90 p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-slate-100 text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <TableIcon size={16}/> Table
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  viewMode === 'board'
                    ? 'bg-slate-100 text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid size={16}/> Board
              </button>
           </div>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"><FileUp size={16}/> Import</button>
          <button className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"><Plus size={16}/> Add Lead</button>
        </div>
      </div>

      {/* PAGINATION BAR */}
      <div className="flex justify-end items-center gap-4 mb-4 text-sm text-slate-500">
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            <Calendar size={14} />
            {rangeLabel}
          </button>

          {showDatePicker ? (
            <div className="absolute right-0 z-20 mt-3 w-[700px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur">
              <div className="grid grid-cols-[180px_1fr]">
                <div className="border-r border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quick select</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button onClick={() => applyPreset('today')} className={quickSelectClass(rangeLabel === 'Today')}>Today</button>
                    <button onClick={() => applyPreset('yesterday')} className={quickSelectClass(rangeLabel === 'Yesterday')}>Yesterday</button>
                    <button onClick={() => applyPreset('last7')} className={quickSelectClass(rangeLabel === 'Last 7 days')}>Last 7 days</button>
                    <button onClick={() => applyPreset('last30')} className={quickSelectClass(rangeLabel === 'Last 30 days')}>Last 30 days</button>
                    <button onClick={() => applyPreset('thisMonth')} className={quickSelectClass(rangeLabel === 'This month')}>This month</button>
                    <button onClick={() => applyPreset('lastMonth')} className={quickSelectClass(rangeLabel === 'Last month')}>Last month</button>
                    <button onClick={() => setRangeLabel('Custom')} className={quickSelectClass(isCustomRange)}>Custom</button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="rounded-full border border-slate-200/70 bg-white/90 p-1 text-slate-500 hover:text-slate-700"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="grid flex-1 grid-cols-2 text-center text-sm font-semibold text-slate-700">
                      <div>{monthNames[leftMonth.getMonth()]} {leftMonth.getFullYear()}</div>
                      <div>{monthNames[rightMonth.getMonth()]} {rightMonth.getFullYear()}</div>
                    </div>
                    <button
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="rounded-full border border-slate-200/70 bg-white/90 p-1 text-slate-500 hover:text-slate-700"
                      aria-label="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-6">
                    {[leftWeeks, rightWeeks].map((weeks, index) => (
                      <div key={index}>
                        <div className="grid grid-cols-7 text-[11px] font-semibold text-slate-400">
                          {dayNames.map((day) => (
                            <div key={`${index}-${day}`} className="text-center">{day}</div>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1">
                          {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="grid grid-cols-7 gap-1 text-center text-sm">
                              {week.map((date, dayIndex) => {
                                if (!date) {
                                  return <div key={`${weekIndex}-${dayIndex}`} className="h-8 w-8" />;
                                }
                                const isStart = isSameDay(date, startDate);
                                const isEnd = isSameDay(date, endDate);
                                const inRange = isInRange(date) && !isStart && !isEnd;
                                const dayClass = `mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
                                  isStart || isEnd
                                    ? 'bg-emerald-200 text-emerald-900 font-semibold'
                                    : inRange
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'text-slate-600 hover:bg-slate-100'
                                }`;
                                return (
                                  <button
                                    key={`${weekIndex}-${dayIndex}`}
                                    onClick={() => handleDayClick(date)}
                                    className={dayClass}
                                  >
                                    {date.getDate()}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Start date</label>
                      <div className="relative mt-2">
                        <input
                          type="text"
                          readOnly
                          value={formatDisplayDate(startDate)}
                          placeholder="Select start date"
                          className="w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <Calendar size={16} className="absolute right-3 top-3 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">End date</label>
                      <div className="relative mt-2">
                        <input
                          type="text"
                          readOnly
                          value={formatDisplayDate(endDate)}
                          placeholder="Select end date"
                          className="w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <Calendar size={16} className="absolute right-3 top-3 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={clearRange}
                      className="rounded-full border border-slate-200/70 bg-white px-6 py-2 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyCustomRange}
                      className="rounded-full bg-emerald-200/80 px-6 py-2 text-xs font-semibold text-emerald-900"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <span>Per page: </span>
        <select className="rounded-full border border-slate-200/70 bg-white/90 px-3 py-1"><option>25</option></select>
        <div className="flex items-center gap-2">
          <button className="p-1 border border-slate-200/70 rounded-full bg-white/90"><ChevronLeft size={16}/></button>
          <span className="font-bold bg-gradient-to-br from-[#2596be] to-[#670bb8] text-white px-2 py-1 rounded">1</span>
          <button className="p-1 border border-slate-200/70 rounded-full bg-white/90"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* MAIN CONTENT: Board or Table View */}
      {viewMode === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 h-[65vh]">
            {stages.map((stage) => (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-700">{stage.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{filteredLeads.filter(l => l.status === stage.id).length}</span>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 min-h-[500px]">
                      {filteredLeads.filter(l => l.status === stage.id).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm mb-3">
                              <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-800"><Building size={14}/> {lead.title}</h4>
                              <div className="text-xs space-y-1 text-slate-500">
                                <p className="flex items-center gap-2"><User size={12}/> {lead.company}</p>
                                <p className="flex items-center gap-2 text-indigo-600 font-semibold"><DollarSign size={12}/> AED {lead.amount}</p>
                                <p className="flex items-center gap-2"><Calendar size={12}/> {lead.date}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 text-slate-600">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Company</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="p-4">{lead.title}</td>
                  <td className="p-4">{lead.company}</td>
                  <td className="p-4 text-indigo-600 font-semibold">AED {lead.amount}</td>
                  <td className="p-4"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">{lead.status}</span></td>
                  <td className="p-4">{lead.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Pipeline;
