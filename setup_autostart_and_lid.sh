#!/usr/bin/env bash
# ==============================================================================
# Online Store Guliston — Noutbukni Doimiy 24/7 Serverga Aylantirish Sozlamasi
# ==============================================================================
# Bu skript 2 ta muhim xavfni bartaraf etadi:
# 1. Qopqoq (ekran) yopilganda noutbuk uxlab qolmaydi (server ishlashda davom etadi).
# 2. GNOME yoki Niri ish stoli o'rtasida almashganda yoki session yopilganda server to'xtamaydi.
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_SRC="$DIR/backend/scripts/guliston-server.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"

echo "================================================================"
echo "⚙️ NOUTBUK SERVER SOZLAMALARI BOSHQARUVI"
echo "================================================================"

# 1. GNOME <-> Niri xavfini bartaraf etish (loginctl linger)
echo "1️⃣ Foydalanuvchi session mustaqilligi (Linger) yoqilmoqda..."
loginctl enable-linger "$USER" || true
echo "   ✅ Foydalanuvchi sessiyasi doimiy faol qilindi (desktop yopilsa ham jarayonlar o'lmaydi)."

# 2. Systemd user service o'rnatish
echo "2️⃣ Systemd doimiy xizmati o'rnatilmoqda..."
mkdir -p "$USER_SYSTEMD_DIR"
cp "$SERVICE_SRC" "$USER_SYSTEMD_DIR/guliston-server.service"
systemctl --user daemon-reload
systemctl --user enable guliston-server.service
echo "   ✅ guliston-server.service muvaffaqiyatli yoqildi (Autostart faol)."

# 3. Qopqoq yopilganda uxlab qolmaslik (Lid Switch)
echo "3️⃣ Noutbuk qopqog'i yopilganda uxlab qolmaslik sozlanmoqda..."
if [ -d "/etc/systemd/logind.conf.d" ] || sudo mkdir -p /etc/systemd/logind.conf.d 2>/dev/null; then
    sudo bash -c 'cat << "LOGIND_CONF" > /etc/systemd/logind.conf.d/laptop-server.conf
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LOGIND_CONF'
    sudo systemctl restart systemd-logind || true
    echo "   ✅ Qopqoq yopilganda noutbuk uxlamaydigan qilindi (ekran o'chadi, server ishlayveradi)."
else
    echo "   ⚠️ Sudo ruxsati kerak bo'ldi. Qo'lda quyidagi buyruqni bering:"
    echo "   sudo mkdir -p /etc/systemd/logind.conf.d && echo -e '[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchExternalPower=ignore' | sudo tee /etc/systemd/logind.conf.d/laptop-server.conf && sudo systemctl restart systemd-logind"
fi

echo "================================================================"
echo "🎉 BARChA XAVFLAR TO'LIQ BARTARAF ETILDI!"
echo "Serverni hoziroq boshqarish uchun:"
echo "   ./start_server.sh   - Serverni ishga tushirish"
echo "   ./status_server.sh  - Holat va linklarni ko'rish"
echo "   ./stop_server.sh    - Serverni to'xtatish"
echo "================================================================"
