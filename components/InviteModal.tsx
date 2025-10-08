'use client';

import { useState } from 'react';

interface InviteModalProps {
  projectId: string;
  projectName: string;
  userId: string;
  onClose: () => void;
}

export default function InviteModal({ projectId, projectName, userId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async () => {
    if (!email) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/collab/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          receiverEmail: email,
          role,
          message,
          senderId: userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invite Collaborator</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-semibold text-green-600">Invitation sent!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Invite someone to collaborate on <span className="font-semibold">{projectName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EDITOR">Editor - Can edit and invite others</option>
                  <option value="VIEWER">Viewer - Can only view</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey! Let's collaborate on this project..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleInvite}
                  disabled={sending || !email}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
