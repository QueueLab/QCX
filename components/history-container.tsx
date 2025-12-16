import React from 'react'
import { History } from './history'

type HistoryContainerProps = {
  location: 'sidebar' | 'header'
}

const HistoryContainer: React.FC<HistoryContainerProps> = ({ location }) => {
  return (
    <div className="block">
      <History location={location} />
    </div>
  )
}

export default HistoryContainer
