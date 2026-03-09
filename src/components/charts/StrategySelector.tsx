'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// 💡 仅保留核心字段，删除冗余的 return_pct 和 status
interface Strategy {
  id: string
  name: string
  type: string
}

interface StrategySelectorProps {
  strategies: Strategy[]
  selectedId: string
  onSelect: (id: string) => void
}

export function StrategySelector({ strategies, selectedId, onSelect }: StrategySelectorProps) {
  const selectedStrategy = strategies.find(s => s.id === selectedId)

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">策略切换:</span>
        <Select value={selectedId} onValueChange={onSelect}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="选择策略" />
          </SelectTrigger>
          <SelectContent>
            {strategies.map((strategy) => (
              <SelectItem key={strategy.id} value={strategy.id}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{strategy.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* 💡 仅在外部显示类型标签，不再在下拉框内混杂数据 */}
      {selectedStrategy && (
        <Badge variant="outline" className="hidden md:inline-flex bg-muted/50">
          {selectedStrategy.type}
        </Badge>
      )}
    </div>
  )
}