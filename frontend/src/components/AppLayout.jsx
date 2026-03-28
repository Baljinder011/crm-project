import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Pages/Sidebar';
import { useAuth } from '../context/AuthContext';

const AppLayout = ({ eyebrow = 'CRM Overview', title = 'Dashboard', description, children }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showNotifications) return;
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

  const userInitials = String(user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const resolvedDescription = description ?? (user?.email ? `Logged in as ${user.email}` : '');

  const notifications = [
    {
      id: 1,
      title: 'Orbit EduTech moved to Negotiation',
      time: '2 hours ago',
      status: 'info',
      unread: true,
    },
    {
      id: 2,
      title: 'BluePeak Foods scheduled a demo call',
      time: 'Yesterday',
      status: 'success',
      unread: true,
    },
    {
      id: 3,
      title: 'Weekly pipeline report is ready',
      time: '2 days ago',
      status: 'neutral',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_-10%_-20%,#dbeafe_0%,transparent_60%),radial-gradient(900px_600px_at_120%_-10%,#e0f2fe_0%,transparent_55%)]" />

      <Sidebar />

      <div className="relative ml-72 min-h-screen">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-100/80 px-8 py-6 backdrop-blur lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-800 lg:text-4xl">{title}</h1>
              {resolvedDescription ? (
                <p className="mt-2 text-sm text-slate-500">{resolvedDescription}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden w-full md:block md:w-96">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-700"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>

                {showNotifications ? (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Notifications</p>
                        <p className="text-xs text-slate-400">{unreadCount} unread</p>
                      </div>
                      <button className="text-xs font-semibold text-indigo-600">Mark all read</button>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {notifications.map((item) => (
                        <div key={item.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                item.status === 'success'
                                  ? 'bg-emerald-500'
                                  : item.status === 'info'
                                  ? 'bg-indigo-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                            </div>
                            {item.unread ? (
                              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                New
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/notifications');
                        }}
                        className="w-full rounded-full border border-slate-200/70 bg-slate-50/80 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#2596be] to-[#670bb8] text-xs font-semibold text-white">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-sm font-medium text-slate-700">{user?.name || 'User'}</div>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        <main className="relative p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
