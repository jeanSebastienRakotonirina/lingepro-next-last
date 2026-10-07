import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  icons: {
    icon: '/favicon.png',
  },
  title: "Text'eau — Le nettoyage nature",
  description: 'Gestion de blanchisserie professionnelle',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
