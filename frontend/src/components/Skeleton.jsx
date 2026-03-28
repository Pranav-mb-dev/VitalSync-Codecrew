import React from 'react';

/**
 * Premium Skeleton component for loading states
 * @param {('text'|'title'|'avatar'|'button'|'rect'|'circle')} variant - Shape of the skeleton
 * @param {string} width - Custom width (e.g. '100%', '200px')
 * @param {string} height - Custom height
 * @param {object} style - Additional inline styles
 */
export default function Skeleton({ 
  variant = 'rect', 
  width, 
  height, 
  className = '', 
  style = {} 
}) {
  const baseClass = 'skeleton-shimmer';
  const variantClass = `skeleton-${variant}`;
  
  const combinedStyle = {
    ...(width && { width }),
    ...(height && { height }),
    ...style
  };

  return (
    <div 
      className={`${baseClass} ${variantClass} ${className}`} 
      style={combinedStyle} 
    />
  );
}
