'use client';

import { useEffect, useState } from 'react';

export interface PFCMetricsData {
  tokenBalance: number;
  contextPercentage: number;
  tokensUsed: number;
  tokensSaved: number;
  plan: string;
}

interface PFCMetricsProps {
  userId?: string;
  initialData?: Partial<PFCMetricsData>;
  compact?: boolean;
}

export default function PFCMetrics({ userId, initialData, compact = false }: PFCMetricsProps) {
  const [metrics, setMetrics] = useState<PFCMetricsData>({
    tokenBalance: initialData?.tokenBalance || 10000,
    contextPercentage: initialData?.contextPercentage || 0,
    tokensUsed: initialData?.tokensUsed || 0,
    tokensSaved: initialData?.tokensSaved || 0,
    plan: initialData?.plan || 'FREE',
  });

  const getTokenLimit = (plan: string) => {
    const limits: Record<string, number> = {
      FREE: 10000,
      PRO: 100000,
      BUSINESS: 500000,
      ENTERPRISE: 2000000,
    };
    return limits[plan] || 10000;
  };

  const getContextColor = (percentage: number) => {
    if (percentage < 40) return 'bg-green-500';
    if (percentage < 60) return 'bg-yellow-500';
    if (percentage < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBalanceColor = (balance: number, limit: number) => {
    const percentage = (balance / limit) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const tokenLimit = getTokenLimit(metrics.plan);
  const balancePercentage = (metrics.tokenBalance / tokenLimit) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        {/* Context Percentage */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getContextColor(metrics.contextPercentage)} transition-all duration-300`}
              style={{ width: `${metrics.contextPercentage}%` }}
            />
          </div>
          <span className="text-gray-600 font-mono text-xs">
            {metrics.contextPercentage}%
          </span>
        </div>

        {/* Token Balance */}
        <div className={`font-semibold ${getBalanceColor(metrics.tokenBalance, tokenLimit)}`}>
          {formatNumber(metrics.tokenBalance)} / {formatNumber(tokenLimit)}
        </div>

        {/* PFC Savings */}
        {metrics.tokensSaved > 0 && (
          <div className="text-green-600 font-medium">
            ↓ {formatNumber(metrics.tokensSaved)} saved
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">🧠 PFC Metrics</h3>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
          {metrics.plan}
        </span>
      </div>

      {/* Token Balance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Token Balance</span>
          <span className={`text-sm font-bold ${getBalanceColor(metrics.tokenBalance, tokenLimit)}`}>
            {formatNumber(metrics.tokenBalance)} / {formatNumber(tokenLimit)}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBalanceColor(metrics.tokenBalance, tokenLimit).replace('text-', 'bg-')} transition-all duration-500`}
            style={{ width: `${balancePercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {balancePercentage.toFixed(1)}% remaining
        </p>
      </div>

      {/* Context Percentage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Context Usage</span>
          <span className="text-sm font-bold text-gray-900">
            {metrics.contextPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getContextColor(metrics.contextPercentage)} transition-all duration-500`}
            style={{ width: `${metrics.contextPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-gray-500">200K max context</span>
          <span className={metrics.contextPercentage > 80 ? 'text-red-600 font-medium' : 'text-gray-500'}>
            {metrics.contextPercentage > 80 && '⚠️ '}{formatNumber(Math.round((metrics.contextPercentage / 100) * 200000))} tokens
          </span>
        </div>
      </div>

      {/* PFC Savings */}
      {metrics.tokensSaved > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-medium">PFC Efficiency Savings</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatNumber(metrics.tokensSaved)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                tokens saved vs traditional approach
              </p>
            </div>
            <div className="text-4xl">💚</div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">Tokens Used</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(metrics.tokensUsed)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Efficiency</p>
          <p className="text-lg font-bold text-green-600">
            {metrics.tokensSaved > 0
              ? `${Math.round((metrics.tokensSaved / (metrics.tokensUsed + metrics.tokensSaved)) * 100)}%`
              : '0%'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
