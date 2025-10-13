'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, Users, Wrench } from 'lucide-react';

interface Agent {
  name: string;
  description: string;
  model: 'haiku' | 'sonnet' | 'opus';
  type: 'agent' | 'workflow' | 'tool';
  tools?: string[];
}

interface AgentSelectorProps {
  onSelectAgent: (agentName: string) => void;
  selectedAgent?: string;
  projectType?: string;
}

export default function AgentSelector({ onSelectAgent, selectedAgent, projectType }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Record<string, Agent[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);

  // Load agents on mount
  useEffect(() => {
    fetch('/api/agents/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAgents(data.agents);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load agents:', err);
        setLoading(false);
      });
  }, []);

  // Filter agents based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAgents([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allAgents: Agent[] = [];

    // Flatten all agents from all categories
    Object.values(agents).forEach(category => {
      allAgents.push(...category);
    });

    // Filter by name or description
    const filtered = allAgents.filter(agent =>
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query)
    );

    setFilteredAgents(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchQuery, agents]);

  const getModelBadgeColor = (model: string) => {
    switch (model) {
      case 'opus':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'sonnet':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'haiku':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return <Users className="w-3 h-3" />;
      case 'tool':
        return <Wrench className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/60"></div>
        Loading agents...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search specialized agents..."
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
        {selectedAgent && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-purple-300">
              {selectedAgent}
            </span>
            <button
              onClick={() => {
                onSelectAgent('');
                setSearchQuery('');
              }}
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && filteredAgents.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {filteredAgents.map((agent) => (
            <button
              key={agent.name}
              onClick={() => {
                onSelectAgent(agent.name);
                setSearchQuery('');
                setShowDropdown(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(agent.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">
                      {agent.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getModelBadgeColor(agent.model)}`}>
                      {agent.model}
                    </span>
                    <span className="text-xs text-white/40 capitalize">
                      {agent.type}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2">
                    {agent.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
