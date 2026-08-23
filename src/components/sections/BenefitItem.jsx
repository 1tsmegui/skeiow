import { memo } from 'react';

function BenefitItem({ icon: Icon, title, text }) {
  return (
    <div className="benefit-item">
      <div className="benefit-item__icon">
        <Icon />
      </div>
      <div>
        <h3 className="benefit-item__title">{title}</h3>
        <p className="benefit-item__text">{text}</p>
      </div>
    </div>
  );
}

export default memo(BenefitItem);
