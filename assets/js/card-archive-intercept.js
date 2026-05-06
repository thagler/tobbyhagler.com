/*
 * Restricted archive intercept for printed business-card QR traffic.
 *
 * When a visitor arrives with the card campaign UTM markers, this script shows
 * a short in-universe transition and then replaces the current history entry
 * with /card.html while preserving the original query string for analytics.
 */
(function () {
	'use strict';

	var CONFIG = {
		cssHref: '/assets/css/card-archive-intercept.css',
		destinationPath: '/card.html',
		preludeDelay: 1500,
		interferenceDuration: 1200,
		routingDuration: 6500
	};

	if (!shouldIntercept()) {
		return;
	}

	var targetHref = buildTargetHref();
	var hasRedirected = false;
	var redirectTimer = null;
	var preludeTimer = null;
	var interferenceTimer = null;

	if (document.body) {
		showIntercept();
	} else {
		document.addEventListener('DOMContentLoaded', showIntercept, { once: true });
	}

	function shouldIntercept() {
		if (!window.location.search || isCardPage()) {
			return false;
		}

		if (typeof URLSearchParams === 'undefined') {
			return false;
		}

		var params = new URLSearchParams(window.location.search);

		return hasValue(params, 'utm_source', 'card-v1') ||
			hasValue(params, 'utm_campaign', 'card-prototype') ||
			hasValue(params, 'utm_id', 'card+v1', normalizeCardId);
	}

	function isCardPage() {
		var pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
		return pathname === '/card' || pathname === '/card.html';
	}

	function hasValue(params, key, expected, normalizer) {
		var values = params.getAll(key);
		var normalize = normalizer || normalizeExact;

		for (var i = 0; i < values.length; i++) {
			if (normalize(values[i]) === expected) {
				return true;
			}
		}

		return false;
	}

	function normalizeExact(value) {
		return String(value || '').trim();
	}

	function normalizeCardId(value) {
		// URLSearchParams decodes "+" as a space in query values.
		return String(value || '').trim().replace(/\s+/g, '+').toLowerCase();
	}

	function buildTargetHref() {
		var search = window.location.search;
		var hash = window.location.hash;

		if (window.location.protocol === 'file:') {
			return 'card.html' + search + hash;
		}

		var target = new URL(CONFIG.destinationPath, window.location.origin);
		target.search = search;
		target.hash = hash;
		return target.href;
	}

	function showIntercept() {
		if (document.getElementById('card-archive-intercept')) {
			return;
		}

		installCriticalStyles();
		loadStylesheet(CONFIG.cssHref);

		document.documentElement.classList.add('card-archive-intercept-lock');
		document.body.classList.add('card-archive-intercept-lock');
		var overlay = createOverlay();
		document.body.appendChild(overlay);

		preludeTimer = window.setTimeout(function () {
			startInterference(overlay);
		}, CONFIG.preludeDelay);
	}

	function createOverlay() {
		var overlay = document.createElement('div');
		overlay.id = 'card-archive-intercept';
		overlay.className = 'card-archive-intercept card-archive-intercept--prelude';
		overlay.setAttribute('role', 'status');
		overlay.setAttribute('aria-live', 'polite');
		overlay.setAttribute('aria-label', 'Archive signal pending.');
		overlay.style.setProperty('--card-archive-routing-duration', CONFIG.routingDuration + 'ms');

		overlay.innerHTML = [
			'<div class="card-archive-intercept__interference" aria-hidden="true"></div>',
			'<div class="card-archive-intercept__panel">',
			'  <div class="card-archive-intercept__system">ESS Demeter archival systems responding</div>',
			'  <div class="card-archive-intercept__title">SIGNAL INTERCEPT DETECTED</div>',
			'  <div class="card-archive-intercept__copy">',
			'    <p>Restricted archive request received.</p>',
			'    <p>Clearance: partial</p>',
			'  </div>',
			'  <button class="card-archive-intercept__cta" type="button">Open Restricted Archive</button>',
			'  <div class="card-archive-intercept__routing">Routing automatically...</div>',
			'  <div class="card-archive-intercept__trace" aria-hidden="true">',
			'    <span class="card-archive-intercept__trace-fill"></span>',
			'  </div>',
			'</div>'
		].join('');

		overlay.querySelector('.card-archive-intercept__cta').addEventListener('click', function () {
			clearPendingTimers();
			redirectToArchive();
		});

		return overlay;
	}

	function startInterference(overlay) {
		overlay.classList.remove('card-archive-intercept--prelude');
		overlay.classList.add('card-archive-intercept--interfering');
		overlay.setAttribute('aria-label', 'Static interference detected.');
		document.body.classList.add('card-archive-intercept-interfering');

		interferenceTimer = window.setTimeout(function () {
			resolveIntercept(overlay);
		}, CONFIG.interferenceDuration);
	}

	function resolveIntercept(overlay) {
		overlay.classList.remove('card-archive-intercept--interfering');
		overlay.classList.add('card-archive-intercept--resolved');
		overlay.setAttribute('aria-label', 'Signal intercept detected. Routing to restricted archive.');
		document.body.classList.remove('card-archive-intercept-interfering');
		document.body.classList.add('card-archive-intercept-active');
		startAutoRoute(overlay);
	}

	function startAutoRoute(overlay) {
		var traceFill = overlay.querySelector('.card-archive-intercept__trace-fill');
		var reduceMotion = window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		redirectTimer = window.setTimeout(redirectToArchive, CONFIG.routingDuration + 800);

		if (!traceFill || reduceMotion) {
			return;
		}

		traceFill.addEventListener('animationend', redirectToArchive, { once: true });
	}

	function redirectToArchive() {
		if (hasRedirected) {
			return;
		}

		hasRedirected = true;
		clearPendingTimers();
		window.location.replace(targetHref);
	}

	function clearPendingTimers() {
		if (preludeTimer) {
			window.clearTimeout(preludeTimer);
			preludeTimer = null;
		}

		if (interferenceTimer) {
			window.clearTimeout(interferenceTimer);
			interferenceTimer = null;
		}

		if (redirectTimer) {
			window.clearTimeout(redirectTimer);
			redirectTimer = null;
		}
	}

	function installCriticalStyles() {
		if (document.getElementById('card-archive-intercept-critical-css')) {
			return;
		}

		var style = document.createElement('style');
		style.id = 'card-archive-intercept-critical-css';
		style.textContent = [
			'#card-archive-intercept{position:fixed;inset:0;z-index:2147483647;',
			'display:grid;place-items:center;background:transparent;',
			'color:#dce8f3;opacity:1;pointer-events:none}',
			'#card-archive-intercept .card-archive-intercept__panel{opacity:0}',
			'#card-archive-intercept.card-archive-intercept--resolved{pointer-events:auto}',
			'#card-archive-intercept.card-archive-intercept--resolved .card-archive-intercept__panel{opacity:1}'
		].join('');

		document.head.appendChild(style);
	}

	function loadStylesheet(href) {
		if (document.querySelector('link[href="' + href + '"]')) {
			return;
		}

		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		document.head.appendChild(link);
	}
})();
