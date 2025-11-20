import * as React from "react"

const TABLET_MIN_WIDTH = 768
const TABLET_MAX_WIDTH = 1023

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${TABLET_MAX_WIDTH}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}
