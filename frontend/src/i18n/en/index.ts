// Barcha ushbu tilning lug'at fayllarini bitta bo'lakka yig'adi (til tanlanganda bitta so'rov). Yangi fayl qo'shilsa o'zi qo'shiladi.
const parts = import.meta.glob<Record<string, string>>(['./*.ts', '!./index.ts'], { eager: true, import: 'default' })

export default Object.assign({}, ...Object.values(parts)) as Record<string, string>
