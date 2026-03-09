'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Play,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  ChevronRight,
  RefreshCw,
  Zap,
  CandlestickChart,
  FileText,
  PieChart,
  BarChart3,
  Wallet,
  AlertTriangle,
  History,
  LayoutDashboard,
  Search
} from 'lucide-react'

// 💡 核心组件导入 (确保组件内部已适配 strategyId 路径)
import { StrategySelector } from '@/components/charts/StrategySelector'
import { EquityCurveChart } from '@/components/charts/EquityCurveChart'
import { DrawdownChart } from '@/components/charts/DrawdownChart'
import { KlineSignalChart } from '@/components/charts/KlineSignalChart'
import { TradeLogTable } from '@/components/charts/TradeLogTable'
import { PnlImpactCard } from '@/components/charts/PnlImpactCard'
import { CapitalUsageCard } from '@/components/charts/CapitalUsageCard'
import { WinRatePieChart } from '@/components/charts/WinRatePieChart'

import { apiClient } from '@/lib/api'
import { PortfolioData, StrategyConfig } from '@/types'

/** * 策略定义：对应后端 data/backtest/ 目录下的文件夹名
 */
const STRATEGIES = [
  { id: 'strategy_trend', name: '大格局趋势策略 v5.1', type: 'MA_Long_System' },
  { id: 'strategy_ma520', name: '均线交叉系统', type: 'CrossOver' },
]

export default function StrategyDashboard() {
  // --- 1. 状态定义 ---
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id)
  const [summary, setSummary] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [config, setConfig] = useState<StrategyConfig | null>(null)
  const [trades, setTrades] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTuning, setIsTuning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- 2. 数据刷新逻辑 (核心总轴) ---
  const refreshAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      /**
       * 并发请求四路数据：
       * 1. assets: 实盘即时资金状态
       * 2. summary: 后端 pushjson 推送的 Sharpe/Calmar 等回测统计
       * 3. strategy/params: 策略当前执行参数
       * 4. backtest/trades: 宏观分析所需的原始流水
       */
      const [assetData, summaryData, configData, tradesData] = await Promise.all([
        apiClient.getPortfolioAssets(),
        apiClient.request(`/api/v1/backtest/summary?strategy_id=${selectedStrategy}`),
        apiClient.getStrategyConfig(),
        apiClient.getBacktestTrades()
      ])

      if (assetData) setPortfolio(assetData)
      if (summaryData) setSummary(summaryData)
      if (configData) setConfig(configData)
      if (tradesData) setTrades(tradesData)

    } catch (err: any) {
      console.error('Data sync failed:', err)
      setError("无法连接到核心总线，请检查 API 服务状态。")
    } finally {
      setLoading(false)
    }
  }, [selectedStrategy])

  // 初始化加载
  useEffect(() => {
    refreshAllData()
  }, [refreshAllData])

  // --- 3. 业务动作处理器 ---

  /** 启动 AI 调优任务 */
  const handleRunAiTuning = async () => {
    setIsTuning(true)
    try {
      // 触发后端异步任务
      await apiClient.request('/api/v1/tuning/start', { method: 'POST' })
      alert("🔥 AI 寻优引擎已启动！500 次贝叶斯迭代正在后台压榨牛股主升浪...")
    } catch (err) {
      alert("引擎启动失败，请检查 Python 环境配置。")
    } finally {
      setIsTuning(false)
    }
  }

  /** 保存并下发参数至实盘 */
  const handleSaveParams = async () => {
    if (!config) return
    const success = await apiClient.saveStrategyConfig(config)
    if (success) {
      alert("✅ 策略配置已成功下发至实盘内存，下个 K 线周期将生效。")
      refreshAllData()
    }
  }

  /** 一键强制账本校准 */
  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const result = await apiClient.syncLedger()
      if (result) {
        alert("账本同步成功：已根据人工输入补全云端现价与盈亏。")
        refreshAllData()
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // --- 4. 辅助渲染逻辑 ---
  const currentEquity = portfolio?.metrics?.total_pnl || 0
  const isProfit = currentEquity >= 0

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 overflow-y-auto relative">
        {/* 全局加载遮罩 */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">

          {/* 🚀 页面页眉：核心控制区 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">研发调优中心</h1>
              </div>
              <p className="text-muted-foreground ml-11">
                大格局审计：不翻倍不参与，翻倍必须抓到
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StrategySelector
                strategies={STRATEGIES}
                selectedId={selectedStrategy}
                onSelect={setSelectedStrategy}
              />
              <Button variant="outline" size="sm" onClick={refreshAllData}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                同步快照
              </Button>
              <Button size="sm" onClick={handleRunAiTuning} disabled={isTuning} className="bg-orange-600 hover:bg-orange-700">
                <Zap className="h-4 w-4 mr-2" />
                启动 AI 调优
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>连接异常</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 📊 第一维：宏观精算指标卡 (由 summary.json 驱动) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">策略总盈亏 (Net)</CardTitle>
                <TrendingUp className={`h-4 w-4 ${isProfit ? 'text-red-500' : 'text-green-500'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${isProfit ? 'text-red-500' : 'text-green-500'}`}>
                  {isProfit ? '+' : ''}{summary?.total_pnl?.toLocaleString() ?? '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  累计实现净收益 (CNY)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">夏普比率 (Sharpe)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {summary?.sharpe_ratio?.toFixed(2) ?? '0.00'}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={summary?.sharpe_ratio > 1.5 ? 'default' : 'secondary'}>
                    {summary?.sharpe_ratio > 1.5 ? '表现优秀' : '波动较大'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最大回撤 (MaxDD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {summary?.max_drawdown?.toFixed(2) ?? '0.00'}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  风控预警线: <span className="font-medium">15.00%</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">卡玛比率 (Calmar)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {summary?.calmar_ratio?.toFixed(2) ?? '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  每单位风险换取的超额回报
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 🧩 第二维：多维分析看板 */}
          <Tabs defaultValue="backtest_macro" className="space-y-6">
            <div className="flex items-center justify-between bg-muted/30 p-1 rounded-lg">
              <TabsList className="bg-transparent">
                <TabsTrigger value="backtest_macro" className="data-[state=active]:bg-background">
                  <BarChart3 className="h-4 w-4 mr-2" /> 回测概览(宏观)
                </TabsTrigger>
                <TabsTrigger value="individual_audit" className="data-[state=active]:bg-background">
                  <Search className="h-4 w-4 mr-2" /> 个股精细审计
                </TabsTrigger>
                <TabsTrigger value="strategy_config" className="data-[state=active]:bg-background">
                  <Settings className="h-4 w-4 mr-2" /> 策略动态参数
                </TabsTrigger>
                <TabsTrigger value="full_logs" className="data-[state=active]:bg-background">
                  <History className="h-4 w-4 mr-2" /> 审计流水明细
                </TabsTrigger>
              </TabsList>
            </div>

            {/* A. 宏观概览标签页 */}
            <TabsContent value="backtest_macro" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <EquityCurveChart strategyId={selectedStrategy} title="资产净值对标曲线" />
                <DrawdownChart strategyId={selectedStrategy} title="历史动态回撤分析" />
              </div>

              {/* 💡 宏观三剑客回归：展示全局层面的统计 */}
              <div className="grid gap-6 lg:grid-cols-3">
                <PnlImpactCard trades={trades} totalEquity={10000000} />
                <CapitalUsageCard positions={portfolio?.positions} totalEquity={10000000} />
                <WinRatePieChart trades={trades} />
              </div>
            </TabsContent>

            {/* B. 个股精细审计标签页 (专业蜡烛图组件) */}
            <TabsContent value="individual_audit">
              <KlineSignalChart strategyId={selectedStrategy} />
            </TabsContent>

            {/* C. 策略动态参数设置 */}
            <TabsContent value="strategy_config" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* 风险控制组 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-500" /> 风控核心阈值
                    </CardTitle>
                    <CardDescription>直接影响 AI 的主升浪捕获惩罚系数</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>硬止损比例 (Stop Loss)</Label>
                        <span className="font-mono text-red-500">{(config?.stop_loss_pct || 0) * 100}%</span>
                      </div>
                      <Slider
                        value={[(config?.stop_loss_pct || 0.05) * 100]}
                        max={15} min={2} step={0.5}
                        onValueChange={(v) => setConfig(prev => prev ? {...prev, stop_loss_pct: v[0]/100} : null)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>主升浪宽限期 (Trailing Stop)</Label>
                        <span className="font-mono text-blue-500">{(config?.trailing_stop_pct || 0) * 100}%</span>
                      </div>
                      <Slider
                        value={[(config?.trailing_stop_pct || 0.2) * 100]}
                        max={40} min={10} step={1}
                        onValueChange={(v) => setConfig(prev => prev ? {...prev, trailing_stop_pct: v[0]/100} : null)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 均线系统组 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" /> 均线多头引擎 (MA)
                    </CardTitle>
                    <CardDescription>锁定范围: 30 - 150 周期</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-6 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>短期均线</Label>
                        <Input type="number" value={config?.ma_short || ''} onChange={(e) => setConfig(prev => prev ? {...prev, ma_short: +e.target.value} : null)} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>中期均线</Label>
                        <Input type="number" value={config?.ma_mid || ''} onChange={(e) => setConfig(prev => prev ? {...prev, ma_mid: +e.target.value} : null)} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>长期基准 (Trend)</Label>
                        <Input type="number" value={config?.ma_long || ''} onChange={(e) => setConfig(prev => prev ? {...prev, ma_long: +e.target.value} : null)} />
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-md text-xs text-muted-foreground">
                      💡 提示：当前寻优脚本 `ma_long` 设置为 {config?.ma_long}。增加此数值可有效过滤“非翻倍股”的杂波，但会牺牲入场时机。
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  修改参数将立即覆盖 `best_params_win50p.json`
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={refreshAllData}>重置更改</Button>
                  <Button onClick={handleSaveParams} className="bg-primary px-8">
                    <Play className="h-4 w-4 mr-2" /> 保存并同步至实盘
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* D. 完整审计流水 */}
            <TabsContent value="full_logs">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>回测成交流水 (逐笔对账)</CardTitle>
                    <CardDescription>
                      包含 ID、成交金额、持股天数及 AI 买入逻辑审计
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleManualSync}>
                    <RefreshCw className="h-4 w-4 mr-2" /> 强制全账本对账
                  </Button>
                </CardHeader>
                <CardContent>
                  <TradeLogTable />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  )
}