import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [tab, setTab] = useState('MINE');
  const [points, setPoints] = useState(1250);
  const [energy, setEnergy] = useState(100);
  const [kinetic, setKinetic] = useState(0);
  const [isHyper, setIsHyper] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);

  const lastShake = useRef(0);

  const triggerHyper = () => {
    setMultiplier([5, 10, 15][Math.floor(Math.random() * 3)]);
    setIsHyper(true);
    setTimeLeft(10);
  };

  const processShake = () => {
    if (isHyper) {
      setPoints((p) => p + multiplier);
    } else {
      setPoints((p) => p + 1);
      setEnergy((e) => Math.max(0, e - 0.5));
      setKinetic((k) => {
        if (k + 5 >= 100) {
          triggerHyper();
          return 100;
        }
        return k + 5;
      });
    }
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleMotion = (event) => {
    if (tab !== 'MINE' || energy < 1) return;

    const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
    const totalAcc = Math.sqrt(x * x + y * y + z * z);

    if (totalAcc > 18 && Date.now() - lastShake.current > 100) {
      lastShake.current = Date.now();
      processShake();
    }
  };

  const enableMotion = async () => {
    const motionEvent = window.DeviceMotionEvent;
    if (!motionEvent) {
      alert('Motion sensors are not available on this device.');
      return;
    }

    if (typeof motionEvent.requestPermission === 'function') {
      try {
        const state = await motionEvent.requestPermission();
        if (state === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
          setMotionEnabled(true);
          alert('Motion Synced! Start Shaking.');
        }
      } catch (e) {
        alert('Permission denied. Check your browser settings.');
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setMotionEnabled(true);
      alert('Motion Active.');
    }
  };

  useEffect(() => {
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [tab, energy, isHyper, multiplier]);

  useEffect(() => {
    if (isHyper && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsHyper(false);
      setKinetic(0);
    }
  }, [isHyper, timeLeft]);

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden flex flex-col">
      <div className="p-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#CEFF00] rounded-full flex items-center justify-center text-black font-black">J</div>
          <div>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Balance</p>
            <p className="text-2xl font-black text-[#CEFF00] italic">{points.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/40 uppercase font-black">Level 1</p>
          <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-blue-500 w-1/3"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="relative">
              <motion.div
                animate={isHyper ? { scale: [1, 1.2, 1], rotate: 360 } : { scale: 1 }}
                transition={isHyper ? { repeat: Infinity, duration: 2 } : {}}
                className={`w-64 h-64 rounded-full border-8 flex items-center justify-center transition-all duration-500
                    ${isHyper ? 'border-[#CEFF00] shadow-[0_0_50px_#CEFF00]' : 'border-white/5 bg-white/5'}`}
              >
                <span className="text-8xl">⚡</span>
              </motion.div>
              {isHyper && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#CEFF00] text-black px-4 py-1 rounded-full font-black italic">
                  {multiplier}X POWER: {timeLeft}s
                </div>
              )}
            </div>
            {!motionEnabled && kinetic === 0 && (
              <button
                onClick={enableMotion}
                className="mt-10 px-8 py-3 bg-[#CEFF00] text-black font-black rounded-2xl animate-bounce shadow-lg"
              >
                ACTIVATE SENSORS
              </button>
            )}

            {motionEnabled && (
              <p className="mt-12 text-[10px] text-white/20 uppercase font-black tracking-[0.5em] animate-pulse">Shake Device to Sync</p>
            )}

            <div className="w-full mt-12 space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase">
                <span className="text-blue-400">Energy Reserves</span>
                <span>{Math.floor(energy)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${energy}%` }} className="h-full bg-blue-600" />
              </div>
            </div>
          </div>
        )}

        {tab === 'EARN' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black italic mb-6">Social Tasks</h2>
            {[
              { t: 'Follow Twitter', p: '+5,000' },
              { t: 'Join Telegram', p: '+2,500' },
              { t: 'Watch Ad', p: '+1,000' },
            ].map((task, i) => (
              <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                <span className="font-bold">{task.t}</span>
                <span className="text-[#CEFF00] font-black italic">{task.p}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'FRIENDS' && (
          <div className="text-center py-10">
            <h2 className="text-3xl font-black italic mb-2">Invite Friends</h2>
            <p className="text-white/40 text-sm mb-10 px-6">Earn 10% of all points your friends shake!</p>
            <button className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl text-lg shadow-lg">
              INVITE A FREN
            </button>
          </div>
        )}

        {tab === 'TOP' && (
          <div className="space-y-3">
            <h2 className="text-xl font-black italic mb-6">Top Operators</h2>
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-white/20 font-black">{rank}</span>
                  <span className="font-bold">Player_{rank * 42}</span>
                </div>
                <span className="text-[#CEFF00] font-black italic">{(100000 / rank).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'STORE' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
              <span className="text-3xl mb-2"></span>
              <p className="font-bold text-xs uppercase">Full Energy</p>
              <p className="text-[#CEFF00] font-black mt-2">500 J</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
              <span className="text-3xl mb-2"></span>
              <p className="font-bold text-xs uppercase">Hyper Freeze</p>
              <p className="text-[#CEFF00] font-black mt-2">2,500 J</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-8 pt-2 bg-black border-t border-white/5">
        <nav className="h-20 bg-[#151515] rounded-3xl border border-white/10 flex items-center justify-around px-2 relative">
          {[
            { id: 'MINE', icon: '⛏️', l: 'Mine' },
            { id: 'EARN', icon: '', l: 'Earn' },
            { id: 'FRIENDS', icon: '', l: 'Frens' },
            { id: 'TOP', icon: '', l: 'Top' },
            { id: 'STORE', icon: '', l: 'Store' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${tab === item.id ? 'text-[#CEFF00] scale-110' : 'text-white/20 grayscale'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{item.l}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
