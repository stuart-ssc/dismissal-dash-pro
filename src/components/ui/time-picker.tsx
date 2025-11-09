import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string // HH:MM format (24-hour)
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse the 24-hour time value into 12-hour format
  const parseTime = (time24: string) => {
    if (!time24) return { hour: "", minute: "", period: "AM" }
    
    const [hours, minutes] = time24.split(":")
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const period = hour24 >= 12 ? "PM" : "AM"
    
    return {
      hour: hour12.toString(),
      minute: minutes,
      period,
    }
  }

  // Convert 12-hour format to 24-hour format
  const formatTime24 = (hour: string, minute: string, period: string) => {
    if (!hour || !minute) return ""
    
    let hour24 = parseInt(hour, 10)
    if (period === "PM" && hour24 !== 12) {
      hour24 += 12
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`
  }

  const { hour, minute, period } = parseTime(value || "")

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    const time24 = formatTime24(newHour, newMinute, newPeriod)
    onChange?.(time24)
  }

  // Format display time
  const displayTime = value
    ? `${hour}:${minute} ${period}`
    : null

  // Generate hour options (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString())
  
  // Generate minute options (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => 
    i.toString().padStart(2, "0")
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Hour</label>
            <Select
              value={hour}
              onValueChange={(h) => handleTimeChange(h, minute || "00", period)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Minute</label>
            <Select
              value={minute}
              onValueChange={(m) => handleTimeChange(hour || "12", m, period)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Period</label>
            <Select
              value={period}
              onValueChange={(p) => handleTimeChange(hour || "12", minute || "00", p)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
