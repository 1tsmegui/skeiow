import { memo } from 'react';

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="about-card">
      <div className="about-card__icon">
        <Icon />
      </div>
      <h3 className="about-card__title">{title}</h3>
      <p className="about-card__text">{text}</p>
    </div>
  );
}

export default memo(FeatureCard);
