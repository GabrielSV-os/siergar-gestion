import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // The scrollable area is .main-content — attach listener after mount
        const container = document.querySelector('.main-content');
        if (!container) return;

        function handleScroll() {
            setVisible(container.scrollTop > 280);
        }

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    function handleClick() {
        const container = document.querySelector('.main-content');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <button
            onClick={handleClick}
            className={`scroll-to-top-btn ${visible ? 'scroll-to-top-visible' : ''}`}
            title="Volver arriba"
            aria-label="Volver arriba"
        >
            <ChevronUp size={20} />
        </button>
    );
}
