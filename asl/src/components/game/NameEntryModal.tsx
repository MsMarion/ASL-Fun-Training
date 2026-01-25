import { useState } from "react";

interface NameEntryModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NameEntryModal({ isOpen, onSubmit, onCancel, isLoading = false }: NameEntryModalProps) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative rounded-2xl p-1 bg-gradient-to-b from-cyan-500/50 via-fuchsia-500/30 to-purple-500/50 max-w-md w-full mx-4">
        <div className="rounded-xl bg-[#1a0a2e] p-6 md:p-8">
          <h2 
            className="text-xl md:text-2xl font-bold text-fuchsia-400 mb-4 text-center"
            style={{ textShadow: '0 0 10px #d946ef, 0 0 20px #d946ef' }}
          >
            ENTER YOUR NAME
          </h2>
          
          <p className="text-sm text-gray-400 text-center mb-6">
            Your stats will be tracked and saved to the leaderboard
          </p>

          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              maxLength={20}
              className="w-full px-4 py-3 bg-[#0d0221] border-2 border-fuchsia-500/50 rounded-lg text-cyan-400 font-mono text-lg focus:outline-none focus:border-cyan-400 uppercase placeholder-gray-600"
              placeholder="YOUR NAME"
              autoFocus
              disabled={isLoading}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-lg font-mono font-bold bg-[#1a0a2e]/60 border-2 border-gray-500/30 text-gray-400 hover:border-gray-400/50 hover:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isLoading}
                className="flex-1 px-4 py-3 rounded-lg font-mono font-bold text-[#0d0221] bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'CREATING...' : 'START GAME'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}