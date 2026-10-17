import { GuitarActivityView } from '../components/GuitarActivityView';
import { PageHead } from '../components/Layout';
import { EXERCISES, isAvailable } from '../exercises/registry';
import { UNITS } from '../program/curriculum';

/** Un'attività del programma aperta da sola, fuori dalla sessione di oggi. */
export function ActivityPage({ unitId, index }: { unitId: string; index: number }) {
  const unit = UNITS.find((u) => u.id === unitId);
  const activity = unit?.activities[index];
  if (!unit || !activity) {
    return (
      <div class="page">
        <PageHead title="Attività non trovata" back="#/programma" />
      </div>
    );
  }
  if (activity.type === 'guitar') {
    return (
      <div class="page">
        <PageHead title={unit.title} back="#/programma" />
        <GuitarActivityView activity={activity} />
      </div>
    );
  }
  if (!isAvailable(activity.exercise)) {
    return (
      <div class="page">
        <PageHead title={activity.title} back="#/programma" />
        <p class="empty">Questo esercizio è in arrivo.</p>
      </div>
    );
  }
  const Comp = EXERCISES[activity.exercise].Component;
  return <Comp config={activity.config ?? {}} title={activity.title} back="#/programma" />;
}
