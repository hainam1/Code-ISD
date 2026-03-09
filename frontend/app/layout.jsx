import './globals.css';

export const metadata = {
  title: 'Smart Guard',
  description: 'Smart Guard security recruitment platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
