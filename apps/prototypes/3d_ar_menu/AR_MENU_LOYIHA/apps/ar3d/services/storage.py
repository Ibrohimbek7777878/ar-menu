import hashlib
import logging
import mimetypes
import os

from django.conf import settings

log = logging.getLogger('ar3d.storage')

CONTENT_TYPES = {
    '.glb': 'model/gltf-binary',
    '.usdz': 'model/vnd.usdz+zip',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
}
CACHE_CONTROL = 'public, max-age=31536000, immutable'


def _use_s3() -> bool:
    return bool(getattr(settings, 'AWS_STORAGE_BUCKET_NAME', ''))


def _hashed_name(local_path: str, prefix: str, dish_id: int) -> str:
    h = hashlib.sha1()
    with open(local_path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    ext = os.path.splitext(local_path)[1].lower()
    return f'{prefix}/{dish_id}_{h.hexdigest()[:12]}{ext}'


def upload(local_path: str, prefix: str, dish_id: int, job=None) -> str:
    if job:
        try:
            job.set_stage('upload', progress=88)
        except Exception:
            pass
    if not os.path.exists(local_path):
        raise FileNotFoundError(local_path)
    key = _hashed_name(local_path, prefix, dish_id)
    ext = os.path.splitext(local_path)[1].lower()
    ctype = CONTENT_TYPES.get(ext) or mimetypes.guess_type(local_path)[0] or 'application/octet-stream'
    if _use_s3():
        url = _upload_s3(local_path, key, ctype)
    else:
        url = _upload_local(local_path, key)
    try:
        size_kb = os.path.getsize(local_path) // 1024
    except Exception:
        size_kb = 0
    log.info(f'[cdn] ✅ {key} ({size_kb} KB) → {url}')
    return url


def _upload_s3(local_path, key, ctype):
    import boto3
    s3 = boto3.client(
        's3',
        endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
        aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
        aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
    )
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    with open(local_path, 'rb') as f:
        s3.put_object(Bucket=bucket, Key=key, Body=f, ContentType=ctype, CacheControl=CACHE_CONTROL, ACL='public-read')
    cdn = getattr(settings, 'CDN_BASE_URL', '').rstrip('/')
    if cdn:
        return f'{cdn}/{key}'
    ep = getattr(settings, 'AWS_S3_ENDPOINT_URL', '').rstrip('/')
    return f'{ep}/{bucket}/{key}' if ep else f'https://{bucket}.s3.amazonaws.com/{key}'


def _upload_local(local_path, key):
    dest = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(local_path, 'rb') as src, open(dest, 'wb') as dst:
        dst.write(src.read())
    base = getattr(settings, 'PUBLIC_BASE_URL', getattr(settings, 'PUBLIC_DOMAIN', '')).rstrip('/')
    if base and not base.startswith('http'):
        base = 'https://' + base if base else ''
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    if base:
        return f'{base}{media_url}{key}'
    return f'{media_url}{key}'


def delete(url: str):
    if not url:
        return
    try:
        if _use_s3():
            import boto3
            cdn = getattr(settings, 'CDN_BASE_URL', '').rstrip('/')
            key = url.replace(cdn + '/', '') if cdn and url.startswith(cdn) else None
            if key:
                boto3.client('s3', endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
                             aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                             aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)).delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        else:
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            p = url.split(media_url)[-1] if media_url in url else url.split('/')[-1]
            fp = os.path.join(settings.MEDIA_ROOT, p)
            # Prevent path traversal
            if fp.startswith(os.path.join(settings.MEDIA_ROOT, '')) and os.path.exists(fp):
                os.unlink(fp)
    except Exception as e:
        log.warning(f'[cdn] o\'chirilmadi {url}: {e}')
