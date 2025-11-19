'use client'

import React from 'react'

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
      <img
        src="/user-location-marker.png"
        alt="User Location"
        style={{
          width: '20px',
          height: '20px'
        }}
      />
    </div>
  )
}

export default UserMarker
