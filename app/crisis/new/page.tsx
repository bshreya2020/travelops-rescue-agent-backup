import { Suspense } from 'react';
import { CrisisForm } from '@/components/crisis/CrisisForm';
import { PageLayout } from '@/components/layout/PageLayout';

export default function NewCrisisPage() {
  return (
    <PageLayout>
      <Suspense fallback={<div className="py-8 text-slate-400">Loading trip form…</div>}>
        <CrisisForm />
      </Suspense>
    </PageLayout>
  );
}
