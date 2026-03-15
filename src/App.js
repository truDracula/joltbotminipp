import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const LEAGUES = [
  { id: 'BRONZE', min: 0, max: 50000, color: 'text-orange-400' },
  { id: 'SILVER', min: 50000, max: 250000, color: 'text-slate-300' },
  { id: 'GOLD', min: 250000, max: 1000000, color: 'text-yellow-400' },
  { id: 'PLATINUM', min: 1000000, max: 5000000, color: 'text-cyan-300' },
  { id: 'DIAMOND', min: 5000000, max: Infinity, color: 'text-fuchsia-300' },
];

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [batteryLvl, setBatteryLvl] = useState(() => Number(localStorage.getItem('j_bat')) || 1);
  const [multLvl, setMultLvl] = useState(() => Number(localStorage.getItem('j_mul')) || 1);
  const [tab, setTab] = useState('MINE');
  const [topTab, setTopTab] = useState('RANK');
  const [isShaking, setIsShaking] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const [referralCount, setReferralCount] = useState(0);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const lastShake = useRef(0);
  const shakeTimeout = useRef(null);
  const tg = window.Telegram.WebApp;
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const adsBlockId = process.env.REACT_APP_ADSGRAM_BLOCK_ID;
  const user = tg.initDataUnsafe?.user;
  const userId = user?.id?.toString() || '000000';
  const userName = user?.username || 'Pilot';

  const maxEnergy = 100 + (batteryLvl - 1) * 500;
  const shakeVal = multLvl;
  const multCost = Math.floor(2000 * Math.pow(2.5, multLvl - 1));
  const batCost = Math.floor(1000 * Math.pow(2.2, batteryLvl - 1));
  const currentLeagueIndex = LEAGUES.findIndex((league) => points >= league.min && points < league.max);
  const currentLeague = LEAGUES[currentLeagueIndex === -1 ? LEAGUES.length - 1 : currentLeagueIndex];
  const leaderboard = [
    { name: 'voltking', score: 2850000 },
    { name: 'shakequeen', score: 1450000 },
    { name: 'coilgod', score: 820000 },
    { name: userName, score: points, isUser: true },
    { name: 'pulsepilot', score: 310000 },
    { name: 'gridrunner', score: 125000 },
    { name: 'sparkzero', score: 42000 },
  ].sort((a, b) => b.score - a.score);
  const userRank = leaderboard.findIndex((entry) => entry.isUser) + 1;

  const formatCost = (value) => (value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString());

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_nrg', energy);
    localStorage.setItem('j_bat', batteryLvl);
    localStorage.setItem('j_mul', multLvl);
  }, [points, energy, batteryLvl, multLvl]);

  useEffect(() => {
    const timer = setInterval(() => setEnergy((prev) => Math.min(maxEnergy, prev + 1)), 4000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  useEffect(() => {
    const syncUser = async () => {
      if (!apiBaseUrl || !user) return;

      try {
        const response = await fetch(`${apiBaseUrl}/api/user/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tgId: user.id.toString(),
            username: user.username,
            startParam: tg.initDataUnsafe?.start_param,
          }),
        });

        if (!response.ok) return;
        const data = await response.json();
        setPoints(data.points ?? 0);
        setReferralCount(data.referralCount ?? 0);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    };

    syncUser();
  }, [apiBaseUrl, tg.initDataUnsafe?.start_param, user]);

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || !motionEnabled || energy <= 0 || tab !== 'MINE' || isAdLoading) return;

    const totalAcc = Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0);
    if (totalAcc > 18) {
      const now = Date.now();
      if (now - lastShake.current > 120) {
        lastShake.current = now;
        setIsShaking(true);
        clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => setIsShaking(false), 300);

        setPoints((prev) => prev + shakeVal);
        setEnergy((prev) => Math.max(0, prev - 1));

        const id = Date.now() + Math.random();
        setFloatingPoints((prev) => [...prev, { id, val: shakeVal }]);
        setTimeout(() => {
          setFloatingPoints((prev) => prev.filter((item) => item.id !== id));
        }, 800);

        tg.HapticFeedback?.impactOccurred('medium');
      }
    }
  };

  useEffect(() => {
    if (!motionEnabled) return undefined;
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      clearTimeout(shakeTimeout.current);
    };
  }, [motionEnabled, energy, tab, isAdLoading, shakeVal]);

  const requestMotion = async () => {
    const motionEvent = window.DeviceMotionEvent;
    if (!motionEvent) {
      tg.showAlert?.('Motion sensors are not available on this device.');
      return;
    }

    if (typeof motionEvent.requestPermission === 'function') {
      try {
        const permission = await motionEvent.requestPermission();
        if (permission !== 'granted') {
          tg.showAlert?.('Motion permission was denied.');
          return;
        }
      } catch (error) {
        tg.showAlert?.('Motion permission request failed.');
        return;
      }
    }

    setMotionEnabled(true);
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

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ad verification failed');
    }

    setEnergy(maxEnergy);
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

  const handleInvite = () => {
    const inviteLink = `https://t.me/share/url?url=https://t.me/jolt_bot/play?start=${userId}&text=Join me on Jolt and earn together!`;
    tg.openTelegramLink?.(inviteLink);
  };

  const NavButton = ({ id, icon, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all ${
        tab === id ? 'text-[#CEFF00] bg-white/5' : 'text-white/20'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      <AnimatePresence>
        {floatingPoints.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 1.1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-[36%] -translate-x-1/2 z-[300] text-[#CEFF00] text-4xl font-black pointer-events-none"
          >
            +{item.val}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-md z-[100] border-b border-white/5">
        {tab !== 'MINE' ? (
          <button onClick={() => setTab('MINE')} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black tracking-tighter">
            ← BACK
          </button>
        ) : (
          <div className="flex flex-col">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Status</span>
            <span className={`text-xs font-black italic ${currentLeague.color}`}>{currentLeague.id}</span>
          </div>
        )}
        <div className="text-right">
          <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter">Balance</p>
          <p className="text-xl font-black italic">{points.toLocaleString()} $JOLT</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative pb-32">
        {tab === 'MINE' && (
          <div className="min-h-full flex flex-col items-center justify-center p-6">
            <div className="text-center mb-10">
              <p className="text-[10px] font-black opacity-30 tracking-[0.4em] uppercase mb-2">Total Yield</p>
              <h1 className="text-5xl font-black italic">{points.toLocaleString()}</h1>
            </div>

            <motion.div
              animate={isShaking ? { scale: 1.12 } : { scale: 1 }}
              className={`w-80 h-80 rounded-full border-4 flex items-center justify-center transition-all duration-75
              ${isShaking ? 'border-[#CEFF00] bg-[#CEFF00]/5 shadow-[0_0_60px_rgba(206,255,0,0.15)]' : 'border-white/10 bg-white/5'}`}
            >
              <span className="text-[140px] select-none">{energy === 0 ? '' : '⚡'}</span>

              <AnimatePresence>
                {isShaking && [1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], y: -150, x: (i - 2) * 50 }}
                    className="absolute text-[#CEFF00] text-4xl font-black"
                  >
                    ⚡
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {!motionEnabled && (
              <button
                onClick={requestMotion}
                className="w-full max-w-xs mt-10 bg-[#CEFF00] text-black font-black py-4 rounded-[24px]"
              >
                TAP TO ENABLE SHAKE
              </button>
            )}

            {energy === 0 && (
              <button
                onClick={showAd}
                disabled={isAdLoading}
                className="w-full max-w-xs mt-4 bg-red-600 text-white font-black py-4 rounded-[24px] disabled:opacity-50"
              >
                {isAdLoading ? 'LOADING AD...' : 'WATCH AD TO REFILL'}
              </button>
            )}
          </div>
        )}

        {tab === 'STORE' && (
          <div className="p-8 space-y-4">
            <h2 className="text-3xl font-black italic text-[#CEFF00]">STORE</h2>
            <button
              disabled={points < multCost || multLvl >= 25}
              onClick={() => {
                setPoints((prev) => prev - multCost);
                setMultLvl((prev) => prev + 1);
              }}
              className="w-full bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left">
                <p className="font-black">MULTITAP</p>
                <p className="text-[10px] opacity-40">Level {multLvl} {multLvl >= 25 ? '(MAX)' : '• +1 per shake'}</p>
              </div>
              <span className="bg-[#CEFF00] text-black px-4 py-2 rounded-xl text-xs font-black">
                {multLvl >= 25 ? 'MAX' : formatCost(multCost)}
              </span>
            </button>
            <button
              disabled={points < batCost}
              onClick={() => {
                setPoints((prev) => prev - batCost);
                setBatteryLvl((prev) => prev + 1);
              }}
              className="w-full bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left">
                <p className="font-black">ENERGY CAP</p>
                <p className="text-[10px] opacity-40">Level {batteryLvl} • +500 capacity</p>
              </div>
              <span className="bg-[#CEFF00] text-black px-4 py-2 rounded-xl text-xs font-black">
                {formatCost(batCost)}
              </span>
            </button>
          </div>
        )}

        {tab === 'TOP' && (
          <div className="p-8 space-y-4">
            <div className="flex gap-2 mb-2 bg-white/5 p-1 rounded-2xl">
              {['RANK', 'LEAGUES'].map((panel) => (
                <button
                  key={panel}
                  onClick={() => setTopTab(panel)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${
                    topTab === panel ? 'bg-[#CEFF00] text-black shadow-lg' : 'text-white/40'
                  }`}
                >
                  {panel}
                </button>
              ))}
            </div>

            {topTab === 'RANK' && (
              <>
                <div className="bg-[#CEFF00]/10 border border-[#CEFF00]/20 rounded-[28px] p-5">
                  <p className="text-[10px] font-black uppercase opacity-50">Your Position</p>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black italic text-[#CEFF00]">#{userRank}</p>
                      <p className="text-sm opacity-60">@{userName}</p>
                    </div>
                    <p className="text-lg font-black">{points.toLocaleString()}</p>
                  </div>
                </div>

                {leaderboard.map((entry, index) => (
                  <div
                    key={`${entry.name}-${index}`}
                    className={`bg-white/5 p-5 rounded-[28px] border flex items-center justify-between ${
                      entry.isUser ? 'border-[#CEFF00]/30' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black opacity-40 w-6">#{index + 1}</span>
                      <div>
                        <p className={`font-black ${entry.isUser ? 'text-[#CEFF00]' : 'text-white'}`}>{entry.name}</p>
                        <p className="text-[10px] uppercase opacity-40">
                          {LEAGUES.find((league) => entry.score >= league.min && entry.score < league.max)?.id || 'DIAMOND'}
                        </p>
                      </div>
                    </div>
                    <p className="font-black">{entry.score.toLocaleString()}</p>
                  </div>
                ))}
              </>
            )}

            {topTab === 'LEAGUES' && (
              <>
                {LEAGUES.map((league) => (
                  <div key={league.id} className={`bg-white/5 p-5 rounded-[28px] border ${league.id === currentLeague.id ? 'border-[#CEFF00]/30' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`font-black ${league.color}`}>{league.id}</p>
                      <p className="text-[10px] uppercase opacity-40">
                        {league.min.toLocaleString()} - {Number.isFinite(league.max) ? league.max.toLocaleString() : 'Infinity'}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'FRIENDS' && (
          <div className="p-8 space-y-6">
            <h2 className="text-3xl font-black italic">FRIENDS</h2>
            <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 text-center">
              <p className="text-4xl font-black text-[#CEFF00] mb-1">{referralCount}</p>
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

      <div className="px-6 pb-3">
        <div className="flex justify-between text-[10px] font-black opacity-40 uppercase mb-2">
          <span>Kinetic Energy</span>
          <span>{energy}/{maxEnergy}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${(energy / maxEnergy) * 100}%` }} className="h-full bg-[#CEFF00]" />
        </div>
      </div>

      <div className="p-4 pb-8 bg-black/90 backdrop-blur-xl border-t border-white/5 z-[100]">
        <nav className="h-20 bg-[#151515] rounded-[32px] border border-white/10 flex items-center justify-around overflow-hidden">
          <NavButton id="MINE" icon="⚡" label="Mine" />
          <NavButton id="STORE" icon="🛒" label="Store" />
          <NavButton id="TOP" icon="🏆" label="Top" />
          <NavButton id="FRIENDS" icon="👥" label="Friends" />
        </nav>
      </div>
    </div>
  );
}
