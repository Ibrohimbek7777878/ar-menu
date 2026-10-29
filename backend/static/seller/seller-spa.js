/* Yengil Soft-SPA router — oldin seller/base_seller.html oxiridagi inline <script> edi (mazmuni o'zgarmagan; endi `defer` bilan yuklanadi). */
(function() {
    const progressBar = document.getElementById('spa-progress');
    const mainContent = document.getElementById('main-content');
    const pageHeaderTitle = document.getElementById('page-header-title');
    const cache = new Map();

    function setProgress(percent, opacity = 1) {
        if (!progressBar) return;
        progressBar.style.opacity = opacity;
        progressBar.style.width = percent + '%';
    }

    function resetProgress() {
        if (!progressBar) return;
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.style.opacity = '0';
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 200);
        }, 150);
    }

    function updateActiveSidebar(targetUrl) {
        try {
            const urlObj = new URL(targetUrl, window.location.origin);
            const path = urlObj.pathname;
            document.querySelectorAll('.nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                const linkPath = new URL(href, window.location.origin).pathname;
                const isMatch = (linkPath === '/seller/' && path === '/seller/') ||
                                (linkPath !== '/seller/' && path.startsWith(linkPath));
                if (isMatch) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        } catch (e) {}
    }

    async function navigateTo(url, push = true) {
        if (!url || url.includes('/logout') || url.includes('/login')) {
            window.location.href = url;
            return;
        }

        try {
            setProgress(35);
            if (mainContent) mainContent.style.opacity = '0.55';

            let html = cache.get(url);
            if (!html) {
                const response = await fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                if (!response.ok) throw new Error('Status: ' + response.status);
                html = await response.text();
                if (cache.size > 20) cache.delete(cache.keys().next().value);
                cache.set(url, html);
            }
            setProgress(75);

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newMain = doc.getElementById('main-content');
            const newTitle = doc.querySelector('title');
            const newHeaderTitle = doc.getElementById('page-header-title');

            if (!newMain) {
                window.location.href = url;
                return;
            }

            if (newTitle) document.title = newTitle.innerText;
            if (pageHeaderTitle && newHeaderTitle) {
                pageHeaderTitle.innerHTML = newHeaderTitle.innerHTML;
            }

            mainContent.innerHTML = newMain.innerHTML;
            mainContent.style.opacity = '1';
            window.scrollTo({ top: 0, behavior: 'instant' });

            if (push) {
                history.pushState({ url }, '', url);
            }

            updateActiveSidebar(url);
            resetProgress();

            // Re-execute scripts embedded inside newly loaded content
            const scripts = mainContent.querySelectorAll('script');
            scripts.forEach(s => {
                const newScript = document.createElement('script');
                Array.from(s.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(s.innerHTML));
                s.parentNode.replaceChild(newScript, s);
            });

            document.dispatchEvent(new CustomEvent('seller:page:swapped', { detail: { url } }));

        } catch (err) {
            console.warn('Soft-SPA transition fallback:', err);
            window.location.href = url;
        }
    }

    // Intercept clicks on seller links
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        if (href.startsWith('#') || href.startsWith('javascript:') || link.hasAttribute('download') || link.getAttribute('target') === '_blank') {
            return;
        }

        try {
            const targetUrl = new URL(href, window.location.origin);
            if (targetUrl.origin === window.location.origin && targetUrl.pathname.startsWith('/seller/')) {
                if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                navigateTo(targetUrl.href);
            }
        } catch (err) {}
    });

    // Sub-30ms prefetch on hover
    document.addEventListener('mouseover', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || link.getAttribute('target') === '_blank') return;

        try {
            const targetUrl = new URL(href, window.location.origin);
            if (targetUrl.origin === window.location.origin && targetUrl.pathname.startsWith('/seller/')) {
                if (!cache.has(targetUrl.href)) {
                    fetch(targetUrl.href, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                        .then(r => r.text())
                        .then(html => cache.set(targetUrl.href, html))
                        .catch(() => {});
                }
            }
        } catch (err) {}
    });

    // Browser back / forward buttons
    window.addEventListener('popstate', function() {
        navigateTo(window.location.href, false);
    });
})();
