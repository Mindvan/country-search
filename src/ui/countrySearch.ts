import type { Country } from '../models/country.js';
import { createSearchController } from '../search/createSearchController.js';
import type { SearchState } from '../search/createSearchController.js';

const number = new Intl.NumberFormat('en-US');
const missing = 'Not available';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function facts(entries: Array<[string, string]>): HTMLDListElement {
  const list = element('dl', 'facts');
  for (const [label, value] of entries) {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    list.append(row);
  }
  return list;
}

export function mountCountrySearch(root: HTMLElement): () => void {
  const controller = createSearchController();
  const main = element('main', 'shell');
  const brand = element('header', 'brand', 'COUNTRY APP');
  const hero = element('section', 'hero');
  hero.append(
    element('p', 'eyebrow', 'SEARCHERS'),
    element('h1', '', 'Where would you like to be?'),
    element('p', 'intro', 'Find a country and discover its info'),
  );
  const label = element('label', 'search-label', 'Country name');
  label.htmlFor = 'country-query';
  const searchBox = element('div', 'search-box');
  const input = element('input');
  input.id = 'country-query';
  input.type = 'search';
  input.placeholder = 'Try Spain or France';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-describedby', 'search-hint');
  const hint = element(
    'p',
    'hint',
    'Enter a country name in English - results appear as you type',
  );
  hint.id = 'search-hint';
  searchBox.append(input);
  hero.append(label, searchBox, hint);
  const status = element('p', 'status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const retry = element('button', 'primary', 'Try again');
  retry.type = 'button';
  retry.hidden = true;
  retry.addEventListener('click', () => controller.retry());
  const results = element('section', 'results');
  results.setAttribute('aria-label', 'Search results');
  const dialog = element('dialog', 'details');
  dialog.setAttribute('aria-labelledby', 'detail-title');
  const close = element('button', 'close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close details');
  close.addEventListener('click', () => dialog.close());
  const detailBody = element('div');
  dialog.append(close, detailBody);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });

  function showDetails(country: Country): void {
    const title = element('h2', '', country.name);
    title.id = 'detail-title';
    const description = `${country.name}. Region: ${country.region || missing}. ${country.capital ? `Capital — ${country.capital}. ` : ''}Population — ${number.format(country.population)} people.`;
    detailBody.replaceChildren(
      title,
      element('p', 'description', description),
      facts([
        ['Capital', country.capital || missing],
        ['Region', country.region || missing],
        ['Population', number.format(country.population)],
        [
          'Area',
          country.area === undefined
            ? missing
            : `${number.format(country.area)} km²`,
        ],
        [
          'Borders (country codes)',
          country.borders
            ? country.borders.join(', ') || 'No land borders'
            : missing,
        ],
        ['Languages', country.languages.join(', ') || missing],
        [
          'Currency',
          country.currencies
            ?.map((currency) =>
              [currency.name, currency.code, currency.symbol]
                .filter(Boolean)
                .join(' - '),
            )
            .join(', ') || missing,
        ],
      ]),
    );
    dialog.showModal();
  }

  function render(state: SearchState): void {
    if (dialog.open) dialog.close();
    results.replaceChildren();
    results.setAttribute('aria-busy', String(state.status === 'loading'));
    retry.hidden = state.status !== 'error';
    status.className = `status ${state.status}`;
    const messages = {
      idle: input.value.trim()
        ? 'Preparing search...'
        : 'Your search starts with a country name.',
      loading: 'Searching for countries...',
      empty: 'No countries found, try anoher name',
      error:
        state.error === 'timeout'
          ? 'The request timed out, please try again'
          : state.error === 'http'
            ? 'The service is temporarily not available, please try again'
            : 'Unable to load contries, check your internet connection',
      success: `Countries found: ${state.countries.length}`,
    };
    status.textContent = messages[state.status];
    for (const country of state.countries) {
      const card = element('button', 'card');
      card.type = 'button';
      card.setAttribute('aria-label', `View details for ${country.name}`);
      const content = element('div', 'card-content');
      content.append(
        element('p', 'eyebrow', country.region || missing),
        element('h2', '', country.name),
        facts([
          ['Capital', country.capital || missing],
          ['Population', number.format(country.population)],
        ]),
      );
      card.append(content);
      card.addEventListener('click', () => showDetails(country));
      results.append(card);
    }
  }

  input.addEventListener('input', () => controller.setQuery(input.value));
  const footer = element(
    'footer',
    '',
    'COUNTRY APP - by Mindvan - RS School 2026 - Data taken from https://countries.dev',
  );
  main.append(brand, hero, status, retry, results, footer);
  root.append(main, dialog);
  const unsubscribe = controller.subscribe(render);
  return () => {
    unsubscribe();
    controller.dispose();
    dialog.close();
    dialog.remove();
    main.remove();
  };
}
