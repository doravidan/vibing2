import PFCMetrics from '@/components/PFCMetrics';
import FileStructurePanel from '@/components/FileStructurePanel';
import { PFCMetrics as PFCMetricsType, ProjectFile } from '@/lib/hooks/useProjectCreation';

interface PreviewPanelProps {
  previewCode: string;
  previewKey: number;
  projectFiles: ProjectFile[];
  pfcMetrics: PFCMetricsType;
  activeAgents: string[];
  onRefresh: () => void;
}

export default function PreviewPanel({
  previewCode,
  previewKey,
  projectFiles,
  pfcMetrics,
  activeAgents,
  onRefresh,
}: PreviewPanelProps) {
  return (
    <div className="w-[70%] flex flex-col backdrop-blur-xl bg-gray-900/50">
      <div className="px-6 py-4 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Live Preview</h3>
            <p className="text-sm text-gray-400">{activeAgents.length} AI agents building</p>
          </div>
          {previewCode && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 text-sm backdrop-blur-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-1 border border-blue-500/30"
              title="Refresh preview"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          )}
        </div>
        <PFCMetrics initialData={pfcMetrics} compact />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* File Structure Panel */}
        <div className="w-64 border-r border-white/10 p-4 overflow-hidden">
          <FileStructurePanel files={projectFiles} />
        </div>

        {/* Preview */}
        <div className="flex-1 p-6 overflow-auto">
          {previewCode ? (
            <iframe
              key={previewKey}
              srcDoc={previewCode}
              className="w-full h-full border border-white/20 rounded-xl shadow-2xl"
              title="Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10 p-12">
                <div className="text-6xl mb-4">👁️</div>
                <p className="text-lg text-gray-400">Preview will appear here</p>
                <p className="text-sm text-gray-500 mt-2">Start chatting to generate code</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
