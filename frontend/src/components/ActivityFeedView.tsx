import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';
import type { ActivityLog } from '../types';
import { api } from '../services/api';

export const ActivityFeedView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs(100);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        );
      case 'ERROR':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> ERROR
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center gap-1">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Automation Runs & Audit Log</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of automation runs, duplicate lead prevention, AI scoring events, and SMTP delivery results.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#121217] p-1 rounded-xl border border-[#22222c]">
          <span className="text-[11px] text-slate-500 ml-2 mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Level:
          </span>
          {['ALL', 'SUCCESS', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterLevel === lvl
                  ? 'bg-[#f95721] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {lvl}
            </button>
          ))}

          <button
            onClick={loadLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="bg-[#121217] border border-[#22222c] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#f95721]" />
            <span>Loading audit log entries...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No audit logs recorded for this level.
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e28]">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-[#181822] transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2.5">
                    {getLevelBadge(log.level)}
                    <span className="font-bold text-white text-xs">{log.action}</span>
                    {log.run_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181824] text-slate-400 border border-[#2a2a38]">
                        Run #{log.run_id}
                      </span>
                    )}
                    {log.lead_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181824] text-slate-400 border border-[#2a2a38]">
                        Lead #{log.lead_id}
                      </span>
                    )}
                  </div>

                  {log.details && (
                    <p className="text-slate-300 leading-relaxed pt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 sm:text-right shrink-0">
                  {new Date(log.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
