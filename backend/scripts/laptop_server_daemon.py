#!/usr/bin/env python3
"""
Online Store Guliston — Noutbuk Doimiy Server Daemoni (v2.0)
============================================================
1. Gunicorn WSGI serverni 127.0.0.1:8000 da ishga tushiradi.
2. Cloudflared quick tunnel ni ishga tushiradi va loglarini to'g'ridan-to'g'ri yozadi.
3. Yangi hosil bo'lgan https://*.trycloudflare.com domenini va "Registered tunnel connection" holatini aniqlaydi.
4. backend/.env dagi PUBLIC_DOMAIN va SITE_URL ni yangilaydi.
5. Telegram webhook va Mini App menu tugmasini (DNS propagatsiyasi kutgan holda 5 marta urinish bilan) o'rnatadi.
6. Har 10 soniyada monitoring olib boradi; uzilish bo'lsa tiklaydi.
7. GNOME yoki Niri session almashganda SIGHUP ni e'tiborsiz qoldirib orqa fonda ishlayveradi.
"""

import os
import sys
import time
import signal
import subprocess
import re
import json
from datetime import datetime
from pathlib import Path

# Asosiy yo'llar
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
LOG_DIR = BACKEND_DIR / "logs"
BIN_DIR = BACKEND_DIR / "bin"
CLOUDFLARED_BIN = BIN_DIR / "cloudflared"
VENV_PYTHON = BACKEND_DIR / "venv" / "bin" / "python"
VENV_GUNICORN = BACKEND_DIR / "venv" / "bin" / "gunicorn"
ENV_FILE = BACKEND_DIR / ".env"
PID_FILE = LOG_DIR / "server_daemon.pid"
STATUS_FILE = LOG_DIR / "server_status.json"
DAEMON_LOG = LOG_DIR / "server_daemon.log"
GUNICORN_LOG = LOG_DIR / "gunicorn_error.log"
CLOUDFLARE_LOG = LOG_DIR / "cloudflared.log"

os.makedirs(LOG_DIR, exist_ok=True)

gunicorn_proc = None
cloudflared_proc = None
running = True
current_tunnel_url = None
cf_log_fd = None


def log(message: str, level: str = "INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [{level}] {message}"
    print(formatted, flush=True)
    try:
        with open(DAEMON_LOG, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def kill_port_8000():
    try:
        subprocess.run(["fuser", "-k", "8000/tcp"], capture_output=True, timeout=5)
        time.sleep(1)
    except Exception:
        pass


def update_env_file(new_url: str):
    if not ENV_FILE.exists():
        log(f".env fayli topilmadi: {ENV_FILE}", "WARN")
        return

    domain = new_url.replace("https://", "").replace("http://", "").strip("/")
    try:
        content = ENV_FILE.read_text(encoding="utf-8")
        if "PUBLIC_DOMAIN=" in content:
            content = re.sub(r"PUBLIC_DOMAIN=[^\r\n]*", f"PUBLIC_DOMAIN={domain}", content)
        else:
            content += f"\nPUBLIC_DOMAIN={domain}\n"

        if "SITE_URL=" in content:
            content = re.sub(r"SITE_URL=[^\r\n]*", f"SITE_URL={new_url}", content)
        else:
            content += f"\nSITE_URL={new_url}\n"

        ENV_FILE.write_text(content, encoding="utf-8")
        log(f".env muvaffaqiyatli yangilandi: PUBLIC_DOMAIN={domain}, SITE_URL={new_url}")
    except Exception as e:
        log(f".env ni yangilashda xatolik: {e}", "ERROR")


def sync_telegram_webhook(url: str, max_retries: int = 6):
    """DNS propagatsiyasini hisobga olib bir necha marta qayta urinish"""
    log(f"Telegram webhook va Mini App menyusi sozlanmoqda: {url}")
    for attempt in range(1, max_retries + 1):
        try:
            res = subprocess.run(
                [str(VENV_PYTHON), "manage.py", "set_telegram_webhook", url],
                cwd=str(BACKEND_DIR),
                capture_output=True,
                text=True,
                timeout=30,
            )
            if res.returncode == 0:
                log(f"✅ Telegram webhook muvaffaqiyatli ulandi:\n{res.stdout.strip()}", "SUCCESS")
                return True
            else:
                err_msg = res.stderr.strip()
                if "Failed to resolve host" in err_msg or "400" in err_msg:
                    log(f"⏳ DNS propagatsiyasi kutilmoqda ({attempt}/{max_retries}). 4 soniyadan keyin qayta uriniladi...", "INFO")
                    time.sleep(4)
                else:
                    log(f"Telegram webhook xatosi ({attempt}/{max_retries}): {err_msg}", "WARN")
                    time.sleep(3)
        except Exception as e:
            log(f"set_telegram_webhook chaqirishda xatolik ({attempt}/{max_retries}): {e}", "WARN")
            time.sleep(3)
    return False


def save_status(status: str, url: str = None):
    data = {
        "status": status,
        "url": url or current_tunnel_url,
        "gunicorn_pid": gunicorn_proc.pid if gunicorn_proc else None,
        "cloudflared_pid": cloudflared_proc.pid if cloudflared_proc else None,
        "daemon_pid": os.getpid(),
        "updated_at": datetime.now().isoformat(),
    }
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        log(f"Status saqlashda xato: {e}", "WARN")


def load_env_into_process():
    if ENV_FILE.exists():
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ[k.strip()] = v.strip()
        except Exception:
            pass


def start_gunicorn():
    global gunicorn_proc
    kill_port_8000()
    load_env_into_process()
    log("Gunicorn WSGI server ishga tushirilmoqda (workers=2, bind=127.0.0.1:8000)...")

    cmd = [
        str(VENV_GUNICORN),
        "backend.wsgi:application",
        "--bind", "127.0.0.1:8000",
        "--workers", "2",
        "--threads", "2",
        "--reload",
        "--timeout", "60",
        "--capture-output",
        "--access-logfile", str(LOG_DIR / "gunicorn_access.log"),
        "--error-logfile", str(GUNICORN_LOG),
    ]

    gunicorn_proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    log(f"Gunicorn ishga tushdi (PID={gunicorn_proc.pid})")
    time.sleep(2)
    return gunicorn_proc


def start_cloudflared():
    global cloudflared_proc, current_tunnel_url, cf_log_fd
    if not CLOUDFLARED_BIN.exists():
        log(f"cloudflared binar fayli topilmadi: {CLOUDFLARED_BIN}", "FATAL")
        return None

    # Eski log faylni tozalash
    cf_log_fd = open(CLOUDFLARE_LOG, "w+", encoding="utf-8")

    log("Cloudflared tunnel ishga tushirilmoqda...")
    cmd = [
        str(CLOUDFLARED_BIN),
        "tunnel",
        "--url", "http://127.0.0.1:8000",
    ]

    cloudflared_proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=cf_log_fd,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    log(f"Cloudflared ishga tushdi (PID={cloudflared_proc.pid})")

    # URL va Tunnel ulanishini aniqlash (maksimal 35 soniya)
    tunnel_url = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    start_wait = time.time()
    has_registered = False

    while time.time() - start_wait < 35:
        if cloudflared_proc.poll() is not None:
            log("Cloudflared kutilmaganda to'xtadi!", "ERROR")
            break

        cf_log_fd.flush()
        try:
            with open(CLOUDFLARE_LOG, "r", encoding="utf-8") as f:
                content = f.read()
                if not tunnel_url:
                    match = url_pattern.search(content)
                    if match:
                        tunnel_url = match.group(0)
                        log(f"🌐 Cloudflare URL aniqlandi: {tunnel_url}", "INFO")

                if "Registered tunnel connection" in content:
                    has_registered = True
                    log("✅ Cloudflare Edge tarmog'iga muvaffaqiyatli ulandi (Registered tunnel connection)!", "INFO")
                    break
        except Exception:
            pass

        time.sleep(0.5)

    if tunnel_url:
        current_tunnel_url = tunnel_url
        update_env_file(tunnel_url)
        domain = tunnel_url.replace("https://", "").replace("http://", "").strip("/")
        os.environ['PUBLIC_DOMAIN'] = domain
        os.environ['SITE_URL'] = tunnel_url
        save_status("running", tunnel_url)

        # Gunicorn workerlarini yangi domen bilan yangilash
        if gunicorn_proc and gunicorn_proc.poll() is None:
            try:
                gunicorn_proc.send_signal(signal.SIGHUP)
                log(f"🔄 Gunicorn master (PID={gunicorn_proc.pid}) ga SIGHUP yuborildi (ishchi jarayonlar yangilandi).")
            except Exception as ge:
                log(f"Gunicorn reload xatosi: {ge}", "WARN")

        # DNS propagatsiyasini biroz kutib webhook o'rnatish
        time.sleep(2)
        sync_telegram_webhook(tunnel_url)
    else:
        log("Tunnel URL ni olish imkoni bo'lmadi!", "WARN")
        save_status("tunnel_pending", None)

    return cloudflared_proc



def shutdown(signum, frame):
    global running, gunicorn_proc, cloudflared_proc, cf_log_fd
    log(f"Signal qabul qilindi ({signum}), server to'xtatilmoqda...")
    running = False

    if gunicorn_proc and gunicorn_proc.poll() is None:
        log(f"Gunicorn to'xtatilmoqda (PID={gunicorn_proc.pid})...")
        try:
            os.killpg(os.getpgid(gunicorn_proc.pid), signal.SIGTERM)
        except Exception:
            gunicorn_proc.terminate()

    if cloudflared_proc and cloudflared_proc.poll() is None:
        log(f"Cloudflared to'xtatilmoqda (PID={cloudflared_proc.pid})...")
        try:
            os.killpg(os.getpgid(cloudflared_proc.pid), signal.SIGTERM)
        except Exception:
            cloudflared_proc.terminate()

    if cf_log_fd and not cf_log_fd.closed:
        cf_log_fd.close()

    kill_port_8000()
    save_status("stopped", None)

    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except Exception:
            pass

    log("Server to'liq to'xtatildi.")
    sys.exit(0)


def check_health():
    global gunicorn_proc, cloudflared_proc
    if gunicorn_proc is None or gunicorn_proc.poll() is not None:
        log("⚠️ Gunicorn ishlamayapti! Qayta ishga tushirilmoqda...", "WARN")
        start_gunicorn()

    if cloudflared_proc is None or cloudflared_proc.poll() is not None:
        log("⚠️ Cloudflared ishlamayapti! Qayta ishga tushirilmoqda...", "WARN")
        start_cloudflared()

    save_status("running", current_tunnel_url)


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGHUP, signal.SIG_IGN)

    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    log("=" * 60)
    log("🚀 Guliston Online Store Server Daemoni ishga tushmoqda")
    log(f"Daemon PID: {os.getpid()}")
    log("=" * 60)

    start_gunicorn()
    start_cloudflared()

    while running:
        try:
            time.sleep(10)
            check_health()
        except KeyboardInterrupt:
            break
        except Exception as e:
            log(f"Monitoring siklida xatolik: {e}", "ERROR")
            time.sleep(5)

    shutdown(signal.SIGTERM, None)


if __name__ == "__main__":
    main()
