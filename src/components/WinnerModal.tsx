import { useEffect, useState } from 'react';
import { X, Trophy, Sparkles, Gift, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Employee, PrizeLevel } from '@/types';

interface WinnerModalProps {
  isOpen: boolean;
  winner: Employee | null;
  prizeName: string;
  prizeLevel: PrizeLevel;
  onClose: () => void;
}

const levelConfig: Record<PrizeLevel, { icon: React.ReactNode; title: string; color: string }> = {
  lucky: {
    icon: <Gift className="w-12 h-12" />,
    title: '幸运奖',
    color: 'from-amber-400 to-yellow-500',
  },
  third: {
    icon: <Trophy className="w-12 h-12" />,
    title: '三等奖',
    color: 'from-orange-400 to-amber-500',
  },
  second: {
    icon: <Star className="w-12 h-12" />,
    title: '二等奖',
    color: 'from-rose-400 to-orange-500',
  },
  first: {
    icon: <Crown className="w-12 h-12" />,
    title: '一等奖',
    color: 'from-purple-400 to-rose-500',
  },
  special: {
    icon: <Sparkles className="w-12 h-12" />,
    title: '特等奖',
    color: 'from-red-500 to-purple-600',
  },
};

// 彩纸屑组件
function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);
  
  useEffect(() => {
    const colors = ['#f8bc36', '#ff9d00', '#e6a61c', '#ffd700', '#ffa500'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti absolute"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function WinnerModal({ isOpen, winner, prizeName, prizeLevel, onClose }: WinnerModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const config = levelConfig[prizeLevel];
  
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!isOpen || !winner) return null;
  
  return (
    <>
      {showConfetti && <Confetti />}
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 背景遮罩 */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* 弹窗内容 */}
        <div className="relative z-10 w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-300">
          {/* 发光边框 */}
          <div className={`absolute -inset-1 bg-gradient-to-r ${config.color} rounded-3xl opacity-50 blur-lg animate-pulse`} />
          
          <div className="relative bg-[#1a1a1a] rounded-3xl border border-[#f8bc36]/30 p-8 overflow-hidden">
            {/* 背景装饰 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-5`} />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f8bc36] to-transparent" />
            
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#a8a8a8] hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* 内容 */}
            <div className="relative z-10 text-center">
              {/* 图标 */}
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${config.color} text-black mb-6 animate-bounce`}>
                {config.icon}
              </div>
              
              {/* 标题 */}
              <div className="mb-2">
                <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${config.color} text-black`}>
                  {config.title}
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                恭喜中奖！
              </h2>
              
              <p className="text-[#a8a8a8] mb-6">
                获得 {prizeName}
              </p>
              
              {/* 中奖者信息 */}
              <div className="bg-[#2a2a2a] rounded-2xl p-6 mb-6">
                <div className="flex flex-col items-center">
                  {/* 头像 */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f8bc36] to-[#ff9d00] flex items-center justify-center text-4xl font-bold text-black mb-4 animate-pulse-gold">
                    {winner.avatar ? (
                      <img 
                        src={winner.avatar} 
                        alt={winner.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      winner.name.charAt(0)
                    )}
                  </div>
                  
                  {/* 姓名 */}
                  <div className="text-4xl font-bold gold-gradient-text mb-2">
                    {winner.name}
                  </div>
                  
                  {/* 部门 */}
                  {winner.department && (
                    <div className="text-[#a8a8a8]">
                      {winner.department}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 确认按钮 */}
              <Button
                onClick={onClose}
                className="btn-primary px-12"
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
