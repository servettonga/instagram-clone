// /explore

'use client';

import Image from 'next/image';
import styles from './explore.module.css';

const EXPLORE_POSTS = Array.from({ length: 27 }, (_, i) => ({
  id: `explore-${i}`,
  imageUrl: `https://picsum.photos/seed/explore${i}/293/293`,
  likes: Math.floor(Math.random() * 100000),
  comments: Math.floor(Math.random() * 1000),
}));

export default function ExplorePage() {
  return (
    <div className={styles.exploreContainer}>
      <div className={styles.exploreGrid}>
        {EXPLORE_POSTS.map((post) => (
          <div key={post.id} className={styles.gridItem}>
            <Image
              src={post.imageUrl}
              alt="Explore post"
              fill
              sizes="(max-width: 768px) 33vw, 293px"
              className={styles.gridImage}
              unoptimized
            />
            <div className={styles.overlay}>
              <div className={styles.stats}>
                <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {post.likes.toLocaleString()}
                </span>
                <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                  {post.comments.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
