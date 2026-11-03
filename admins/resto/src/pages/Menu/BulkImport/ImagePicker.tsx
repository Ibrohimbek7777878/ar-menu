import React, { useState } from 'react';
import { ImageCell } from './ImageCell';
import { ImageSearchPanel } from './ImageSearchPanel';
import type { ImageChoice } from './types';

interface ImagePickerProps {
  /** Taom nomi: qidiruv so'zi sifatida olinadi. */
  query: string;
  value: ImageChoice | null;
  onChange: (next: ImageChoice | null) => void;
  /** Taomning hozirgi saqlangan rasmi (tahrirlashda). */
  currentPreview?: string | null;
  /** "O'z rasmim" tugmasi (taom formasida alohida fayl tanlash bor, shuning uchun u yerda yopiladi). */
  allowOwn?: boolean;
}

/**
 * Qayta ishlatiladigan rasm tanlagich: "Rasm topish" -> internetdan variantlar -> tanlash (yoki o'z rasmini yuklash).
 * Tanlangan rasmning tokeni `POST/PATCH products` ga `image_token` sifatida yuboriladi.
 */
export const ImagePicker: React.FC<ImagePickerProps> = ({ query, value, onChange, allowOwn = true, currentPreview = null }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ImageCell
        name={query}
        value={value}
        onChange={onChange}
        onFind={() => setOpen((prev) => !prev)}
        findOpen={open}
        allowOwn={allowOwn}
        currentPreview={currentPreview}
      />
      {open && (
        <ImageSearchPanel
          initialQuery={query}
          onPicked={(choice) => {
            onChange(choice);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};
