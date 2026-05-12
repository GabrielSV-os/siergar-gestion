import { useEffect, useRef } from 'react';

export default function HoleBackground({
    strokeColor = '#c0c0c0',
    numberOfLines = 40,
    numberOfDiscs = 35,
    particleRGBColor = [100, 80, 160]
}) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Generate lines (random angles through viewport)
        const lines = [];
        for (let i = 0; i < numberOfLines; i++) {
            lines.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                angle: Math.random() * Math.PI,
                speed: (Math.random() - 0.5) * 0.15,
                length: Math.max(canvas.width, canvas.height) * 1.5,
            });
        }

        // Generate floating discs
        const discs = [];
        for (let i = 0; i < numberOfDiscs; i++) {
            discs.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                pulseSpeed: Math.random() * 0.02 + 0.005,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }

        let time = 0;

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 0.016;

            // Draw grid lines
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.3;

            lines.forEach(line => {
                line.angle += line.speed * 0.01;

                const cos = Math.cos(line.angle);
                const sin = Math.sin(line.angle);
                const halfLen = line.length / 2;

                ctx.beginPath();
                ctx.moveTo(line.x - cos * halfLen, line.y - sin * halfLen);
                ctx.lineTo(line.x + cos * halfLen, line.y + sin * halfLen);
                ctx.stroke();
            });

            ctx.globalAlpha = 1;

            // Draw floating discs with pulsing glow
            discs.forEach(disc => {
                disc.x += disc.speedX;
                disc.y += disc.speedY;

                // Wrap around edges
                if (disc.x < -10) disc.x = canvas.width + 10;
                if (disc.x > canvas.width + 10) disc.x = -10;
                if (disc.y < -10) disc.y = canvas.height + 10;
                if (disc.y > canvas.height + 10) disc.y = -10;

                // Pulse
                const pulse = Math.sin(time * disc.pulseSpeed * 60 + disc.pulsePhase);
                const alpha = disc.opacity + pulse * 0.15;
                const clampedAlpha = Math.max(0.05, Math.min(0.6, alpha));
                const r = disc.radius + pulse * 0.5;

                // Glow
                const gradient = ctx.createRadialGradient(disc.x, disc.y, 0, disc.x, disc.y, r * 3);
                gradient.addColorStop(0, `rgba(${particleRGBColor.join(',')}, ${clampedAlpha})`);
                gradient.addColorStop(0.4, `rgba(${particleRGBColor.join(',')}, ${clampedAlpha * 0.3})`);
                gradient.addColorStop(1, `rgba(${particleRGBColor.join(',')}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(disc.x, disc.y, r * 3, 0, Math.PI * 2);
                ctx.fill();

                // Core dot
                ctx.fillStyle = `rgba(${particleRGBColor.join(',')}, ${clampedAlpha * 1.5})`;
                ctx.beginPath();
                ctx.arc(disc.x, disc.y, r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Subtle central vignette
            const vignette = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.1,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            vignette.addColorStop(0, 'rgba(255,255,255,0)');
            vignette.addColorStop(1, 'rgba(200,190,230,0.06)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            animRef.current = requestAnimationFrame(animate);
        }

        animRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [strokeColor, numberOfLines, numberOfDiscs, particleRGBColor]);

    return (
        <div className="stars-background">
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
