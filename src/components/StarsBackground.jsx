import { useState, useEffect, useRef } from 'react';

export default function StarsBackground({ starCount = 150 }) {
    const [isDark, setIsDark] = useState(() => {
        return document.documentElement.getAttribute('data-theme') !== 'light';
    });
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

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

        // Generate stars
        const stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.05,
                opacity: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                glowSize: Math.random() > 0.85 ? Math.random() * 4 + 2 : 0, // 15% of stars glow
            });
        }

        // Shooting stars
        const shootingStars = [];
        function spawnShootingStar() {
            if (shootingStars.length < 2 && Math.random() < 0.008) {
                shootingStars.push({
                    x: Math.random() * canvas.width * 0.8,
                    y: Math.random() * canvas.height * 0.3,
                    length: Math.random() * 80 + 40,
                    speed: Math.random() * 6 + 4,
                    angle: (Math.random() * 20 + 20) * (Math.PI / 180),
                    opacity: 1,
                    life: 1,
                });
            }
        }

        let time = 0;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 0.016;

            // Draw stars
            stars.forEach(star => {
                // Move upward
                star.y -= star.speed;
                if (star.y < -5) {
                    star.y = canvas.height + 5;
                    star.x = Math.random() * canvas.width;
                }

                // Twinkle
                const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinklePhase);
                const alpha = star.opacity + twinkle * 0.3;
                const clampedAlpha = Math.max(0.05, Math.min(1, alpha));

                const baseColor = isDark ? '255,255,255' : '15,10,40';

                // Glow halo for bright stars
                if (star.glowSize > 0) {
                    const gradient = ctx.createRadialGradient(
                        star.x, star.y, 0,
                        star.x, star.y, star.glowSize
                    );
                    const glowColor = isDark ? '140,130,255' : '80,60,160';
                    gradient.addColorStop(0, `rgba(${glowColor}, ${clampedAlpha * 0.4})`);
                    gradient.addColorStop(1, `rgba(${glowColor}, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.glowSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Star dot
                ctx.fillStyle = `rgba(${baseColor}, ${clampedAlpha})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Shooting stars
            spawnShootingStar();
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += Math.cos(ss.angle) * ss.speed;
                ss.y += Math.sin(ss.angle) * ss.speed;
                ss.life -= 0.015;
                ss.opacity = ss.life;

                if (ss.life <= 0) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                const tailX = ss.x - Math.cos(ss.angle) * ss.length;
                const tailY = ss.y - Math.sin(ss.angle) * ss.length;

                const gradient = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
                const ssColor = isDark ? '255,255,255' : '60,40,120';
                gradient.addColorStop(0, `rgba(${ssColor}, 0)`);
                gradient.addColorStop(1, `rgba(${ssColor}, ${ss.opacity * 0.8})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(ss.x, ss.y);
                ctx.stroke();

                // Head glow
                const headGlow = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 3);
                headGlow.addColorStop(0, `rgba(${ssColor}, ${ss.opacity})`);
                headGlow.addColorStop(1, `rgba(${ssColor}, 0)`);
                ctx.fillStyle = headGlow;
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(animate);
        }

        animRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [isDark, starCount]);

    return (
        <div className="stars-background">
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            <div className={`stars-twinkle ${isDark ? 'dark' : 'light'}`} />
        </div>
    );
}
