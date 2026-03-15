import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [tab, setTab] = useState('MINE');
  const [isShaking, setIsShaking] = useState(false);
  const [referrals, setReferrals] = useState(() => JSON.parse(localStorage.getItem('j_refs')) || []);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const lastShake = useRef(0);
  const shakeTimeout = useRef(null);
  const tg = window.Telegram.WebApp;
  const userId = tg.initDataUnsafe?.user?.id || '000000';
  const adsBlockId = process.env.REACT_APP_ADSGRAM_BLOCK_ID;
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_nrg', energy);
    localStorage.setItem('j_refs', JSON.stringify(referrals));
  }, [points, energy, referrals]);

  useEffect(() => {
    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || energy <= 0 || tab !== 'MINE') return;

      const totalAcc = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
      if (totalAcc > 25) {
        const now = Date.now();
        if (now - lastShake.current > 120) {
          lastShake.current = now;
          setIsShaking(true);
          clearTimeout(shakeTimeout.current);
          shakeTimeout.current = setTimeout(() => setIsShaking(false), 300);

          setPoints((p) => p + 1);
          setEnergy((en) => Math.max(0, en - 1));
          if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [energy, tab, tg]);

  const handleInvite = () => {
    const inviteLink = `https://t.me/share/url?url=https://t.me/jolt_bot/play?start=${userId}&text=Join me on Jolt and earn together!`;
    tg.openTelegramLink(inviteLink);
  };

  const verifyAdReward = async (rewardId) => {
    if (!apiBaseUrl) {
      tg.showAlert?.('Missing API URL for ad verification.');
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/ads/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rewardId }),
    });

    if (!response.ok) {
      throw new Error('Ad verification failed');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Invalid ad reward');
    }

    setEnergy(500);
    tg.showAlert?.('Energy refilled!');
  };

  const showAd = async () => {
    if (!adsBlockId) {
      tg.showAlert?.('Missing Adsgram block id.');
      return;
    }
    if (!window.Adsgram?.init) {
      tg.showAlert?.('Adsgram SDK did not load.');
      return;
    }

    try {
      setIsAdLoading(true);
      const adController = window.Adsgram.init({ blockId: adsBlockId });
      const result = await adController.show();

      if (result?.done) {
        await verifyAdReward(result.rewardId);
      } else {
        tg.showAlert?.('Ad skipped. No reward granted.');
      }
    } catch (error) {
      console.error('Adsgram error:', error);
      tg.showAlert?.('Ad failed to load.');
    } finally {
      setIsAdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-md z-[100] border-b border-white/5">
        {tab !== 'MINE' ? (
          <button onClick={() => setTab('MINE')} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black tracking-tighter">
            ← BACK
          </button>
        ) : (
          <div className="flex flex-col">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Status</span>
            <span className="text-[#CEFF00] text-xs font-black italic">BRONZE</span>
          </div>
        )}
        <div className="text-right">
          <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter">Balance</p>
          <p className="text-xl font-black italic">{points.toLocaleString()} $JOLT</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative pb-32">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <motion.div
              animate={isShaking ? { scale: 1.15 } : { scale: 1 }}
              className={`w-72 h-72 rounded-full border-4 flex items-center justify-center transition-all duration-75
              ${isShaking ? 'border-[#CEFF00] bg-[#CEFF00]/5 shadow-[0_0_60px_rgba(206,255,0,0.15)]' : 'border-white/10 bg-white/5'}`}
            >
              <span className="text-[120px] select-none">{energy === 0 ? '' : '⚡'}</span>

              <AnimatePresence>
                {isShaking && [1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -150, x: (i - 2) * 40 }}
                    className="absolute text-[#CEFF00] text-4xl font-black"
                  >
                    ⚡
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            <div className="w-full max-w-xs mt-16 space-y-2">
              <div className="flex justify-between text-[10px] font-black opacity-40 uppercase">
                <span>Kinetic Energy</span>
                <span>{energy}/500</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${(energy / 500) * 100}%` }} className="h-full bg-[#CEFF00]" />
              </div>
            </div>

            {energy === 0 && (
              <button
                onClick={showAd}
                disabled={isAdLoading}
                className="w-full max-w-xs mt-6 bg-[#CEFF00] text-black font-black py-4 rounded-[24px] disabled:opacity-50"
              >
                {isAdLoading ? 'LOADING AD...' : 'WATCH AD TO REFILL'}
              </button>
            )}
          </div>
        )}

        {tab === 'FRIENDS' && (
          <div className="p-8 space-y-6">
            <h2 className="text-3xl font-black italic">FRIENDS</h2>
            <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 text-center">
              <p className="text-4xl font-black text-[#CEFF00] mb-1">{referrals.length}</p>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Total Friends Invited</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black opacity-30 uppercase">Friend Rewards</h3>
              <div className="bg-white/5 p-5 rounded-2xl flex justify-between items-center border border-white/5">
                <span className="text-sm font-black">Invite Reward</span>
                <span className="text-[#CEFF00] font-black">+5,000 $JOLT</span>
              </div>
            </div>

            <button
              onClick={handleInvite}
              className="w-full bg-[#CEFF00] text-black font-black py-5 rounded-[24px] shadow-[0_10px_30px_rgba(206,255,0,0.2)] active:scale-95 transition-all"
            >
              INVITE A FRIEND
            </button>
          </div>
        )}
      </div>

      <div className="p-4 pb-8 bg-black/90 backdrop-blur-xl border-t border-white/5 z-[100]">
        <nav className="h-20 bg-[#151515] rounded-[32px] border border-white/10 flex items-center justify-around overflow-hidden">
          {['MINE', 'STORE', 'EARN', 'FRIENDS'].map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all ${tab === id ? 'text-[#CEFF00] bg-white/5' : 'text-white/20'}`}
            >
              <span className="text-xl">{id === 'MINE' ? '⚡' : id === 'STORE' ? '🛒' : id === 'EARN' ? '💸' : '👥'}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{id}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
