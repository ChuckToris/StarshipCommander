import React, { useEffect, useRef } from 'react';
import { useGame } from '../hooks/use-game';

export const SummaryPane: React.FC = () => {
  const { getFilteredLogs } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const summaryLogs = getFilteredLogs('summary');

  // Auto-scroll to bottom when new summaries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summaryLogs]);

  return (
    <div className="bg-secondary border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono text-gray-300">
          📊 Summary
        </h3>
        <span className="text-xs text-gray-500">
          Turn-by-turn recap
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-24 overflow-y-auto bg-gray-800 border border-gray-600 rounded p-2 space-y-1"
      >
        {summaryLogs.length === 0 ? (
          <div className="text-gray-500 text-xs text-center mt-2">
            Battle not yet started
          </div>
        ) : (
          summaryLogs.slice(-5).map(log => (
            <div 
              key={log.id} 
              className="text-xs font-mono text-gray-300 flex items-center gap-2"
            >
              <span>📊</span>
              <span className="flex-1">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};