/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 * Removes non-authorable site chrome and leftover elements.
 * All selectors verified against migration-work/cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlay / mobile-nav toggles that can interfere with block parsing.
    // Verified in cleaned.html: <div id="toggleNav"> (line 568), <div id="mobileNav"> (line 574)
    WebImporter.DOMUtils.remove(element, ['#toggleNav', '#mobileNav']);

    // Tabbed FILTER (adventures listing only): the category tabs are a
    // client-side filter — every non-active panel is a duplicate subset of the
    // active ("All") panel that holds a card grid (.image-list). Remove those
    // duplicate panels + the tab nav so only the canonical grid survives.
    //
    // IMPORTANT: only do this when the tab panels are grid duplicates. Content
    // tabs (e.g. adventure-detail Overview/Itinerary/What-to-Bring) hold
    // DISTINCT prose per panel and must all be kept — detect that case and skip.
    const tabRoots = element.querySelectorAll('.cmp-tabs');
    tabRoots.forEach((tabRoot) => {
      const panels = tabRoot.querySelectorAll('.cmp-tabs__tabpanel');
      const isFilterGrid = [...panels].every((p) => p.querySelector('.image-list, .cmp-image-list'));
      if (isFilterGrid && panels.length > 1) {
        tabRoot.querySelectorAll('.cmp-tabs__tabpanel:not(.cmp-tabs__tabpanel--active)').forEach((el) => el.remove());
        const tablist = tabRoot.querySelector('.cmp-tabs__tablist, [role="tablist"]');
        if (tablist) tablist.remove();
      }
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome (experience fragments injected by the site shell).
    // Verified in cleaned.html:
    //   <header class="experiencefragment cmp-experiencefragment--header"> (line 5) — contains
    //     sign-in buttons, language navigation, main nav, and search.
    //   <footer class="experiencefragment cmp-experiencefragment--footer"> (line 471)
    //   <iframe id="destination_publishing_iframe_wkndsite_0"> (line 566) — Adobe ID syncing iframe
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'iframe',
      '#toggleNav',
      '#mobileNav',
      'meta',
      'link',
      'noscript',
    ]);
  }
}
