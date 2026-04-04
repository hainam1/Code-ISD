export default function ActionButton({ as: Component = 'button', children, className, ...props }) {
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
}
