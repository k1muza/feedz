'use client'

import { IPlayerProps } from '@lottiefiles/react-lottie-player'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// 2) Tell Next’s dynamic() that we’re loading a ComponentType<LottiePlayerProps>
const Player: ComponentType<IPlayerProps> = dynamic(
  (): Promise<ComponentType<IPlayerProps>> =>
    import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
  { ssr: false }
)

export default Player
