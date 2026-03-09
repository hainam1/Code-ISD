import BrandBlock from './BrandBlock';

export default function AuthCard({ title, description, children }) {
  return (
    <div>
      <BrandBlock />
      <div>{children}</div>
    </div>
  );
}
