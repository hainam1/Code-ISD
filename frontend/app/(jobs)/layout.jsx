import AppHeader from '@/shared/components/layout/AppHeader';
import AppFooter from '@/shared/components/layout/AppFooter';
import ChatWidget from '@/shared/components/chat/ChatWidget';

export default function JobsLayout({ children }) {
  return (
    <div>
      <AppHeader />
      <main style={{ paddingTop: '64px' }}>
        {children}
      </main>
      <ChatWidget />
      <AppFooter />
    </div>
  );
}
