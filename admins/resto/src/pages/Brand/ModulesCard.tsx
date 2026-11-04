import React from 'react';
import { t } from '@admins/shared';
import { MODULE_HINT, MODULE_LABEL } from './labels';
import { setModule } from './brandModel';
import { MODULE_KEYS } from './types';
import { Notice, Section, SwitchRow } from './ui';
import type { SectionProps } from './ui';

/** (f) Bo'limlar: mehmon saytidagi bo'limlarni yoqish/o'chirish (hech narsa o'chib ketmaydi, faqat yashiriladi) */
export const ModulesCard: React.FC<SectionProps> = ({ draft, edit }) => (
  <Section title={t("Bo'limlar")} hint={t("Mehmon saytida qaysi bo'limlar ko'rinsin. O'chirilgan bo'lim yashiriladi, ma'lumotlaringiz saqlanadi.")}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {MODULE_KEYS.map((key) => (
        <SwitchRow
          key={key}
          label={t(MODULE_LABEL[key])}
          hint={t(MODULE_HINT[key])}
          checked={draft.modules[key]}
          onChange={(on) => edit((current) => setModule(current, key, on))}
        />
      ))}
    </div>
    {!draft.modules.menu && <Notice tone="warn">{t("Menyu o'chirilsa, mehmonlar taomlarni ko'ra olmaydi.")}</Notice>}
  </Section>
);
