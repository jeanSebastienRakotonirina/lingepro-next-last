import Shell from '@/components/Shell';
import DateBanner from '@/components/DateBanner';

export default function AppLayout({ children }) {
  return (
    <Shell>
      <DateBanner />
      {children}
    </Shell>
  );
}
