"use client"

import * as React from "react"
import type { SetType } from "@/lib/types"

type SetTypeContextProps = {
  setType: SetType
  setSetType: (type: SetType) => void
}

const SetTypeContext = React.createContext<SetTypeContextProps | null>(null)

export function useSetType() {
  const context = React.useContext(SetTypeContext)
  if (!context) {
    throw new Error("useSetType must be used within a SetTypeProvider")
  }
  return context
}

export function SetTypeProvider({ children }: { children: React.ReactNode }) {
  const [setType, setSetType] = React.useState<SetType>("mini_dev")

  const value = React.useMemo(
    () => ({ setType, setSetType }),
    [setType]
  )

  return (
    <SetTypeContext.Provider value={value}>
      {children}
    </SetTypeContext.Provider>
  )
}
