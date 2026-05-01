import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';

const MAX_CHARACTERS = 1000;

export interface DmComposerProps {
    /** Display name of the recipient (placeholder text). */
    peerName: string;
    /** Called with the trimmed body when the user submits. */
    onSubmit: (message: string) => void;
}

/** Single-line composer with send-on-enter and 1k char cap. */
export const DmComposer = ({ peerName, onSubmit }: DmComposerProps) => {
    const [input, setInput] = useState('');

    const _send = (e: FormEvent) => {
        e.preventDefault();
        const _body = input.trim().slice(0, MAX_CHARACTERS);
        if (!_body) return;
        onSubmit(_body);
        setInput('');
    };

    return (
        <form onSubmit={_send} className="relative">
            <div className="relative flex items-center glass-heavy border border-cyan-500/20
                rounded-xl overflow-hidden focus-within:border-cyan-500
                focus-within:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-300"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message @${peerName}`}
                    maxLength={MAX_CHARACTERS}
                    className="flex-1 bg-transparent border-none px-4 py-3 text-cyan-100
                        placeholder-cyan-500/50 text-[13px] focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2.5 text-cyan-500/70 hover:text-cyan-400
                        disabled:opacity-40 transition-colors mr-1"
                    aria-label="Send message"
                >
                    <Send size={16} className={input.trim() ? 'animate-pulse' : ''} />
                </button>
            </div>
        </form>
    );
};

export default DmComposer;

