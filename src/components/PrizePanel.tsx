import { Trophy, Users, Gift, RotateCcw, SkipForward, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { PrizeConfig, PrizeLevel } from '@/types';

interface PrizePanelProps {
  currentPrize: PrizeConfig;
  remainingCount: number;
  totalCount: number;
  allPrizes: PrizeConfig[];
  onDraw: () => void;
  onReset: () => void;
  onSkip?: () => void;
  isDrawing: boolean;
  canDraw: boolean;
  currentRoundCount: number;
  winnersCount: number;
}

const levelIcons: Record<PrizeLevel, React.ReactNode> = {
  lucky: <Gift className="w-8 h-8" />,
  third: <Trophy className="w-8 h-8" />,
  second: <Trophy className="w-8 h-8" />,
  first: <Trophy className="w-8 h-8" />,
  special: <Sparkles className="w-8 h-8" />,
};

const levelColors: Record<PrizeLevel, string> = {
  lucky: 'from-amber-400 to-yellow-500',
  third: 'from-orange-400 to-amber-500',
  second: 'from-rose-400 to-orange-500',
  first: 'from-purple-400 to-rose-500',
  special: 'from-red-500 to-purple-600',
};

export default function PrizePanel({
  currentPrize,
  remainingCount,
  totalCount,
  allPrizes,
  onDraw,
  onReset,
  onSkip,
  isDrawing,
  canDraw,
  currentRoundCount,
  winnersCount,
}: PrizePanelProps) {
  const progress = ((totalCount - remainingCount) / totalCount) * 100;
  const isComplete = remainingCount === 0;
  
  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold gold-gradient-text mb-2">
          2026 年会抽奖
        </h1>
        <div className="h-px bg-gradient-to-r from-transparent via-[#f8bc36] to-transparent" />
      </div>
      
      {/* 当前奖品卡片 */}
      <div className="prize-card relative overflow-hidden">
        {/* 背景装饰 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${levelColors[currentPrize.level]} opacity-10`} />
        
        <div className="relative z-10">
          {/* 奖品等级 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#f8bc36] to-[#ff9d00] text-black">
              {levelIcons[currentPrize.level]}
            </div>
            <div>
              <div className="text-sm text-[#a8a8a8]">当前奖项</div>
              <div className="text-2xl font-bold gold-gradient-text">
                {currentPrize.name}
              </div>
            </div>
          </div>
          
          {/* 奖品名称 */}
          <div className="mb-4">
            <div className="text-sm text-[#a8a8a8] mb-1">奖品内容</div>
            <div className="text-xl font-semibold text-white">
              {currentPrize.prize}
            </div>
          </div>
          
          {/* 进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#a8a8a8]">抽取进度</span>
              <span className="text-[#f8bc36] font-semibold">
                {totalCount - remainingCount} / {totalCount}
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2 bg-[#2a2a2a]"
            />
          </div>
          
          {/* 本轮统计 */}
          <div className="mt-4 pt-4 border-t border-[#f8bc36]/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#a8a8a8]">本轮已抽</span>
              <span className="text-lg font-bold text-[#f8bc36]">
                {currentRoundCount} 人
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 抽奖按钮 */}
      <div className="space-y-3">
        <Button
          onClick={onDraw}
          disabled={!canDraw || isDrawing}
          className={`w-full btn-primary text-xl ${(!canDraw || isDrawing) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isDrawing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚡</span>
              抽奖中...
            </span>
          ) : isComplete ? (
            '本奖项已抽完'
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              开始抽奖
            </span>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={onReset}
            variant="outline"
            disabled={currentRoundCount === 0 || isDrawing}
            className="flex-1 btn-secondary"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置本轮
          </Button>
          
          {onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              disabled={isDrawing}
              className="flex-1 btn-secondary"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              跳过
            </Button>
          )}
        </div>
      </div>
      
      {/* 所有奖品进度 */}
      <div className="flex-1 overflow-auto scroll-hidden">
        <div className="text-sm text-[#a8a8a8] mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          奖品进度
        </div>
        
        <div className="space-y-2">
          {allPrizes.map((prize, index) => {
            const isCurrent = prize.level === currentPrize.level;
            const remaining = remainingCount; // 简化，实际应该传入每个等级的剩余数
            const total = prize.count;
            const completed = isCurrent ? total - remaining : index < allPrizes.findIndex(p => p.level === currentPrize.level) ? 0 : total;
            const prizeProgress = (completed / total) * 100;
            
            return (
              <div 
                key={prize.level}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-[#f8bc36]/10 border-[#f8bc36]/50' 
                    : 'bg-[#1a1a1a] border-transparent hover:border-[#f8bc36]/20'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-[#f8bc36]' : 'text-[#a8a8a8]'}`}>
                    {prize.name}
                  </span>
                  <span className="text-xs text-[#a8a8a8]">
                    {completed}/{total}
                  </span>
                </div>
                <Progress 
                  value={prizeProgress} 
                  className="h-1 bg-[#2a2a2a]"
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 底部统计 */}
      <div className="pt-4 border-t border-[#f8bc36]/20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#a8a8a8]">
            <Users className="w-4 h-4" />
            <span className="text-sm">总中奖人数</span>
          </div>
          <span className="text-2xl font-bold gold-gradient-text">
            {winnersCount}
          </span>
        </div>
      </div>
    </div>
  );
}
