export function DecorativePanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden rounded-3xl lg:block">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-orange-300" />

      {/* Arc pattern overlay */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Generate multiple overlapping arcs */}
        {Array.from({ length: 5 }).map((_, i) => (
          <g key={i}>
            {Array.from({ length: 4 }).map((_, j) => (
              <ellipse
                key={`${i}-${j}`}
                cx={100 + j * 80}
                cy={600 - i * 120}
                rx={120 + j * 20}
                ry={100 + i * 10}
                stroke="rgba(30, 41, 59, 0.15)"
                strokeWidth="1"
                fill="none"
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}
