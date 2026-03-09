'use client'

import { useEffect, useState } from 'react'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import { RefreshCw, Database, FileJson, AlertTriangle, CheckCircle, XCircle, ArrowRightLeft, Globe } from 'lucide-react'

interface DebugFile {
  filename: string
  display_name: string
  exists: boolean
  size: number
}

interface CompareResult {
  system_only: Array<{ symbol: string; data: Record<string, unknown> }>
  manual_only: Array<{ symbol: string; data: Record<string, unknown> }>
  diff_positions: Array<{ symbol: string; name: string; diff: Record<string, { system: unknown; manual: unknown }> }>
  match_positions: string[]
}

interface MarketSnapshot {
  success: boolean
  message: string
  data: Array<Record<string, unknown>>
  count: number
}

export default function DebugPage() {
  const [files, setFiles] = useState<DebugFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('system_account.json')
  const [fileContent, setFileContent] = useState<Record<string, unknown> | null>(null)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncingSnapshot, setSyncingSnapshot] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const fetchFiles = async () => {
    const data = await apiClient.getDebugFiles()
    if (data) {
      setFiles(data)
    }
  }

  const fetchFileContent = async (filename: string) => {
    setLoading(true)
    const data = await apiClient.getDebugFile(filename)
    if (data) {
      if (data.error) {
        setFileContent({ error: data.error })
      } else {
        setFileContent(data.content)
      }
    }
    setLoading(false)
  }

  const fetchCompare = async () => {
    setLoading(true)
    const data = await apiClient.getDebugCompare()
    if (data) {
      setCompareResult(data)
    }
    setLoading(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    const result = await apiClient.debugSync()
    if (result) {
      setSyncMessage(result.message)
      // 刷新数据
      await Promise.all([fetchFiles(), fetchFileContent(selectedFile), fetchCompare()])
    }
    setSyncing(false)
  }

  const fetchMarketSnapshot = async () => {
    setLoading(true)
    const data = await apiClient.getMarketSnapshot()
    if (data) {
      setMarketSnapshot(data)
    }
    setLoading(false)
  }

  const handleSyncMarketSnapshot = async () => {
    setSyncingSnapshot(true)
    setSyncMessage(null)
    const result = await apiClient.syncMarketSnapshot()
    if (result) {
      setSyncMessage(result.message)
      // 刷新市场快照
      await fetchMarketSnapshot()
    }
    setSyncingSnapshot(false)
  }

  useEffect(() => {
    fetchFiles()
    fetchFileContent(selectedFile)
    fetchCompare()
  }, [selectedFile])

  const formatJson = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return '无法格式化'
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">数据调测中心</h1>
              <p className="text-muted-foreground">检查数据同步状态，查看原始数据文件</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing} variant="default">
                {syncing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                )}
                数据同步
              </Button>
              <Button
                onClick={() => {
                  fetchFiles()
                  fetchFileContent(selectedFile)
                  fetchCompare()
                }}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新
              </Button>
            </div>
          </div>

          {/* 同步消息提示 */}
          {syncMessage && (
            <Card className={syncMessage.includes('失败') ? 'border-destructive' : 'border-green-500'}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  {syncMessage.includes('失败') ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className={syncMessage.includes('失败') ? 'text-destructive' : 'text-green-600'}>
                    {syncMessage}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="files" className="space-y-4">
            <TabsList>
              <TabsTrigger value="files">
                <FileJson className="mr-2 h-4 w-4" />
                数据文件
              </TabsTrigger>
              <TabsTrigger value="compare">
                <Database className="mr-2 h-4 w-4" />
                账本对比
              </TabsTrigger>
              <TabsTrigger value="market">
                <Globe className="mr-2 h-4 w-4" />
                市场快照
              </TabsTrigger>
            </TabsList>

            {/* 数据文件 Tab */}
            <TabsContent value="files" className="space-y-4">
              {/* 文件列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">数据文件列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {files.map((file) => (
                      <button
                        key={file.filename}
                        onClick={() => setSelectedFile(file.filename)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedFile === file.filename
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {file.exists ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium truncate">{file.display_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file.exists ? formatSize(file.size) : '不存在'}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* JSON 内容展示 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      文件内容: {selectedFile}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(formatJson(fileContent))
                      }}
                    >
                      复制
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : fileContent ? (
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[500px] font-mono">
                      {formatJson(fileContent)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      无数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 账本对比 Tab */}
            <TabsContent value="compare" className="space-y-4">
              {loading && !compareResult ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : compareResult ? (
                <>
                  {/* 对比概览 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {compareResult.match_positions.length}
                          </div>
                          <div className="text-sm text-muted-foreground">一致持仓</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {compareResult.system_only.length}
                          </div>
                          <div className="text-sm text-muted-foreground">仅系统账本</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-500">
                            {compareResult.manual_only.length}
                          </div>
                          <div className="text-sm text-muted-foreground">仅人工账本</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-500">
                            {compareResult.diff_positions.length}
                          </div>
                          <div className="text-sm text-muted-foreground">持仓差异</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 差异详情 */}
                  {compareResult.diff_positions.length > 0 && (
                    <Card className="border-red-500/50">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <CardTitle className="text-lg">持仓差异</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {compareResult.diff_positions.map((item) => (
                            <div key={item.symbol} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                              <div className="font-medium mb-2">
                                {item.symbol} - {item.name}
                              </div>
                              {Object.entries(item.diff).map(([field, values]) => (
                                <div key={field} className="text-sm flex gap-4">
                                  <span className="text-muted-foreground w-20">{field}:</span>
                                  <span className="text-blue-600">系统: {String((values as { system: unknown }).system)}</span>
                                  <span className="text-orange-600">人工: {String((values as { manual: unknown }).manual)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 仅系统账本 */}
                  {compareResult.system_only.length > 0 && (
                    <Card className="border-blue-500/50">
                      <CardHeader>
                        <CardTitle className="text-lg">仅系统账本存在</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {compareResult.system_only.map((item) => (
                            <div key={item.symbol} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                              <span className="font-medium">{item.symbol}</span>
                              <Badge variant="outline">股数: {String(item.data.shares)}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 仅人工账本 */}
                  {compareResult.manual_only.length > 0 && (
                    <Card className="border-orange-500/50">
                      <CardHeader>
                        <CardTitle className="text-lg">仅人工账本存在</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {compareResult.manual_only.map((item) => (
                            <div key={item.symbol} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                              <span className="font-medium">{item.symbol}</span>
                              <Badge variant="outline">股数: {String(item.data.shares)}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 一致的持仓 */}
                  {compareResult.match_positions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-500">一致的持仓 ({compareResult.match_positions.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {compareResult.match_positions.map((symbol) => (
                            <Badge key={symbol} variant="secondary">
                              {symbol}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : null}
            </TabsContent>

            {/* 市场快照 Tab */}
            <TabsContent value="market" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">市场全貌快照</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSyncMarketSnapshot}
                        disabled={syncingSnapshot}
                        variant="default"
                      >
                        {syncingSnapshot ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="mr-2 h-4 w-4" />
                        )}
                        同步市场快照
                      </Button>
                      <Button onClick={fetchMarketSnapshot} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        刷新
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : marketSnapshot ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        {marketSnapshot.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className={marketSnapshot.success ? 'text-green-600' : 'text-destructive'}>
                          {marketSnapshot.message}
                        </span>
                        {marketSnapshot.count > 0 && (
                          <Badge variant="secondary">{marketSnapshot.count} 条记录</Badge>
                        )}
                      </div>
                      
                      {marketSnapshot.data.length > 0 ? (
                        <>
                          {/* 数据表格 */}
                          <div className="overflow-auto max-h-[600px] border rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-muted sticky top-0">
                                <tr>
                                  {Object.keys(marketSnapshot.data[0]).slice(0, 10).map((key) => (
                                    <th key={key} className="px-3 py-2 text-left font-medium">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {marketSnapshot.data.slice(0, 100).map((row, idx) => (
                                  <tr key={idx} className="border-t hover:bg-muted/50">
                                    {Object.keys(row).slice(0, 10).map((key) => (
                                      <td key={key} className="px-3 py-2">
                                        {String(row[key] ?? '-')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* 原始 JSON */}
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                              查看原始 JSON 数据
                            </summary>
                            <pre className="mt-2 bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px] font-mono">
                              {formatJson(marketSnapshot.data)}
                            </pre>
                          </details>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          点击「同步市场快照」按钮获取当日市场全貌数据
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      点击「同步市场快照」按钮获取当日市场全貌数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
