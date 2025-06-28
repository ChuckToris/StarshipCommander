import React, { useEffect, useRef } from 'react';
import { useGame } from '../hooks/use-game';

export const AlertsPane: React.FC = () => {
  const { getFilteredLogs } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const alertLogs = getFilteredLogs('alerts');

  // Auto-scroll to bottom when new alerts are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [alertLogs]);

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono text-gray-300">
          🚨 Alerts
        </h3>
        <span className="text-xs text-gray-500">
          {alertLogs.length} active
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-24 overflow-y-auto bg-gray-800 border border-gray-600 rounded p-2 space-y-1"
      >
        {alertLogs.length === 0 ? (
          <div className="text-gray-500 text-xs text-center mt-2">
            All systems nominal
          </div>
        ) : (
          alertLogs.slice(-10).map(log => (
            <div 
              key={log.id} 
              className="text-xs font-mono text-warning flex items-center gap-2 animate-pulse"
            >
              <span className="text-danger">🚨</span>
              <span className="flex-1">{log.text.replace('🚨', '').trim()}</span>
              <span className="text-gray-500">T{log.turnNumber}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};