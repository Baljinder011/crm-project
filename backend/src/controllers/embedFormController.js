const { asyncHandler } = require('../utils/asyncHandler');
const {
  createEmbedForm,
  listEmbedForms,
  getEmbedFormById,
  getEmbedFormByPublicKey,
} = require('../models/embedFormModel');
const { captureEmbeddedLead } = require('../services/embedCaptureService');

function buildScript({ apiBaseUrl, publicKey }) {
  return `
(function () {
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var crmKey = currentScript && currentScript.getAttribute('data-crm-key')
    ? currentScript.getAttribute('data-crm-key')
    : '${publicKey}';

  var formSelector = currentScript && currentScript.getAttribute('data-form-selector')
    ? currentScript.getAttribute('data-form-selector')
    : 'form';

  var endpoint = '${apiBaseUrl}/api/embed/forms/' + crmKey + '/submit';

  var continueSubmit = String(
    (currentScript && currentScript.getAttribute('data-continue-submit')) || 'false'
  ).toLowerCase() === 'true';

  var resetOnSuccess = String(
    (currentScript && currentScript.getAttribute('data-reset-on-success')) || 'true'
  ).toLowerCase() === 'true';

  var showAlert = String(
    (currentScript && currentScript.getAttribute('data-show-alert')) || 'false'
  ).toLowerCase() === 'true';

  var successRedirect = currentScript && currentScript.getAttribute('data-success-redirect')
    ? currentScript.getAttribute('data-success-redirect')
    : '';

  function safeLower(value) {
    return String(value || '').trim().toLowerCase();
  }

  function formToObject(form) {
    var fd = new FormData(form);
    var payload = {};

    fd.forEach(function (value, key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (!Array.isArray(payload[key])) payload[key] = [payload[key]];
        payload[key].push(value);
      } else {
        payload[key] = value;
      }
    });

    var allInputs = form.querySelectorAll('input, textarea, select');
    allInputs.forEach(function (el) {
      var name = el.name || el.id;
      if (!name) return;

      var type = safeLower(el.type);

      if (type === 'checkbox') {
        if (!Object.prototype.hasOwnProperty.call(payload, name)) {
          payload[name] = !!el.checked;
        }
      }

      if (type === 'radio') {
        if (!Object.prototype.hasOwnProperty.call(payload, name)) {
          var checked = form.querySelector('input[name="' + name + '"]:checked');
          payload[name] = checked ? checked.value : '';
        }
      }
    });

    return payload;
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search || '');
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      fbclid: params.get('fbclid') || ''
    };
  }

  function buildPayload(form) {
    var raw = formToObject(form);
    var payload = {};

    Object.keys(raw).forEach(function (key) {
      payload[key] = raw[key];
    });

    payload.pageUrl = window.location.href;
    payload.pagePath = window.location.pathname || '';
    payload.pageTitle = document.title || '';
    payload.referrer = document.referrer || '';
    payload.userAgent = navigator.userAgent || '';
    payload.submittedAt = new Date().toISOString();
    payload.crmFormSelector = formSelector;
    payload.crmKey = crmKey;
    payload.cookies = {
      hubspotutk: getCookie('hubspotutk') || '',
      _ga: getCookie('_ga') || '',
      _fbp: getCookie('_fbp') || ''
    };
    payload.utm = getUtmParams();

    return payload;
  }

  function dispatchEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
    } catch (err) {
      console.warn('CRM custom event error:', err);
    }
  }

  function setLoadingState(form, loading) {
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = !!loading;
      if (!submitBtn.dataset.originalText) {
        submitBtn.dataset.originalText = submitBtn.innerText || submitBtn.value || 'Submit';
      }

      if (loading) {
        if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Submitting...';
        else submitBtn.innerText = 'Submitting...';
      } else {
        if (submitBtn.tagName === 'INPUT') submitBtn.value = submitBtn.dataset.originalText;
        else submitBtn.innerText = submitBtn.dataset.originalText;
      }
    }
  }

  async function submitToCrm(form) {
    var payload = buildPayload(form);

    var res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CRM-Origin': window.location.hostname || window.location.host || '',
      },
      body: JSON.stringify(payload)
    });

    var data = {};
    try {
      data = await res.json();
    } catch (err) {
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.message || 'Submission failed');
    }

    return data;
  }

  function continueNativeSubmit(form) {
    try {
      if (typeof form.requestSubmit === 'function') {
        form.__crmSkipOnce = true;
        form.requestSubmit();
        return;
      }

      form.__crmSkipOnce = true;
      HTMLFormElement.prototype.submit.call(form);
    } catch (err) {
      console.error('CRM continue submit failed:', err);
    }
  }

  function attach(form) {
    if (!form || form.__crmBound) return;
    form.__crmBound = true;

    form.addEventListener('submit', async function (e) {
      if (form.__crmSkipOnce) {
        form.__crmSkipOnce = false;
        return;
      }

      e.preventDefault();
      setLoadingState(form, true);

      dispatchEvent('crm:submit:start', {
        form: form,
        selector: formSelector,
        publicKey: crmKey
      });

      try {
        var data = await submitToCrm(form);

        dispatchEvent('crm:submit:success', {
          form: form,
          selector: formSelector,
          publicKey: crmKey,
          response: data
        });

        if (showAlert && data.message) {
          alert(data.message);
        }

        if (resetOnSuccess) {
          form.reset();
        }

        if (successRedirect) {
          window.location.href = successRedirect;
          return;
        }

        if (continueSubmit) {
          continueNativeSubmit(form);
          return;
        }
      } catch (err) {
        console.error('CRM embed submit failed:', err);

        dispatchEvent('crm:submit:error', {
          form: form,
          selector: formSelector,
          publicKey: crmKey,
          error: err.message || 'Submission failed'
        });

        if (showAlert) {
          alert(err.message || 'Submission failed');
        }
      } finally {
        setLoadingState(form, false);
      }
    });
  }

  function init() {
    try {
      var forms = document.querySelectorAll(formSelector);
      if (!forms || !forms.length) {
        console.warn('CRM embed: no form found for selector:', formSelector);
        return;
      }

      forms.forEach(function (form) {
        attach(form);
      });
    } catch (err) {
      console.error('CRM embed init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();
}

exports.createForm = asyncHandler(async (req, res) => {
  const form = await createEmbedForm({
    name: req.body.name,
    userId: req.user?.id || null,
    notifyEmail: req.body.notifyEmail,
    allowedDomains: req.body.allowedDomains || [],
    fieldMapping: req.body.fieldMapping || {},
    successMessage: req.body.successMessage,
  });

  const apiBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  res.status(201).json({
    success: true,
    form,
    snippet: `<script src="${apiBaseUrl}/api/embed/forms/${form.public_key}/script.js" data-form-selector="#contactForm" data-crm-key="${form.public_key}" data-continue-submit="false" data-reset-on-success="true" data-show-alert="false" defer></script>`,
  });
});

exports.listForms = asyncHandler(async (req, res) => {
  const forms = await listEmbedForms(req.user?.id || null);
  res.status(200).json({ success: true, forms });
});

exports.getScript = asyncHandler(async (req, res) => {
  const publicKey = req.params.publicKey;
  const form = await getEmbedFormByPublicKey(publicKey);

  if (!form || !form.is_active) {
    return res
      .status(404)
      .type('application/javascript')
      .send(`console.error("Invalid CRM script key");`);
  }

  const apiBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const script = buildScript({ apiBaseUrl, publicKey });

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.status(200).send(script);
});

exports.submitFromScript = asyncHandler(async (req, res) => {
  const result = await captureEmbeddedLead({
    publicKey: req.params.publicKey,
    body: req.body,
    originDomain: req.get('X-CRM-Origin') || req.get('origin') || '',
  });

  res.status(201).json(result);
});

exports.getSnippet = asyncHandler(async (req, res) => {
  const form = await getEmbedFormById(Number(req.params.id));

  if (!form) {
    const error = new Error('Form not found.');
    error.statusCode = 404;
    throw error;
  }

  const apiBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    success: true,
    snippet: `<script src="${apiBaseUrl}/api/embed/forms/${form.public_key}/script.js" data-form-selector="#contactForm" data-crm-key="${form.public_key}" data-continue-submit="false" data-reset-on-success="true" data-show-alert="false" defer></script>`,
  });
});