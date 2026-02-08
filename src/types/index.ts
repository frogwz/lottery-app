// 员工信息
export interface Employee {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
}

// 奖品等级
export type PrizeLevel = 'lucky' | 'third' | 'second' | 'first' | 'special';

// 奖品配置
export interface PrizeConfig {
  level: PrizeLevel;
  name: string;
  count: number;
  prize: string;
  icon?: string;
}

// 中奖记录
export interface Winner {
  id: string;
  employee: Employee;
  prizeLevel: PrizeLevel;
  prizeName: string;
  timestamp: number;
}

// 抽奖状态
export type DrawStatus = 'idle' | 'accelerating' | 'spinning' | 'decelerating' | 'stopped' | 'revealed';

// 3D球体元素
export interface SphereElement {
  id: string;
  employee: Employee;
  position: [number, number, number];
  phi: number; // 极角
  theta: number; // 方位角
}

// 抽奖状态管理
export interface LotteryState {
  currentPrizeIndex: number;
  status: DrawStatus;
  candidates: Employee[];
  winners: Winner[];
  currentRoundWinners: Employee[];
  remainingCounts: Record<PrizeLevel, number>;
}

// 3D动画配置
export interface AnimationConfig {
  baseSpeed: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  minDuration: number;
  maxDuration: number;
}

// 组件Props
export interface Sphere3DProps {
  employees: Employee[];
  winners: Winner[];
  isSpinning: boolean;
  spinSpeed: number;
  onSpinComplete?: () => void;
  selectedEmployee?: Employee | null;
}

export interface WinnerListProps {
  winners: Winner[];
  currentPrize: PrizeConfig;
  currentRoundWinners: Employee[];
  onRemoveWinner?: (winnerId: string) => void;
}

export interface PrizePanelProps {
  currentPrize: PrizeConfig;
  remainingCount: number;
  totalCount: number;
  allPrizes: PrizeConfig[];
  onDraw: () => void;
  onReset: () => void;
  isDrawing: boolean;
  canDraw: boolean;
}
