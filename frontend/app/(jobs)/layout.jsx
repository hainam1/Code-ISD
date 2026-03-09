import AppHeader from '../../components/layout/AppHeader';
import AppFooter from '../../components/layout/AppFooter';

export default function JobsLayout({ children }) {
  return (
    <>
      <AppHeader />
      {children}
      <AppFooter />
    </>
  );
}
