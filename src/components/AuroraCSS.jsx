import { useEffect } from 'react';

const KEYFRAMES = `
@keyframes aurora-drift-0 {
  0%   { transform: translate(-50%, -50%) scale(1)    rotate(0deg);  }
  100% { transform: translate(-35%, -60%) scale(1.15) rotate(15deg); }
}
@keyframes aurora-drift-1 {
  0%   { transform: translate(-50%, -50%) scale(1.1)  rotate(0deg);   }
  100% { transform: translate(-65%, -40%) scale(0.9)  rotate(-20deg); }
}
@keyframes aurora-drift-2 {
  0%   { transform: translate(-50%, -50%) scale(0.95) rotate(0deg);  }
  100% { transform: translate(-40%, -65%) scale(1.1)  rotate(10deg); }
}
`;

export default function AuroraCSS({ colorStops = ['#3A29FF', '#FF94B4', '#FF3232'], amplitude = 1, blend = 0.5 }) {
    useEffect(() => {
        const id = 'aurora-css-style';
        if (!document.getElementById(id)) {
            const s = document.createElement('style');
            s.id = id;
            s.textContent = KEYFRAMES;
            document.head.appendChild(s);
        }
    }, []);

    const baseDuration = 10 / amplitude;
    const positions = [
        { left: '20%', top: '40%' },
        { left: '65%', top: '35%' },
        { left: '45%', top: '70%' },
    ];

    return (
        <div className="aurora-bg" style={{
            position: 'absolute', inset: 0, zIndex: 0,
            pointerEvents: 'none', overflow: 'hidden',
        }}>
            {colorStops.map((color, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: positions[i % positions.length].left,
                    top: positions[i % positions.length].top,
                    width: '65vw', height: '65vh',
                    borderRadius: '50%',
                    background: color,
                    filter: 'blur(90px)',
                    opacity: blend,
                    transform: 'translate(-50%, -50%)',
                    animation: `aurora-drift-${i % 3} ${baseDuration + i * 3}s ease-in-out infinite alternate`,
                }} />
            ))}
        </div>
    );
}
