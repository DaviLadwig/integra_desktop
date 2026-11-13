(function () {
    const THEME_KEY = 'siaps_theme';

    function safeGetTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            return saved === 'dark' ? 'dark' : 'light';
        } catch (error) {
            return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        }
    }

    function saveTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (error) {}
    }

    function themeButtonMarkup(extraClass) {
        return `
            <button type="button" class="${extraClass}" data-theme-toggle aria-label="Ativar modo escuro">
                <svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2z"></path>
                </svg>
                <svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="3.5"></circle>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
                </svg>
                <span class="theme-toggle__text">Modo escuro</span>
            </button>`;
    }

    function updateThemeButtons() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const nextText = dark ? 'Modo claro' : 'Modo escuro';
        const nextLabel = dark ? 'Ativar modo claro' : 'Ativar modo escuro';

        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            const text = button.querySelector('.theme-toggle__text');

            if (text && text.textContent !== nextText) {
                text.textContent = nextText;
            }

            if (button.getAttribute('aria-label') !== nextLabel) {
                button.setAttribute('aria-label', nextLabel);
            }

            if (button.getAttribute('title') !== nextLabel) {
                button.setAttribute('title', nextLabel);
            }
        });
    }

    function setTheme(theme) {
        const next = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        saveTheme(next);
        updateThemeButtons();
    }

    function toggleTheme() {
        setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }

    function installThemeButtons() {
        const actions = document.querySelector('.app-header__actions');
        if (actions && !actions.querySelector('[data-theme-toggle]')) {
            const wrap = document.createElement('div');
            wrap.innerHTML = themeButtonMarkup('theme-toggle').trim();
            const button = wrap.firstElementChild;
            const exitButton = actions.querySelector('.btn-header-exit');
            if (exitButton) actions.insertBefore(button, exitButton);
            else actions.appendChild(button);
        }

        const login = document.getElementById('loginScreen');
        if (login && !login.querySelector('[data-theme-toggle]')) {
            const wrap = document.createElement('div');
            wrap.innerHTML = themeButtonMarkup('login-theme-toggle').trim();
            login.appendChild(wrap.firstElementChild);
        }

        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            if (button.dataset.themeBound === '1') return;
            button.dataset.themeBound = '1';
            button.addEventListener('click', toggleTheme);
        });
        updateThemeButtons();
    }

    function ensureTooltip() {
        let tooltip = document.getElementById('biTooltipV4');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'biTooltipV4';
            tooltip.className = 'bi-tooltip-v4';
            tooltip.setAttribute('role', 'status');
            tooltip.setAttribute('aria-live', 'polite');
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }

    function escapeText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function numberBR(value) {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n.toLocaleString('pt-BR') : String(value ?? '');
    }

    function buildTooltipFor(target) {
        if (!target) return '';

        const groupElement = target.closest('[data-bi-group]');
        if (groupElement && typeof BI_GROUPS !== 'undefined' && typeof getBIGroupStats === 'function' && typeof getBITeams === 'function') {
            const group = BI_GROUPS.find(item => item.key === groupElement.dataset.biGroup);
            if (group) {
                const stats = getBIGroupStats(getBITeams(), group);
                return `
                    <strong>${escapeText(stats.label)}</strong>
                    <span><b>${numberBR(stats.total)}</b> cadastrados</span>
                    <span><b>${numberBR(stats.accompanied)}</b> acompanhados</span>
                    <span><b>${numberBR(stats.pending)}</b> pendentes</span>
                    <b>${numberBR(stats.coverage)}% de cobertura</b>`;
            }
        }

        const criterionElement = target.closest('[data-child-criterion]');
        if (criterionElement) {
            const key = criterionElement.dataset.childCriterion;
            const details = window._siapsPortalDetails || {};
            const practice = Array.isArray(details.practices)
                ? details.practices.find(item => String(item.key) === String(key))
                : null;
            if (practice) {
                const done = Number(practice.done ?? practice.realized ?? practice.ok ?? 0);
                const total = Number(practice.total ?? details.total ?? 0);
                const pending = Math.max(total - done, 0);
                return `
                    <strong>Prática ${escapeText(practice.key)} · ${escapeText(practice.label || '')}</strong>
                    <span><b>${numberBR(done)}</b> realizados</span>
                    ${total ? `<span><b>${numberBR(pending)}</b> pendentes de ${numberBR(total)}</span>` : ''}
                    <b>${numberBR(practice.percentage)}% de cumprimento</b>`;
            }
        }

        const kpi = target.closest('.bi-kpi');
        if (kpi) {
            const label = kpi.querySelector('.bi-kpi__label')?.textContent?.trim() || 'Indicador';
            const value = kpi.querySelector('.bi-kpi__value-row strong, .bi-kpi > strong')?.textContent?.trim() || '';
            const note = kpi.querySelector('small')?.textContent?.trim() || '';
            return `<strong>${escapeText(label)}</strong><b>${escapeText(value)}</b>${note ? `<span>${escapeText(note)}</span>` : ''}`;
        }

        const ring = target.closest('.bi-ring');
        if (ring) {
            const value = ring.querySelector('strong')?.textContent?.trim() || '';
            const label = ring.querySelector('span')?.textContent?.trim() || 'Cobertura';
            const heading = ring.closest('.bi-panel, .bi-child-status-panel')?.querySelector('h2')?.textContent?.trim() || 'Cobertura';
            return `<strong>${escapeText(heading)}</strong><b>${escapeText(value)}</b><span>${escapeText(label)}</span>`;
        }

        const priority = target.closest('.bi-priority, .bi-child-priority');
        if (priority) {
            const title = priority.querySelector('.bi-priority__body strong, .bi-child-priority__body strong')?.textContent?.trim() || 'Prioridade';
            const description = priority.querySelector('.bi-priority__body > span, .bi-child-priority__body > span')?.textContent?.trim() || '';
            const rate = priority.querySelector('.bi-priority__rate, .bi-child-priority__value')?.textContent?.trim() || '';
            return `<strong>${escapeText(title)}</strong>${description ? `<span>${escapeText(description)}</span>` : ''}${rate ? `<b>${escapeText(rate)}</b>` : ''}`;
        }

        const teamRow = target.closest('.bi-team-table tbody tr[data-bi-team]');
        if (teamRow) {
            const cells = Array.from(teamRow.querySelectorAll('td')).map(cell => cell.textContent.replace(/\s+/g, ' ').trim());
            return `
                <strong>${escapeText(cells[0] || 'Equipe')}</strong>
                <span>Clique para filtrar o BI por esta equipe.</span>
                ${cells[1] ? `<b>Sem domicílio: ${escapeText(cells[1])}</b>` : ''}`;
        }

        return '';
    }

    function positionTooltip(event, target) {
        const tooltip = ensureTooltip();
        const margin = 14;
        const width = tooltip.offsetWidth || 250;
        const height = tooltip.offsetHeight || 130;
        let x;
        let y;

        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && (event.clientX || event.clientY)) {
            x = event.clientX + 16;
            y = event.clientY + 16;
        } else {
            const rect = target.getBoundingClientRect();
            x = rect.right + 12;
            y = rect.top;
        }

        if (x + width + margin > window.innerWidth) x = Math.max(margin, x - width - 32);
        if (y + height + margin > window.innerHeight) y = Math.max(margin, window.innerHeight - height - margin);

        tooltip.style.left = `${Math.max(margin, x)}px`;
        tooltip.style.top = `${Math.max(margin, y)}px`;
    }

    function showTooltip(target, event) {
        const content = buildTooltipFor(target);
        if (!content) return;
        const tooltip = ensureTooltip();
        tooltip.innerHTML = content;
        tooltip.classList.add('is-visible');
        positionTooltip(event, target);
    }

    function hideTooltip() {
        const tooltip = document.getElementById('biTooltipV4');
        if (tooltip) tooltip.classList.remove('is-visible');
    }

    function interactiveTarget(node) {
        return node?.closest?.('[data-bi-group], [data-child-criterion], .bi-kpi, .bi-ring, .bi-priority, .bi-child-priority, .bi-team-table tbody tr[data-bi-team]') || null;
    }

    function installTooltipDelegation() {
        if (document.documentElement.dataset.biV4TooltipBound === '1') return;
        document.documentElement.dataset.biV4TooltipBound = '1';

        document.addEventListener('mouseover', event => {
            const target = interactiveTarget(event.target);
            if (!target || !target.closest('#biContent')) return;
            const previous = interactiveTarget(event.relatedTarget);
            if (previous === target) return;
            showTooltip(target, event);
        });

        document.addEventListener('mousemove', event => {
            const target = interactiveTarget(event.target);
            const tooltip = document.getElementById('biTooltipV4');
            if (!target || !tooltip?.classList.contains('is-visible')) return;
            positionTooltip(event, target);
        });

        document.addEventListener('mouseout', event => {
            const target = interactiveTarget(event.target);
            if (!target) return;
            const next = interactiveTarget(event.relatedTarget);
            if (next === target) return;
            hideTooltip();
        });

        document.addEventListener('focusin', event => {
            const target = interactiveTarget(event.target);
            if (target && target.closest('#biContent')) showTooltip(target, null);
        });

        document.addEventListener('focusout', event => {
            if (interactiveTarget(event.target)) hideTooltip();
        });
    }

    function init() {
        setTheme(safeGetTheme());
        installThemeButtons();
        installTooltipDelegation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
