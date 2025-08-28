import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// Secure chart configuration type
export type SecureChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<string, string>
  }
}

type ChartContextProps = {
  config: SecureChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

// Secure color validation
function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  
  // Allow CSS color names, hex, rgb, hsl, and CSS variables
  const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|var\(--[a-zA-Z0-9-_]+\)|[a-zA-Z]+)$/;
  return colorRegex.test(color) && color.length < 100;
}

// Secure CSS variable generation
function generateSecureCSSVars(config: SecureChartConfig): string {
  const validEntries = Object.entries(config).filter(([key, itemConfig]) => {
    // Validate key format
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) return false;
    
    // Validate colors
    if (itemConfig.color && !isValidColor(itemConfig.color)) return false;
    if (itemConfig.theme) {
      return Object.values(itemConfig.theme).every(isValidColor);
    }
    
    return true;
  });

  return validEntries
    .map(([key, itemConfig]) => {
      const color = itemConfig.color || (itemConfig.theme && Object.values(itemConfig.theme)[0]);
      return color ? `  --color-${key}: ${color};` : '';
    })
    .filter(Boolean)
    .join('\n');
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: SecureChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${(id || uniqueId).replace(/[^a-zA-Z0-9_-]/g, '')}`

  // Generate secure CSS styles
  const secureStyles = React.useMemo(() => {
    const cssVars = generateSecureCSSVars(config);
    return cssVars ? `[data-chart="${chartId}"] {\n${cssVars}\n}` : '';
  }, [config, chartId]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        {secureStyles && (
          <style>{secureStyles}</style>
        )}
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "SecureChart"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartLegend = RechartsPrimitive.Legend

// Reuse existing tooltip and legend components with security improvements
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    // Sanitize label to prevent XSS
    const sanitizedLabel = React.useMemo(() => {
      if (typeof label === 'string') {
        return label.replace(/[<>]/g, '');
      }
      return label;
    }, [label]);

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && sanitizedLabel && (
          <div className={cn("font-medium", labelClassName)}>
            {sanitizedLabel}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key]
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div key={`${item.dataKey}-${index}`} className="flex items-center gap-2">
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1 h-4": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                      }
                    )}
                    style={{
                      backgroundColor: isValidColor(indicatorColor) ? indicatorColor : '#ccc',
                    }}
                  />
                )}
                <div className="flex flex-1 justify-between">
                  <span className="text-muted-foreground">
                    {itemConfig?.label || item.name}
                  </span>
                  {item.value && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "SecureChartTooltip"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
}