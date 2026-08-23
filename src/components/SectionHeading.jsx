import './SectionHeading.css';

export default function SectionHeading({ eyebrow, title, className = '' }) {
  return (
    <div className={`section-heading${className ? ` ${className}` : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-heading__title">{title}</h2>
      <div className="underline-accent underline-accent--center" />
    </div>
  );
}
