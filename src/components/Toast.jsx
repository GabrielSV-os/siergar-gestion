import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

const DURATION = 4000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, DURATION);
    }, []);

    function dismiss(id) {
        setToasts(prev => prev.filter(t => t.id !== id));
    }

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <div className="toast-icon">
                            {t.type === 'success' && <CheckCircle size={22} />}
                            {t.type === 'error' && <XCircle size={22} />}
                            {t.type === 'info' && <Info size={22} />}
                        </div>
                        <span className="toast-message">{t.message}</span>
                        <button className="toast-close" onClick={() => dismiss(t.id)} title="Cerrar">
                            <X size={14} />
                        </button>
                        <div
                            className="toast-progress"
                            style={{ animationDuration: `${DURATION}ms` }}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
