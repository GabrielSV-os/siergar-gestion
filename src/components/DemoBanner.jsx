import { useState, useEffect } from 'react';
import { FlaskConical } from 'lucide-react';
import { demoMode } from '../lib/demoMode';

export default function DemoBanner() {
    const [enabled, setEnabled] = useState(demoMode.enabled);

    useEffect(() => demoMode.subscribe(setEnabled), []);

    if (!enabled) return null;

    return (
        <div className="demo-banner" role="alert">
            <FlaskConical size={15} />
            <span>Modo Prueba activo — los cambios no se guardarán</span>
        </div>
    );
}
