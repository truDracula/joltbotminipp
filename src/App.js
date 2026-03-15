import React, { useEffect, useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'MINE', icon: '⛏️', label: 'Mine' },
  { id: 'EARN', icon: '💸', label: 'Earn' },
  { id: 'FRIENDS', icon: '👥', label: 'Frens' },
  { id: 'TOP', icon: '🏆', label: 'Top' },
  { id: 'STORE', icon: '🛒', label: 'Store' },
];

export default function App() {
  const [tab, setTab] = useState('MINE');
  const [points, setPoints] = useState(1250);
  const [energy, setEnergy] = useState(100);
  const [debug, setDebug] = useState('No motion detected');

  const lastShake = useRef(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const handleMotion = (event) => {
      if (tab !== 'MINE' || energy < 1) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      setDebug(`X: ${acc.x?.toFixed(2) ?? '0.00'} Y: ${acc.y?.toFixed(2) ?? '0.00'}`);

      const threshold = 12;
      if (Math.abs(acc.x ?? 0) > threshold || Math.abs(acc.y ?? 0) > threshold || Math.abs(acc.z ?? 0) > threshold) {
        const now = Date.now();
        if (now - lastShake.current > 200) {
          lastShake.current = now;

          if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
          } else if (navigator.vibrate) {
            navigator.vibrate(20);
          }

          setPoints((p) => p + 1);
          setEnergy((e) => Math.max(0, e - 0.5));
        }
      }
    };

    const startSensors = async () => {
      const motionEvent = window.DeviceMotionEvent;
      if (!motionEvent) {
        setDebug('Motion API unavailable');
        return;
      }

      try {
        if (typeof motionEvent.requestPermission === 'function') {
          const response = await motionEvent.requestPermission();
          if (response === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            setDebug('Motion permission granted');
          } else {
            setDebug('Motion permission denied');
          }
        } else {
          window.addEventListener('devicemotion', handleMotion);
          setDebug('Motion listener active');
        }
      } catch (error) {
        setDebug('Motion start failed');
      }
    };

    window.addEventListener('touchstart', startSensors, { once: true });

    return () => {
      window.removeEventListener('touchstart', startSensors);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [tab, energy]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden text-white font-sans">
      <div className="p-4 flex justify-between items-center bg-[#0a0a0a] border-b border-white/5">
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase">Balance</p>
          <h2 className="text-[#CEFF00] text-2xl font-black italic">{points} $JOLT</h2>
        </div>
        <div className="max-w-[42%] text-[8px] bg-white/5 p-2 rounded-lg text-white/40">DEBUG: {debug}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center p-10">
            <div className="w-64 h-64 bg-white/5 rounded-full border-4 border-[#CEFF00] flex items-center justify-center shadow-[0_0_45px_rgba(206,255,0,0.18)]">
              <span className="text-8xl">⚡</span>
            </div>
            <p className="mt-10 text-center text-xs opacity-40 uppercase tracking-[0.3em]">
              Shake your phone to sync kinetic energy
            </p>
            <div className="w-full max-w-sm mt-10">
              <div className="flex justify-between text-[10px] font-bold uppercase text-white/50 mb-2">
                <span>Energy</span>
                <span>{Math.floor(energy)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#CEFF00] transition-all duration-200" style={{ width: `${energy}%` }} />
              </div>
            </div>
          </div>
        )}

        {tab === 'EARN' && <div className="p-8"><h2 className="text-2xl font-black italic">Earn Panel</h2><p className="mt-4 text-white/50">Tasks coming soon...</p></div>}
        {tab === 'FRIENDS' && <div className="p-8 text-center"><h2 className="text-2xl font-black italic">Invite Friends</h2><button className="bg-[#CEFF00] text-black w-full p-4 rounded-xl mt-4 font-bold">SEND INVITE</button></div>}
        {tab === 'TOP' && <div className="p-8"><h2 className="text-2xl font-black italic">Leaderboard</h2></div>}
        {tab === 'STORE' && <div className="p-8"><h2 className="text-2xl font-black italic">Upgrade Store</h2></div>}
      </div>

      <nav className="h-20 bg-[#111] border-t border-white/5 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 ${tab === item.id ? 'text-[#CEFF00]' : 'text-white/25'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
