import { useRef, useEffect } from 'react';
import { X, User, Crown, Gift, Trophy, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Winner, PrizeLevel, Employee } from '@/types';

interface WinnerListProps {
  winners: Winner[];
  currentRoundWinners: Employee[];
  currentPrizeName: string;
  currentPrizeLevel: PrizeLevel;
  onRemoveWinner: (winnerId: string) => void;
}

const levelIcons: Record<PrizeLevel, React.ReactNode> = {
  lucky: <Gift className="w-4 h-4" />,
  third: <Trophy className="w-4 h-4" />,
  second: <Star className="w-4 h-4" />,
  first: <Crown className="w-4 h-4" />,
  special: <Sparkles className="w-4 h-4" />,
};

const levelLabels: Record<PrizeLevel, string> = {
  lucky: '幸运奖',
  third: '三等奖',
  second: '二等奖',
  first: '一等奖',
  special: '特等奖',
};

const levelColors: Record<PrizeLevel, string> = {
  lucky: 'text-amber-400',
  third: 'text-orange-400',
  second: 'text-rose-400',
  first: 'text-purple-400',
  special: 'text-red-500',
};

const levelBgColors: Record<PrizeLevel, string> = {
  lucky: 'bg-amber-400/10',
  third: 'bg-orange-400/10',
  second: 'bg-rose-400/10',
  first: 'bg-purple-400/10',
  special: 'bg-red-500/10',
};

export default function WinnerList({
  winners,
  currentRoundWinners,
  currentPrizeName,
  currentPrizeLevel,
  onRemoveWinner,
}: WinnerListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [winners.length]);
  
  // 按奖品等级分组
  const groupedWinners = winners.reduce((acc, winner) => {
    if (!acc[winner.prizeLevel]) {
      acc[winner.prizeLevel] = [];
    }
    acc[winner.prizeLevel].push(winner);
    return acc;
  }, {} as Record<PrizeLevel, Winner[]>);
  
  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]/90 border-l border-[#f8bc36]/30">
      {/* 标题栏 */}
      <div className="p-4 border-b border-[#f8bc36]/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold gold-gradient-text">中奖名单</h2>
            <p className="text-sm text-[#a8a8a8] mt-1">
              {currentPrizeName} · 本轮 {currentRoundWinners.length} 人
            </p>
          </div>
          <div className="number-badge">
            {winners.length}
          </div>
        </div>
      </div>
      
      {/* 中奖列表 */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* 当前轮次的中奖者 */}
          {currentRoundWinners.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#f8bc36]">
                <Sparkles className="w-4 h-4" />
                <span>本轮中奖</span>
              </div>
              
              {currentRoundWinners.map((employee, index) => {
                const winner = winners.find(w => w.employee.id === employee.id);
                if (!winner) return null;
                
                return (
                  <div
                    key={winner.id}
                    className="winner-card animate-in slide-in-from-right-4 fade-in duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="number-badge text-xs w-6 h-6">
                        {index + 1}
                      </div>
                      
                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f8bc36] to-[#ff9d00] flex items-center justify-center text-black font-bold">
                        {employee.avatar ? (
                          <img 
                            src={employee.avatar} 
                            alt={employee.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          employee.name.charAt(0)
                        )}
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {employee.name}
                        </div>
                        <div className="text-xs text-[#a8a8a8]">
                          {employee.department}
                        </div>
                      </div>
                      
                      {/* 作废按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveWinner(winner.id)}
                        className="text-[#a8a8a8] hover:text-red-400 hover:bg-red-400/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 所有中奖者按等级分组 */}
          {Object.entries(groupedWinners)
            .filter(([level]) => level !== currentPrizeLevel)
            .map(([level, levelWinners]) => (
              <div key={level} className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${levelColors[level as PrizeLevel]}`}>
                  {levelIcons[level as PrizeLevel]}
                  <span>{levelLabels[level as PrizeLevel]}</span>
                  <span className="text-[#a8a8a8]">({levelWinners.length})</span>
                </div>
                
                <div className="space-y-1">
                  {levelWinners.map((winner, index) => (
                    <div
                      key={winner.id}
                      className={`p-2 rounded-lg ${levelBgColors[level as PrizeLevel]} border border-[#f8bc36]/10`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#a8a8a8] w-5">
                          {index + 1}
                        </span>
                        <User className="w-3 h-3 text-[#a8a8a8]" />
                        <span className="text-sm text-white flex-1 truncate">
                          {winner.employee.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
      
      {/* 底部统计 */}
      <div className="p-4 border-t border-[#f8bc36]/20">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#2a2a2a] rounded-lg p-2">
            <div className="text-xs text-[#a8a8a8]">已抽奖项</div>
            <div className="text-lg font-bold text-[#f8bc36]">
              {Object.keys(groupedWinners).length}
            </div>
          </div>
          <div className="bg-[#2a2a2a] rounded-lg p-2">
            <div className="text-xs text-[#a8a8a8]">中奖人数</div>
            <div className="text-lg font-bold text-[#f8bc36]">
              {winners.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
