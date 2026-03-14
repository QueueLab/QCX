'use client'

import React, { useEffect, useState } from 'react'
import '98.css'
import { content } from './j-space-content'

export function JSpaceUI() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Import 98-components only on the client side
    import('98-components').then(() => {
      setIsLoaded(true)
    })
  }, [])

  if (!isLoaded) return null

  const getImageUrl = (filename: string) => {
    return `/j-space/assets/${filename}`
  }

  return (
    <div className="j-space-container" style={{ 
      fontFamily: '"Jersey 10", sans-serif',
      backgroundColor: '#c0c0c0',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* @ts-ignore */}
      <win98-desktop style={{ height: '100%', width: '100%' }}>
        {/* About Me Window */}
        {/* @ts-ignore */}
        <win98-window title="About_Me.exe" resizable show-minimize class="window-about-me" style={{
          position: 'absolute',
          top: '10vh',
          left: '10vw',
          width: '22vw',
          height: '55vh',
          zIndex: 10
        }}>
          <div className="window-body">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <img src={getImageUrl('Jeremypixel.png')} alt="Jeremy Pixel" style={{ width: '100px', border: '2px solid #808080' }} />
            </div>
            <h2 style={{ textAlign: 'center', margin: '5px 0' }}>{content.aboutMe.name}</h2>
            <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{content.aboutMe.title}</p>
            <p>{content.aboutMe.bio}</p>
            <hr />
            <h3>Current Activities:</h3>
            <ul>
              {content.aboutMe.currentActivities.map((activity, i) => (
                <li key={i}>{activity}</li>
              ))}
            </ul>
          </div>
        {/* @ts-ignore */}
        </win98-window>

        {/* Skills Window */}
        {/* @ts-ignore */}
        <win98-window title="Skills.exe" resizable show-minimize class="window-skills" style={{
          position: 'absolute',
          top: '13vh',
          right: '6vw',
          width: '18vw',
          height: '35vh',
          zIndex: 10
        }}>
          <div className="window-body">
            <h3>Programming Languages</h3>
            <p>{content.skills.programmingLanguages}</p>
            <hr />
            <h3>Web & UI</h3>
            <p>{content.skills.webUI}</p>
            <hr />
            <h3>Developer Tools</h3>
            <p>{content.skills.developerTools}</p>
          </div>
        {/* @ts-ignore */}
        </win98-window>

        {/* Projects Window */}
        {/* @ts-ignore */}
        <win98-window title="Projects.exe" resizable show-minimize class="window-projects" style={{
          position: 'absolute',
          top: '2vh',
          left: '33vw',
          width: '42vw',
          height: '88vh',
          zIndex: 10
        }}>
          <div className="window-body" style={{ overflowY: 'auto', height: 'calc(100% - 40px)' }}>
            {content.projects.map((project, i) => (
              <div key={i} style={{ marginBottom: '20px', borderBottom: '1px solid #808080', paddingBottom: '10px' }}>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                {project.image && (
                  <img src={getImageUrl(`${project.image}.png`)} alt={project.title} style={{ width: '100%', border: '1px solid #808080' }} 
                       onError={(e) => { (e.target as HTMLImageElement).src = getImageUrl(`${project.image}.gif`) }} />
                )}
                <div style={{ marginTop: '10px' }}>
                  {project.github && <a href={project.github} target="_blank" rel="noreferrer"><button>GitHub</button></a>}
                  {project.website && <a href={project.website} target="_blank" rel="noreferrer"><button style={{ marginLeft: '5px' }}>Website</button></a>}
                </div>
              </div>
            ))}
          </div>
        {/* @ts-ignore */}
        </win98-window>

        {/* Taskbar */}
        {/* @ts-ignore */}
        <win98-taskbar slot="taskbar"></win98-taskbar>
      </win98-desktop>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Jersey+10&display=swap');
        
        .j-space-container * {
          cursor: default !important;
        }
        .j-space-container a, 
        .j-space-container button,
        .j-space-container [role="button"] {
          cursor: pointer !important;
        }
        
        .window-body h3 {
          font-size: 1.2em;
          margin: 10px 0 5px 0;
        }
        
        .window-body p {
          margin: 5px 0;
        }
        
        .window-body ul {
          padding-left: 20px;
        }
      `}</style>
    </div>
  )
}
