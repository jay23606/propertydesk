/* PropertyDesk: theme preferences and workspace page navigation. */
(() => {
  'use strict';

  function create({
    $, state, renderWorkspaceSettings, closeModal,
    documentRef = document, windowRef = window, storage,
  }) {
    function setTheme(theme, persist = false) {
      const next = theme === 'light' ? 'light' : 'dark';
      documentRef.documentElement.dataset.theme = next;
      const themeColor = next === 'dark' ? '#151b17' : '#f6f7f4';
      documentRef
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', themeColor);
      if (persist) {
        try {
          (storage || windowRef.localStorage).setItem('propertydesk-theme', next);
        } catch {
          // Keep the active theme for this page when storage is unavailable.
        }
      }

      documentRef.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        const action = next === 'dark' ? 'light' : 'dark';
        button.setAttribute('aria-label', `Switch to ${action} mode`);
        button.setAttribute('aria-pressed', String(next === 'dark'));
        const label = button.querySelector('.theme-label');
        if (label) {
          label.textContent = `${action[0].toUpperCase()}${action.slice(1)} mode`;
        }
        const icon = button.querySelector('.theme-icon');
        if (icon) icon.textContent = next === 'dark' ? '☼' : '☾';
      });
    }

    function syncThemeButtons() {
      setTheme(documentRef.documentElement.dataset.theme);
    }

    function navigate(view) {
      state.view = view;
      documentRef.querySelectorAll('.page').forEach((page) => {
        page.classList.toggle('active', page.id === 'page-' + view);
      });
      documentRef.querySelectorAll('.nav-link').forEach((link) => {
        link.classList.toggle('active', link.dataset.view === view);
      });
      $('page-crumb').textContent =
        view.charAt(0).toUpperCase() + view.slice(1);
      windowRef.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function attachEvents() {
      documentRef.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () =>
          setTheme(
            documentRef.documentElement.dataset.theme === 'dark'
              ? 'light'
              : 'dark',
            true,
          ),
        );
      });
      syncThemeButtons();

      documentRef.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
          if (link.dataset.view === 'workspace') renderWorkspaceSettings();
          navigate(link.dataset.view);
        });
      });
      $('user-menu').addEventListener('click', () => {
        renderWorkspaceSettings();
        navigate('workspace');
      });
      documentRef.querySelectorAll('[data-goto]').forEach((link) => {
        link.addEventListener('click', () => navigate(link.dataset.goto));
      });
      documentRef.querySelectorAll('[data-close]').forEach((button) => {
        button.addEventListener('click', () =>
          closeModal(button.closest('.modal')),
        );
      });
    }

    return { setTheme, syncThemeButtons, navigate, attachEvents };
  }

  window.PropertyDeskNavigation = { create };
})();
