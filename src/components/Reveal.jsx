import useInView from '../hooks/useInView';

/**
 * Reveal
 *
 * Wrap any block with <Reveal> to fade+slide it in once on scroll.
 * `delay` (ms) staggers groups of siblings; `as` picks the wrapper tag.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
  const [ref, isInView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`reveal${isInView ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
