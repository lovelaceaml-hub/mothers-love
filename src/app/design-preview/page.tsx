import { notFound } from 'next/navigation';
import { LocalDesignPreview } from './preview';
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <LocalDesignPreview />;
}
