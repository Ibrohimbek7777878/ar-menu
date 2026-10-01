#!/usr/bin/env python3
"""
Online Store Guliston — Noutbuk Doimiy Multi-Port Server Daemoni (v3.0)
=====================================================================
Ushbu daemon loyihadagi 3 ta mustaqil mahsulotni ALOHIDA PORTLAR va ALOHIDA URLLARDA boshqaradi:

1. Mahsulot #1: Restoran 3D/AR & NFC Menyu
   - Port: 8001
   - Bosh sahifa (/): Restoran 3D Menyu (tma_home)
   - Alohida Cloudflare Tunneli va URL
   - Telegram Webhook: @marketing_orign_bot

2. Mahsulot #2: Online Store Guliston (Marketplace)
   - Port: 8002
   - Bosh sahifa (/): Online Store Gipermarket (customer_home)
   - Alohida Cloudflare Tunneli va URL
   - Telegram Webhook: TELEGRAM_MARKET_BOT_TOKEN

3. Mahsulot #3: 3D Studio & Buyurtma Chop Etish
   - Port: 8003
   - Bosh sahifa (/): 3D Studio & Slicer (print_3d_studio_page)
   - Alohida Cloudflare Tunneli va URL
   - Telegram Webhook: TELEGRAM_STUDIO_BOT_TOKEN
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

os.makedirs(LOG_DIR, exist_ok=True)

# 3 Mahsulot konfiguratsiyasi
PRODUCTS = {
    "restaurant": {
        "name": "Restoran 3D/AR & NFC Menyu",
        "port": 8001,
        "product_env": "restaurant",
        "urlconf": "backend.urls_restaurant",
        "log_prefix": "restaurant",
        "bot_env_token": "TELEGRAM_RESTAURANT_BOT_TOKEN",
    },
    "market": {
        "name": "Online Store Guliston (Marketplace)",
        "port": 8002,
        "product_env": "market",
        "urlconf": "backend.urls_market",
        "log_prefix": "market",
        "bot_env_token": "TELEGRAM_MARKET_BOT_TOKEN",
    },
    "studio": {
        "name": "3D Studio & Buyurtma Chop Etish",
        "port": 8003,
        "product_env": "studio",
        "urlconf": "backend.urls_studio",
        "log_prefix": "studio",
        "bot_env_token": "TELEGRAM_STUDIO_BOT_TOKEN",
    },
}

running = True
gunicorn_procs = {}
cloudflared_procs = {}
tunnel_urls = {}
cf_log_fds = {}


def log(message: str, level: str = "INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [{level}] {message}"
    print(formatted, flush=True)
    try:
        with open(DAEMON_LOG, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def kill_ports():
    ports = ["8001", "8002", "8003", "8000"]
    for p in ports:
        try:
            subprocess.run(["fuser", "-k", f"{p}/tcp"], capture_output=True, timeout=5)
        except Exception:
            pass
    time.sleep(1)


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


def update_env_file_urls():
    if not ENV_FILE.exists():
        return

    try:
        content = ENV_FILE.read_text(encoding="utf-8")

        for key, pinfo in PRODUCTS.items():
            url = tunnel_urls.get(key)
            if not url:
                continue
            domain = url.replace("https://", "").replace("http://", "").strip("/")
            domain_key = f"PUBLIC_DOMAIN_{key.upper()}"
            url_key = f"SITE_URL_{key.upper()}"

            if f"{domain_key}=" in content:
                content = re.sub(rf"{domain_key}=[^\r\n]*", f"{domain_key}={domain}", content)
            else:
                content += f"\n{domain_key}={domain}\n"

            if f"{url_key}=" in content:
                content = re.sub(rf"{url_key}=[^\r\n]*", f"{url_key}={url}", content)
            else:
                content += f"\n{url_key}={url}\n"

        # Restoran URL ni asosiy fallback sifatida ham o'rnatish
        rest_url = tunnel_urls.get("restaurant")
        if rest_url:
            rest_domain = rest_url.replace("https://", "").replace("http://", "").strip("/")
            if "PUBLIC_DOMAIN=" in content:
                content = re.sub(r"PUBLIC_DOMAIN=[^\r\n]*", f"PUBLIC_DOMAIN={rest_domain}", content)
            else:
                content += f"\nPUBLIC_DOMAIN={rest_domain}\n"
            if "SITE_URL=" in content:
                content = re.sub(r"SITE_URL=[^\r\n]*", f"SITE_URL={rest_url}", content)
            else:
                content += f"\nSITE_URL={rest_url}\n"

        ENV_FILE.write_text(content, encoding="utf-8")
        log(".env muvaffaqiyatli barcha alohida URLlar bilan yangilandi.")
    except Exception as e:
        log(f".env ni yangilashda xatolik: {e}", "ERROR")


def save_status(status_str: str = "running"):
    prods_data = {}
    for key, info in PRODUCTS.items():
        gproc = gunicorn_procs.get(key)
        cproc = cloudflared_procs.get(key)
        prods_data[key] = {
            "name": info["name"],
            "port": info["port"],
            "local_url": f"http://127.0.0.1:{info['port']}/",
            "tunnel_url": tunnel_urls.get(key),
            "gunicorn_pid": gproc.pid if gproc and gproc.poll() is None else None,
            "cloudflared_pid": cproc.pid if cproc and cproc.poll() is None else None,
        }

    data = {
        "status": status_str,
        "daemon_pid": os.getpid(),
        "products": prods_data,
        "updated_at": datetime.now().isoformat(),
    }
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        log(f"Status saqlashda xato: {e}", "WARN")


def start_gunicorn_for_product(key: str):
    info = PRODUCTS[key]
    port = info["port"]
    log_name = info["log_prefix"]

    access_log = LOG_DIR / f"gunicorn_{log_name}_access.log"
    error_log = LOG_DIR / f"gunicorn_{log_name}_error.log"

    env_copy = os.environ.copy()
    env_copy["DJANGO_PRODUCT"] = info["product_env"]
    env_copy["DJANGO_ROOT_URLCONF"] = info["urlconf"]

    cmd = [
        str(VENV_GUNICORN),
        "backend.wsgi:application",
        "--bind", f"127.0.0.1:{port}",
        "--workers", "1",
        "--threads", "2",
        "--no-control-socket",
        "--reload",
        "--timeout", "60",
        "--capture-output",
        "--access-logfile", str(access_log),
        "--error-logfile", str(error_log),
    ]

    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        env=env_copy,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    gunicorn_procs[key] = proc
    log(f"✅ Gunicorn [{info['name']}] ishga tushdi (Port: {port}, PID={proc.pid})")
    return proc


def start_cloudflared_for_product(key: str):
    if not CLOUDFLARED_BIN.exists():
        log(f"cloudflared binar fayli topilmadi: {CLOUDFLARED_BIN}", "FATAL")
        return None

    info = PRODUCTS[key]
    port = info["port"]
    cf_log_path = LOG_DIR / f"cloudflared_{info['log_prefix']}.log"

    fd = open(cf_log_path, "w+", encoding="utf-8")
    cf_log_fds[key] = fd

    cmd = [
        str(CLOUDFLARED_BIN),
        "tunnel",
        "--url", f"http://127.0.0.1:{port}",
    ]

    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=fd,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    cloudflared_procs[key] = proc
    log(f"🌐 Cloudflared [{info['name']}] port {port} uchun ishga tushdi (PID={proc.pid})")
    return proc


def detect_tunnel_url(key: str, timeout: int = 25):
    proc = cloudflared_procs.get(key)
    if not proc:
        return None

    cf_log_path = LOG_DIR / f"cloudflared_{PRODUCTS[key]['log_prefix']}.log"
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    start_wait = time.time()
    tunnel_url = None

    while time.time() - start_wait < timeout:
        if proc.poll() is not None:
            log(f"Cloudflared [{key}] kutilmaganda to'xtadi!", "ERROR")
            break

        fd = cf_log_fds.get(key)
        if fd and not fd.closed:
            fd.flush()

        try:
            with open(cf_log_path, "r", encoding="utf-8") as f:
                content = f.read()
                match = url_pattern.search(content)
                if match:
                    tunnel_url = match.group(0)
                    log(f"🔗 Cloudflare URL [{key}]: {tunnel_url}", "SUCCESS")
                    break
        except Exception:
            pass

        time.sleep(0.5)

    if tunnel_url:
        tunnel_urls[key] = tunnel_url
    return tunnel_url


def sync_restaurant_webhook(url: str):
    """Restoran Telegram boti (@marketing_orign_bot) webhook va TMA menyusini o'rnatish"""
    log(f"Restoran Telegram webhook sozlanmoqda: {url}")
    try:
        subprocess.run(
            [str(VENV_PYTHON), "manage.py", "set_telegram_webhook", url],
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as e:
        log(f"Webhook o'rnatish ogohlantirishi: {e}", "WARN")


def shutdown(signum, frame):
    global running
    log(f"Signal qabul qilindi ({signum}), barcha mahsulot serverlari to'xtatilmoqda...")
    running = False

    for key, proc in list(gunicorn_procs.items()):
        if proc and proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                proc.terminate()

    for key, proc in list(cloudflared_procs.items()):
        if proc and proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except Exception:
                proc.terminate()

    for key, fd in list(cf_log_fds.items()):
        try:
            if fd and not fd.closed:
                fd.close()
        except Exception:
            pass

    kill_ports()
    save_status("stopped")

    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except Exception:
            pass

    log("Barcha 3 ta server to'liq to'xtatildi.")
    sys.exit(0)


def check_health():
    """Monitoring: agar biron server to'xtasa, avtomatik qayta tiklaydi"""
    for key, info in PRODUCTS.items():
        gproc = gunicorn_procs.get(key)
        if gproc is None or gproc.poll() is not None:
            log(f"⚠️ Gunicorn [{key}] to'xtagan! Qayta ishga tushirilmoqda...", "WARN")
            start_gunicorn_for_product(key)

        cproc = cloudflared_procs.get(key)
        if cproc is None or cproc.poll() is not None:
            log(f"⚠️ Cloudflared [{key}] to'xtagan! Qayta ishga tushirilmoqda...", "WARN")
            start_cloudflared_for_product(key)
            detect_tunnel_url(key, timeout=15)

    update_env_file_urls()
    save_status("running")


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGHUP, signal.SIG_IGN)

    kill_ports()
    load_env_into_process()

    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    log("=" * 65)
    log("🚀 Guliston 3 Ta Mustaqil Mahsulot Server Daemoni ishga tushmoqda")
    log(f"Daemon PID: {os.getpid()}")
    log("=" * 65)

    # 1. Barcha 3 ta Gunicorn instance'larini alohida portlarda boshlash
    for key in PRODUCTS:
        start_gunicorn_for_product(key)

    time.sleep(2)

    # 2. Barcha 3 ta Cloudflare Tunnellarini boshlash
    for key in PRODUCTS:
        start_cloudflared_for_product(key)

    # 3. Har bir tunnel URL'ini aniqlash
    for key in PRODUCTS:
        detect_tunnel_url(key, timeout=20)

    # 4. .env va status fayllarini yangilash
    update_env_file_urls()
    save_status("running")

    # 5. Restoran Telegram botini o'zining mustaqil URL'i bilan ulash
    rest_url = tunnel_urls.get("restaurant")
    if rest_url:
        sync_restaurant_webhook(rest_url)

    log("=" * 65)
    log("🎉 BARCHA 3 TA MUSTAQIL MAHSULOT ISHGA TUSHIRILDI!")
    for key, info in PRODUCTS.items():
        log(f"👉 [{info['name']}]: Port {info['port']} -> Local: http://127.0.0.1:{info['port']}/ | Public: {tunnel_urls.get(key, 'kutilmoqda')}")
    log("=" * 65)

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
