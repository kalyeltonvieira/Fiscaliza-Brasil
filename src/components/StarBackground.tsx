/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

export const StarBackground = () => {
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: string; delay: string }[]>([]);

  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 5}s`,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="stars-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animation: `twinkle 3s ease-in-out infinite`,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
};
