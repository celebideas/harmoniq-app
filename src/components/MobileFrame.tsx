import React from 'react';
import { Smartphone, Sparkles, Radio } from 'lucide-react';

interface Props {
  isFrameMode: boolean;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<Props> = ({ isFrameMode, children }) => {
  if (!isFrameMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
        <div className="w-full max-w-xl flex-1 flex flex-col min-h-screen border-x border-slate-900 shadow-2xl relative">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-900/15 via-rose-900/10 to-transparent blur-3xl rounded-full" />
      </div>

      {/* iPhone 16 Pro Style Hardware Shell */}
      <div className="relative w-full max-w-[420px] h-[860px] max-h-[96vh] rounded-[48px] bg-neutral-900 p-3 shadow-[0_0_60px_-15px_rgba(79,70,229,0.25)] border-[4px] border-neutral-800 flex flex-col transition-all duration-300">
        {/* Dynamic Island Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2.5 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Radio className="w-3 h-3 text-indigo-400" />
          </div>
        </div>

        {/* Screen Bezel & Display Area */}
        <div className="relative w-full h-full rounded-[40px] bg-slate-950 overflow-hidden flex flex-col border border-neutral-800/80">
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pt-6">
            {children}
          </div>
        </div>

        {/* Bottom Hardware Home Bar Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-50 pointer-events-none" />
      </div>
    </div>
  );
};
