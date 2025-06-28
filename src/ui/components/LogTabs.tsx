import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../../domain/types';
import { useGame } from '../hooks/use-game';

interface LogTabProps {
  category: LogEntry['category'];
  label: string;
  emoji: string;
  isActive: boolean;
  onClick: () => void;
}

const LogTab: React.FC<LogTabProps> = ({ label, emoji, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-2 text-sm font-mono border-b-2 transition-colors duration-200
        ${isActive 
          ? 'text-white border-accent bg-accent/20' 
          : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'
        }
      `}
    >
      {emoji} {label}
    </button>
  );
};

interface LogPaneProps {
  logs: LogEntry[];
  category: LogEntry['category'];
}

const LogPane: React.FC<LogPaneProps> = ({ logs, category }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Group logs by turn for better readability
  const groupedLogs = logs.reduce((groups, log) => {
    if (!groups[log.turnNumber]) {
      groups[log.turnNumber] = [];
    }
    groups[log.turnNumber].push(log);
    return groups;
  }, {} as Record<number, LogEntry[]>);

  const turnNumbers = Object.keys(groupedLogs).map(Number).sort((a, b) => b - a);

  return (
    <div 
      ref={scrollRef}
      data-testid="event-log"
      className="h-48 overflow-y-auto bg-gray-800 border border-gray-600 rounded p-3 space-y-2"
    >
      {turnNumbers.length === 0 ? (
        <div className="text-gray-500 text-sm text-center mt-8">
          No {category} logs yet
        </div>
      ) : (
        turnNumbers.map(turnNumber => (
          <div key={turnNumber} className="space-y-1">
            {turnNumber > 0 && (
              <div className="text-xs text-gray-500 border-b border-gray-700 pb-1">
                Turn {turnNumber}
              </div>
            )}
            {groupedLogs[turnNumber].map(log => (
              <div 
                key={log.id} 
                className="text-sm font-mono text-gray-300 flex items-start gap-2"
              >
                <span className="flex-shrink-0">{log.emoji}</span>
                <span className="flex-1">{log.text}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export const LogTabs: React.FC = () => {
  const { getFilteredLogs } = useGame();
  const [activeTab, setActiveTab] = useState<LogEntry['category']>('tactical');

  const tabs = [
    { category: 'tactical' as const, label: 'Tactical', emoji: '⚔️' },
    { category: 'missile' as const, label: 'Missile', emoji: '🛰️' },
    { category: 'engineering' as const, label: 'Engineering', emoji: '⚙️' },
    { category: 'enemy' as const, label: 'Enemy', emoji: '💥' },
  ];

  // Add error handling for getFilteredLogs
  let currentLogs: LogEntry[] = [];
  try {
    currentLogs = getFilteredLogs ? getFilteredLogs(activeTab) : [];
  } catch (error) {
    console.error('Error getting filtered logs:', error);
    currentLogs = [];
  }

  return (
    <div data-testid="log-tabs" className="bg-secondary border border-gray-600 rounded-lg p-4">
      {/* Tab Headers */}
      <div className="flex space-x-1 mb-4 border-b border-gray-600">
        {tabs.map(tab => (
          <LogTab
            key={tab.category}
            category={tab.category}
            label={tab.label}
            emoji={tab.emoji}
            isActive={activeTab === tab.category}
            onClick={() => setActiveTab(tab.category)}
          />
        ))}
      </div>

      {/* Log Content */}
      <LogPane logs={currentLogs} category={activeTab} />
    </div>
  );
};