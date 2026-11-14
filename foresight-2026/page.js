(() => {
  const button = document.getElementById('copy-prompt');
  const prompt = document.getElementById('intro-prompt');
  const preview = document.getElementById('prompt-preview');
  const status = document.getElementById('copy-status');

  button.hidden = false;
  button.addEventListener('click', async () => {
    let copied = false;
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(prompt.value);
      copied = true;
      status.textContent = 'Copied. Paste it into your AI assistant.';
    } catch {
      preview.open = true;
      prompt.focus();
      prompt.select();
      status.textContent = 'Select and copy the prompt below.';
    } finally {
      button.disabled = false;
      if (copied) button.focus();
    }
  });
})();

(() => {
  const form = document.getElementById('project-signup');
  const email = document.getElementById('signup-email');
  const options = document.getElementById('signup-options');
  const status = document.getElementById('signup-status');
  const submit = form.querySelector('button[type="submit"]');
  let pending = false;
  const reveal = () => { options.hidden = !email.value.trim(); };
  form.hidden = false;
  document.getElementById('signup-fallback').hidden = true;
  email.addEventListener('input', reveal);
  email.addEventListener('change', reveal);
  window.addEventListener('pageshow', reveal);
  reveal();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(form);
    const topics = fields.getAll('topics');
    status.classList.remove('error');
    if (!topics.length) {
      options.hidden = false;
      status.textContent = 'Choose at least one project.';
      status.classList.add('error');
      form.querySelector('input[name="topics"]').focus();
      return;
    }
    pending = true;
    email.disabled = true;
    form.querySelector('fieldset').disabled = true;
    submit.disabled = true;
    submit.textContent = 'Saving…';
    status.textContent = '';
    try {
      const response = await fetch('https://charlie-project-updates.coral-okapi-4075.chatgpt.site/api/signup', {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'X-Signup-Source': 'foresight-2026' },
        body: JSON.stringify({ email: fields.get('email'), topics, website: fields.get('website') }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 400 && typeof data?.message === 'string') {
          status.textContent = data.message;
          status.classList.add('error');
          return;
        }
        throw new Error();
      }
      const data = await response.json();
      if (data?.ok !== true) throw new Error('We couldn’t save your signup. Please try again.');
      form.reset();
      options.hidden = true;
      status.textContent = 'You’re on the list. Thanks for your interest!';
    } catch {
      status.textContent = 'We couldn’t save your signup. Please try again.';
      status.classList.add('error');
      const link = document.createElement('a');
      link.href = 'https://charlie-project-updates.coral-okapi-4075.chatgpt.site';
      link.textContent = 'Open signup page';
      status.append(' ', link);
    } finally {
      pending = false;
      email.disabled = false;
      form.querySelector('fieldset').disabled = false;
      submit.disabled = false;
      submit.textContent = 'Keep me posted';
    }
  });
})();
