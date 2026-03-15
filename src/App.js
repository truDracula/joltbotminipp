import React, { useEffect, useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'MINE', icon: '⛏️', label: 'Mine' },
  { id: 'EARN', icon: '💸', label: 'Earn' },
  { id: 'FRIENDS', icon: '👥', label: 'Frens' },
  { id: 'TOP', icon: '🏆', label: 'Top' },
  { id: 'STORE', icon: '🛒', label: 'Store' },
];

const EarnPanel = () => (
  <div className="p-6 space-y-4">
    <h2 className="text-2xl font-black italic">TASKS</h2>
    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
      <div>
        <p className="font-bold">Join Jolt Channel</p>
        <p className="text-[#CEFF00] text-xs">+5,000 $JOLT</p>
      </div>
      <button className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold">START</button>
    </div>
  </div>
);

const FriendsPanel = () => {
  const shareLink = () => {
    const url = 'https://t.me/share/url?url=https://t.me/joltbotminippbot/app?startapp=123&text=Play Jolt and Earn!';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 text-center">
      <h2 className="text-3xl font-black italic mb-4">FRIENDS</h2>
      <div className="bg-[#CEFF00]/10 p-6 rounded-3xl border border-[#CEFF00]/20 mb-6">
        <p className="text-sm opacity-70">You get 10% of whatever your friends earn!</p>
      </div>
      <button onClick={shareLink} className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl">
        INVITE A FRIEND
      </button>
    </div>
  );
};

export default function App() {
  const [tab, setTab] = useState('MINE');
  const [points, setPoints] = useState(1250);
  const [energy, setEnergy] = useState(100);
  const [debug, setDebug] = useState('No motion detected');
  const [motionActive, setMotionActive] = useState(false);

  const lastShake = useRef(0);
  const tabRef = useRef(tab);
  const energyRef = useRef(energy);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  const handleMotion = (event) => {
    if (tabRef.current !== 'MINE' || energyRef.current < 1) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    setDebug(`X: ${acc.x?.toFixed(2) ?? '0.00'} Y: ${acc.y?.toFixed(2) ?? '0.00'}`);

    const threshold = 12;
    if (Math.abs(acc.x ?? 0) > threshold || Math.abs(acc.y ?? 0) > threshold || Math.abs(acc.z ?? 0) > threshold) {
      const now = Date.now();
      if (now - lastShake.current > 200) {
        lastShake.current = now;

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        } else if (navigator.vibrate) {
          navigator.vibrate(20);
        }

        setPoints((p) => p + 1);
        setEnergy((e) => Math.max(0, e - 0.5));
      }
    }
  };

  const startMotion = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
          setMotionActive(true);
          setDebug('Motion active');
        }
      } catch (err) {
        setDebug('Permission Denied');
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setMotionActive(true);
      setDebug('Motion active');
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

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

            {!motionActive ? (
              <button
                onClick={startMotion}
                className="mt-10 px-8 py-4 bg-[#CEFF00] text-black font-black rounded-2xl animate-bounce"
              >
                TAP TO SYNC SENSORS
              </button>
            ) : (
              <p className="mt-10 text-xs opacity-40 uppercase tracking-[0.3em] animate-pulse">
                SENSORS ACTIVE: SHAKE NOW
              </p>
            )}

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

        {tab === 'EARN' && <EarnPanel />}
        {tab === 'FRIENDS' && <FriendsPanel />}
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
