import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { 
  Employee, 
  Winner, 
  PrizeConfig, 
  PrizeLevel,
  LotteryState 
} from '@/types';

// 奖品配置
const DEFAULT_PRIZE_CONFIG: PrizeConfig[] = [
  { level: 'third', name: '三等奖', count: 1, prize: '蓝牙耳机' },
  { level: 'second', name: '二等奖', count: 1, prize: '智能手表' },
  { level: 'first', name: '一等奖', count: 1, prize: '平板电脑' },
];

// 默认员工数据（仅 3 条示例）
function generateMockEmployees(): Employee[] {
  return [
    { id: 'emp_1', name: '张三', department: '技术部' },
    { id: 'emp_2', name: '李四', department: '产品部' },
    { id: 'emp_3', name: '王五', department: '设计部' },
  ];
}

interface UseLotteryOptions {
  prizeConfig?: PrizeConfig[];
  employees?: Employee[];
}

interface UseLotteryReturn {
  // 状态
  state: LotteryState;
  currentPrize: PrizeConfig;
  allPrizes: PrizeConfig[];
  canDraw: boolean;
  displayEmployees: Employee[];

  // 3D动画相关
  rotationSpeed: number;
  isSpinning: boolean;
  selectedEmployee: Employee | null;
  showParticles: boolean;

  // 方法
  startDraw: () => void;
  onWinnerSelected: (employee: Employee) => void;
  removeWinner: (winnerId: string) => void;
  resetCurrentRound: () => void;
  resetAll: () => void;
  skipToNextPrize: () => void;
}

export function useLottery(options: UseLotteryOptions = {}): UseLotteryReturn {
  const {
    prizeConfig = DEFAULT_PRIZE_CONFIG,
    employees: providedEmployees,
  } = options;
  
  // 初始化员工列表
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (providedEmployees && providedEmployees.length > 0) return providedEmployees;
    return generateMockEmployees();
  });
  
  // 抽奖状态
  const [state, setState] = useState<LotteryState>({
    currentPrizeIndex: 0,
    status: 'idle',
    candidates: [...employees],
    winners: [],
    currentRoundWinners: [],
    remainingCounts: prizeConfig.reduce((acc, prize) => ({
      ...acc,
      [prize.level]: prize.count,
    }), {} as Record<PrizeLevel, number>),
  });
  
  // 3D动画状态
  const [rotationSpeed, setRotationSpeed] = useState(0.2);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [displayEmployees, setDisplayEmployees] = useState<Employee[]>(employees);

  // 动画控制ref
  const animationRef = useRef<number | null>(null);
  const speedRef = useRef(0.2);

  // 当前奖品
  const currentPrize = prizeConfig[state.currentPrizeIndex];
  const currentPrizeRef = useRef<PrizeConfig | null>(null);

  // 同步最新数据到 ref
  useEffect(() => {
    currentPrizeRef.current = currentPrize;
  }, [currentPrize]);

  // 空闲状态下，显示列表跟随当前候选池
  useEffect(() => {
    if (state.status === 'idle') {
      setDisplayEmployees([...state.candidates]);
    }
  }, [state.status, state.candidates]);

  // 是否还可以抽奖
  const canDraw = useMemo(() => {
    if (state.status !== 'idle' && state.status !== 'revealed') return false;
    if (state.currentPrizeIndex >= prizeConfig.length) return false;
    if (state.remainingCounts[currentPrize.level] <= 0) return false;
    if (state.candidates.length === 0) return false;
    return true;
  }, [state, currentPrize, prizeConfig.length]);

  // 是否正在旋转
  const isSpinning = state.status === 'spinning' || state.status === 'decelerating';

  // 清理动画
  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 3D 球停止后由外部调用，传入正对摄像机的员工作为中奖者
  const onWinnerSelected = useCallback((winner: Employee) => {
    const prize = currentPrizeRef.current;
    if (!prize) return;
    // 确保该员工在候选池中
    if (!state.candidates.find(e => e.id === winner.id)) return;

    setSelectedEmployee(winner);
    setShowParticles(true);

    const newWinner: Winner = {
      id: `winner_${Date.now()}`,
      employee: winner,
      prizeLevel: prize.level,
      prizeName: prize.prize,
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      status: 'revealed',
      winners: [...prev.winners, newWinner],
      currentRoundWinners: [...prev.currentRoundWinners, winner],
      candidates: prev.candidates.filter(e => e.id !== winner.id),
      remainingCounts: {
        ...prev.remainingCounts,
        [prize.level]: prev.remainingCounts[prize.level] - 1,
      },
    }));

    setTimeout(() => {
      setShowParticles(false);
    }, 3000);
  }, [state.candidates]);

  // 减速阶段 - 简化，只更新速度
  const decelerate = useCallback(() => {
    setState(prev => ({ ...prev, status: 'decelerating' }));
    const duration = 4000;
    const startTime = performance.now();
    const startSpeed = speedRef.current;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // 匀减速
      const currentSpeed = startSpeed * (1 - t);
      speedRef.current = currentSpeed;
      setRotationSpeed(currentSpeed);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        speedRef.current = 0;
        setRotationSpeed(0);
        // 不再在这里选择中奖者，由 3D 球回调处理
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // 开始随机旋转
  const startSpin = useCallback(() => {
    setState(prev => ({ ...prev, status: 'spinning' }));
    setSelectedEmployee(null);
    setShowParticles(false);
    setDisplayEmployees([...state.candidates]);

    const maxSpeed = 20; // 提高初速度
    speedRef.current = maxSpeed;
    setRotationSpeed(maxSpeed);

    // 4 秒后进入减速
    setTimeout(() => {
      decelerate();
    }, 4000);
  }, [state.candidates, decelerate]);

  // 开始抽奖
  const startDraw = useCallback(() => {
    if (!canDraw) return;
    clearAnimation();
    startSpin();
  }, [canDraw, clearAnimation, startSpin]);

  // 移除中奖者（作废）
  const removeWinner = useCallback((winnerId: string) => {
    const winner = state.winners.find(w => w.id === winnerId);
    if (!winner) return;
    
    setState(prev => ({
      ...prev,
      winners: prev.winners.filter(w => w.id !== winnerId),
      currentRoundWinners: prev.currentRoundWinners.filter(e => e.id !== winner.employee.id),
      candidates: [...prev.candidates, winner.employee],
      remainingCounts: {
        ...prev.remainingCounts,
        [winner.prizeLevel]: prev.remainingCounts[winner.prizeLevel] + 1,
      },
    }));
  }, [state.winners]);
  
  // 重置当前轮次
  const resetCurrentRound = useCallback(() => {
    // 将当前轮次的中奖者放回候选池
    const currentRoundWinnerIds = new Set(state.currentRoundWinners.map(e => e.id));
    const currentRoundWinnersList = state.winners.filter(w => currentRoundWinnerIds.has(w.employee.id));
    
    // 恢复剩余数量
    const restoredCounts = { ...state.remainingCounts };
    currentRoundWinnersList.forEach(w => {
      restoredCounts[w.prizeLevel]++;
    });
    
    setState(prev => ({
      ...prev,
      winners: prev.winners.filter(w => !currentRoundWinnerIds.has(w.employee.id)),
      currentRoundWinners: [],
      candidates: [...prev.candidates, ...prev.currentRoundWinners],
      remainingCounts: restoredCounts,
      status: 'idle',
    }));
    
    setSelectedEmployee(null);
    setRotationSpeed(0.2);
    speedRef.current = 0.2;
  }, [state.currentRoundWinners, state.winners, state.remainingCounts]);

  // 跳过到下一个奖品等级
  const skipToNextPrize = useCallback(() => {
    if (state.currentPrizeIndex < prizeConfig.length - 1) {
      setState(prev => ({
        ...prev,
        currentPrizeIndex: prev.currentPrizeIndex + 1,
        currentRoundWinners: [],
        status: 'idle',
      }));
      setSelectedEmployee(null);
      setRotationSpeed(0.2);
      speedRef.current = 0.2;
    }
  }, [state.currentPrizeIndex, prizeConfig.length]);
  
  // 重置所有
  const resetAll = useCallback(() => {
    clearAnimation();
    setState({
      currentPrizeIndex: 0,
      status: 'idle',
      candidates: [...employees],
      winners: [],
      currentRoundWinners: [],
      remainingCounts: prizeConfig.reduce((acc, prize) => ({
        ...acc,
        [prize.level]: prize.count,
      }), {} as Record<PrizeLevel, number>),
    });
    setSelectedEmployee(null);
    setRotationSpeed(0.2);
    setShowParticles(false);
    speedRef.current = 0.2;
  }, [employees, prizeConfig, clearAnimation]);
  
  // 自动进入下一奖品等级
  useEffect(() => {
    if (state.status === 'revealed' && state.remainingCounts[currentPrize.level] === 0) {
      // 当前等级抽完了，延迟后自动进入下一等级
      const timer = setTimeout(() => {
        if (state.currentPrizeIndex < prizeConfig.length - 1) {
          setState(prev => ({
            ...prev,
            currentPrizeIndex: prev.currentPrizeIndex + 1,
            currentRoundWinners: [],
            status: 'idle',
          }));
          setSelectedEmployee(null);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [state.status, state.remainingCounts, currentPrize.level, state.currentPrizeIndex, prizeConfig.length]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, [clearAnimation]);

  // 当外部数据源变化时，重置抽奖状态
  useEffect(() => {
    if (!providedEmployees || providedEmployees.length === 0) return;

    clearAnimation();
    setEmployees([...providedEmployees]);
    setState({
      currentPrizeIndex: 0,
      status: 'idle',
      candidates: [...providedEmployees],
      winners: [],
      currentRoundWinners: [],
      remainingCounts: prizeConfig.reduce((acc, prize) => ({
        ...acc,
        [prize.level]: prize.count,
      }), {} as Record<PrizeLevel, number>),
    });
    setSelectedEmployee(null);
    setRotationSpeed(0.2);
    setShowParticles(false);
    speedRef.current = 0.2;
  }, [providedEmployees, prizeConfig, clearAnimation]);
  
  return {
    state,
    currentPrize,
    allPrizes: prizeConfig,
    canDraw,
    rotationSpeed,
    isSpinning,
    selectedEmployee,
    showParticles,
    displayEmployees,
    startDraw,
    onWinnerSelected,
    removeWinner,
    resetCurrentRound,
    resetAll,
    skipToNextPrize,
  };
}
