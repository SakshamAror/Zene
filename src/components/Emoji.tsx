import React from 'react';

// Utility to detect Apple devices
export function isAppleDevice() {
    if (typeof navigator === 'undefined') return false;
    // Robustly match all Apple devices
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

type EmojiSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;

interface EmojiProps {
    emoji: string;
    png: string;
    alt?: string;
    className?: string;
    size?: EmojiSize;
    style?: React.CSSProperties;
}

const sizeMap: { [key: string]: { fontSize: string; px: number } } = {
    sm: { fontSize: '1.25rem', px: 20 },
    md: { fontSize: '2rem', px: 32 },
    lg: { fontSize: '2.5rem', px: 40 },
    xl: { fontSize: '3rem', px: 48 },
    '2xl': { fontSize: '4rem', px: 64 },
    '3xl': { fontSize: '5rem', px: 80 },
};

export function Emoji({ emoji, png, alt, className = '', size = 'xl', style = {} }: EmojiProps) {
    const apple = isAppleDevice();
    let fontSize: string | undefined = undefined;
    let width: number | undefined = undefined;
    let height: number | undefined = undefined;
    if (typeof size === 'string' && sizeMap[size]) {
        fontSize = sizeMap[size].fontSize;
        width = height = sizeMap[size].px;
    } else if (typeof size === 'number') {
        fontSize = `${size}px`;
        width = height = size;
    }
    if (apple) {
        return (
            <span
                role="img"
                aria-label={alt || ''}
                className={`inline-flex items-center justify-center leading-none select-none ${className}`}
                style={{ fontSize, ...style }}
            >
                {emoji}
            </span>
        );
    }
    return (
        <img
            src={png.startsWith('/') ? png : `/emojis/${png}`}
            alt={alt || ''}
            className={`inline-block align-middle object-contain ${className}`}
            style={{ width, height, ...style }}
            draggable={false}
        />
    );
} 