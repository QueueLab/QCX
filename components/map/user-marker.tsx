'use client'

import React from 'react'
import Image from 'next/image'

const UserMarker: React.FC = () => {
  return (
    <div
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'rgba(0, 119, 255, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Image
        src="/user-location-marker.png"
        alt="User Location"
        width={20}
        height={20}
      />
    </div>
  )
}

export default UserMarker
