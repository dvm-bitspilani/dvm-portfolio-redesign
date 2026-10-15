import type { ReactNode } from 'react'
import SwellText from './SwellText'

const FROM: [number, number] = [760, 75]
const TO: [number, number] = [200, 100]

interface Props {
  letter: string
  section: string
  title: string
  dek?: ReactNode
  aside?: ReactNode
}

/** Section front: the nav word morphs into this title through a View Transition. */
export default function PageHead({ letter, section, title, dek, aside }: Props) {
  return (
    <header className="pr-head">
      <div className="pr-head-rule">
        <span>Section {letter}</span>
        <span>{section}</span>
        <span>Vol. 2026 · BITS Pilani</span>
      </div>
      <h1 className="pr-head-title">
        <span data-vt-title>
          <SwellText text={title} from={FROM} to={TO} radius={0.7} />
        </span>
      </h1>
      <div className="pr-head-foot">
        {dek && <p className="pr-head-dek">{dek}</p>}
        {aside && <div className="pr-head-aside">{aside}</div>}
      </div>
    </header>
  )
}
