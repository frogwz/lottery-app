import { useState, useEffect, Suspense, useRef, type ChangeEvent } from 'react';
import { RotateCcw, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import Sphere3D from '@/components/three/Sphere3D';
import PrizePanel from '@/components/PrizePanel';
import WinnerList from '@/components/WinnerList';
import WinnerModal from '@/components/WinnerModal';
import { useLottery } from '@/hooks/useLottery';
import { parseLotteryContent, isTauriRuntime } from '@/lib/lotteryData';
import type { Employee, PrizeConfig } from '@/types';
import './App.css';

// 加载中组件
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-[#f8bc36] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [dataEmployees, setDataEmployees] = useState<Employee[] | null>(null);
  const [dataPrizes, setDataPrizes] = useState<PrizeConfig[] | null>(null);
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map());
  // 保存原始员工数据（avatar 字段未被替换），用于头像匹配
  const [originalEmployees, setOriginalEmployees] = useState<Employee[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const {
    state,
    currentPrize,
    allPrizes,
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
  } = useLottery({
    prizeConfig: dataPrizes ?? undefined,
    employees: dataEmployees ?? undefined,
  });


  const applyImportedData = (employees: Employee[], prizes: PrizeConfig[]) => {
    // 保存原始员工数据（用于后续头像匹配）
    setOriginalEmployees(employees);

    // 如果有已导入的头像，应用到员工数据
    const employeesWithAvatars = employees.map(emp => {
      const avatarUrl = avatarMap.get(emp.name) || avatarMap.get(emp.avatar || '');
      return avatarUrl ? { ...emp, avatar: avatarUrl } : emp;
    });
    setDataEmployees(employeesWithAvatars);
    setDataPrizes(prizes);
    toast.success('已导入抽奖数据');
  };

  // 导入头像文件夹
  const handleImportAvatars = async () => {
    if (isTauriRuntime()) {
      try {
        const { open } = await import('@tauri-apps/api/dialog');
        const { readBinaryFile, readDir } = await import('@tauri-apps/api/fs');

        // 选择文件夹
        const folder = await open({
          directory: true,
          multiple: false,
          title: '选择头像文件夹',
        });
        if (!folder || Array.isArray(folder)) return;

        // 读取文件夹中的图片
        const entries = await readDir(folder);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const imageFiles = entries.filter(entry => {
          const name = entry.name?.toLowerCase() || '';
          return imageExtensions.some(ext => name.endsWith(ext));
        });

        if (imageFiles.length === 0) {
          toast.error('文件夹中没有找到图片文件');
          return;
        }

        const newAvatarMap = new Map(avatarMap);

        for (const file of imageFiles) {
          if (!file.path || !file.name) continue;
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const data = await readBinaryFile(file.path);
          const blob = new Blob([new Uint8Array(data)]);
          const url = URL.createObjectURL(blob);
          newAvatarMap.set(nameWithoutExt, url);
          newAvatarMap.set(file.name, url);
        }

        setAvatarMap(newAvatarMap);

        // 更新已有员工的头像（使用原始数据进行匹配）
        const sourceEmployees = originalEmployees || dataEmployees;
        if (sourceEmployees) {
          const updated = sourceEmployees.map(emp => {
            const avatarUrl = newAvatarMap.get(emp.name) || newAvatarMap.get(emp.avatar || '');
            return avatarUrl ? { ...emp, avatar: avatarUrl } : emp;
          });
          setDataEmployees([...updated]);
        }

        toast.success(`已导入 ${imageFiles.length} 张头像`);
      } catch {
        toast.error('导入头像失败');
      }
      return;
    }
    avatarInputRef.current?.click();
  };

  // Web 环境下处理头像文件选择
  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAvatarMap = new Map(avatarMap);

    for (const file of Array.from(files)) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const url = URL.createObjectURL(file);
      newAvatarMap.set(nameWithoutExt, url);
      newAvatarMap.set(file.name, url);
    }

    setAvatarMap(newAvatarMap);

    // 更新已有员工的头像
    if (dataEmployees) {
      const updated = dataEmployees.map(emp => {
        const avatarUrl = newAvatarMap.get(emp.name) || newAvatarMap.get(emp.avatar || '');
        return avatarUrl ? { ...emp, avatar: avatarUrl } : emp;
      });
      setDataEmployees(updated);
    }

    toast.success(`已导入 ${files.length} 张头像`);
    event.target.value = '';
  };

  const openDevtools = async () => {
    if (!isTauriRuntime()) return;
    // Tauri 1.x 不支持通过 API 打开 DevTools
    // 请在 tauri.conf.json 中设置 "devtools": true 或使用右键菜单
    toast.info('请使用右键菜单打开开发者工具', {
      description: '或在 tauri.conf.json 中启用 devtools',
    });
  };

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const combo =
        (isMac && event.metaKey && event.altKey && event.key.toLowerCase() === 'i') ||
        (!isMac && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i');
      if (combo) {
        event.preventDefault();
        openDevtools();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleImport = async () => {
    if (isTauriRuntime()) {
      try {
        const { open } = await import('@tauri-apps/api/dialog');
        const { readTextFile } = await import('@tauri-apps/api/fs');
        const file = await open({
          multiple: false,
          filters: [
            { name: '抽奖数据', extensions: ['json', 'txt'] },
          ],
        });
        if (!file || Array.isArray(file)) return;
        const text = await readTextFile(file);
        const parsed = parseLotteryContent(text);
        if (!parsed) {
          toast.error('数据格式不正确');
          return;
        }
        applyImportedData(parsed.employees, parsed.prizes);
      } catch {
        toast.error('导入失败');
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseLotteryContent(text);
    if (!parsed) {
      toast.error('数据格式不正确');
      return;
    }
    applyImportedData(parsed.employees, parsed.prizes);
    event.target.value = '';
  };

  // 不再自动加载本地数据，仅使用默认的3条示例数据
  // 用户需要通过导入按钮手动导入数据
  
  // 当中奖者揭晓时显示弹窗
  useEffect(() => {
    if (state.status === 'revealed' && selectedEmployee) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.status, selectedEmployee]);
  
  // 处理作废中奖者
  const handleRemoveWinner = (winnerId: string) => {
    removeWinner(winnerId);
    toast.success('已作废该中奖记录', {
      description: '该员工已回到候选池',
    });
  };
  
  // 处理重置本轮
  const handleResetRound = () => {
    resetCurrentRound();
    toast.info('已重置本轮抽奖', {
      description: '本轮中奖者已回到候选池',
    });
  };
  
  // 处理重置全部
  const handleResetAll = () => {
    if (confirm('确定要重置所有抽奖数据吗？所有中奖记录将被清空！')) {
      resetAll();
      toast.success('已重置所有数据');
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* 背景效果 */}
      <div className="fixed inset-0 spotlight-bg pointer-events-none" />
      
      {/* 顶部标题栏 */}
      <header className="fixed top-0 left-0 right-0 h-20 z-20 bg-gradient-to-b from-black to-transparent">
        <div className="h-full flex items-center justify-between px-8">
          {/* 左侧占位 */}
          <div className="w-20" />
          
          {/* 中央标题 */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-black shimmer-text tracking-wider">
              2026 年会抽奖系统
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#f8bc36]" />
              <span className="text-sm text-[#a8a8a8] tracking-widest">LUCKY DRAW</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#f8bc36]" />
            </div>
          </div>
          
          {/* 右侧控制 */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleImport}
              className="text-[#a8a8a8] hover:text-[#f8bc36] hover:bg-[#f8bc36]/10"
              title="导入数据"
            >
              <Upload className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleImportAvatars}
              className="text-[#a8a8a8] hover:text-[#f8bc36] hover:bg-[#f8bc36]/10"
              title="导入头像"
            >
              <Image className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetAll}
              className="text-[#a8a8a8] hover:text-red-400 hover:bg-red-400/10"
              title="重置所有数据"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="pt-20 h-screen flex">
        {/* 左侧控制面板 */}
        <aside className="w-80 h-full border-r border-[#f8bc36]/20 bg-black/50 backdrop-blur-sm">
          <PrizePanel
            currentPrize={currentPrize}
            remainingCount={state.remainingCounts[currentPrize.level]}
            totalCount={allPrizes.find(p => p.level === currentPrize.level)?.count || 0}
            allPrizes={allPrizes}
            onDraw={startDraw}
            onReset={handleResetRound}
            onSkip={skipToNextPrize}
            isDrawing={isSpinning}
            canDraw={canDraw}
            currentRoundCount={state.currentRoundWinners.length}
            winnersCount={state.winners.length}
          />
        </aside>
        
        {/* 中央3D区域 */}
        <section className="flex-1 relative">
          {/* 3D球体 */}
          <Suspense fallback={<LoadingSpinner />}>
            <Sphere3D
              employees={displayEmployees}
              winners={state.winners}
              selectedEmployee={selectedEmployee}
              rotationSpeed={rotationSpeed}
              isSpinning={isSpinning}
              showParticles={showParticles}
              onStopSelectWinner={onWinnerSelected}
            />
          </Suspense>
          
          {/* 3D区域叠加信息 */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 当前中奖者高亮显示 */}
            {selectedEmployee && state.status === 'revealed' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-in zoom-in fade-in duration-500">
                <div className="text-6xl md:text-8xl font-black gold-gradient-text drop-shadow-[0_0_30px_rgba(248,188,54,0.5)]">
                  {selectedEmployee.name}
                </div>
                <div className="text-xl text-[#a8a8a8] mt-2">
                  {currentPrize.name} · {currentPrize.prize}
                </div>
              </div>
            )}
            
            {/* 抽奖状态提示 */}
            {isSpinning && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#1a1a1a]/80 border border-[#f8bc36]/30">
                  <div className="w-3 h-3 rounded-full bg-[#f8bc36] animate-pulse" />
                  <span className="text-[#f8bc36] font-semibold">
                    {state.status === 'accelerating' && '加速中...'}
                    {state.status === 'spinning' && '抽奖进行中...'}
                    {state.status === 'decelerating' && '即将揭晓...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* 右侧中奖名单 */}
        <aside className="w-80 h-full">
          <WinnerList
            winners={state.winners}
            currentRoundWinners={state.currentRoundWinners}
            currentPrizeName={currentPrize.name}
            currentPrizeLevel={currentPrize.level}
            onRemoveWinner={handleRemoveWinner}
          />
        </aside>
      </main>
      
      {/* 中奖弹窗 */}
      <WinnerModal
        isOpen={showModal}
        winner={selectedEmployee}
        prizeName={currentPrize.prize}
        prizeLevel={currentPrize.level}
        onClose={() => setShowModal(false)}
      />
      
      {/* Toast通知 */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            border: '1px solid rgba(248, 188, 54, 0.3)',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
