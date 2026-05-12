import { useState, useEffect } from 'react';

export default function AnimatedCheckbox({ checked, onChange, size = 20 }) {
    const [isChecked, setIsChecked] = useState(checked);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        setIsChecked(checked);
    }, [checked]);

    function handleClick() {
        const newVal = !isChecked;
        setIsChecked(newVal);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 300);
        if (onChange) onChange({ target: { checked: newVal } });
    }

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isChecked}
            className={`animated-checkbox ${isChecked ? 'checked' : ''} ${animating ? 'animating' : ''}`}
            onClick={handleClick}
            style={{ width: size, height: size }}
        >
            {isChecked && (
                <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ width: size - 6, height: size - 6 }}
                >
                    <path
                        d="M3 7.5L5.5 10L11 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="checkmark-path"
                    />
                </svg>
            )}
        </button>
    );
}
