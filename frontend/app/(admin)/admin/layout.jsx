import ChatWidget from '@/shared/components/chat/ChatWidget';

export default function AdminLayout({ children }) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
